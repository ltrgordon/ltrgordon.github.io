(() => {
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Dynamic canvas sizing for mobile
function resizeCanvas() {
  const isMobile = window.innerWidth <= 1023;
  const dpr = window.devicePixelRatio || 1;
  
  if (isMobile) {
    // On mobile, use full viewport
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    ctx.scale(dpr, dpr);
  } else {
    // On desktop, use fixed size
    const displayWidth = 960;
    const displayHeight = 640;
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    ctx.scale(dpr, dpr);
  }
}

// Initial resize and listen for orientation changes
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 100);
});

const overlay = document.getElementById('overlay');
const menuPanel = document.getElementById('menu');
const helpPanel = document.getElementById('help');
const pausedPanel = document.getElementById('paused');
const gameoverPanel = document.getElementById('gameover');
const winnerEl = document.getElementById('winner');

const keys = {};
let state = 'menu'; // 'menu', 'running', 'paused', 'gameover'
let aiDifficulty = 'normal';

// Load config from localStorage
const stored = JSON.parse(localStorage.getItem('beamerConfig') || '{}');
const cfg = {
  width: 960, // Use fixed logical width
  height: 640, // Use fixed logical height
  winScore: stored.winScore || 7,
  ballSpeed: stored.ballSpeed || 380,
  paddleSpeed: 460,
  lensStrength: 0.5,
  lensCurvature: stored.lensCurvature || 0.0125,
  lensMaterial: stored.lensMaterial || 'glass',
  beamWavelength: stored.beamWavelength || 632.8,
  beamDiameter: stored.beamDiameter || 1.0,
  powerupsFrequency: stored.powerupsFrequency || 'moderate',
  leftPaddleHandicap: stored.leftPaddleHandicap || 'standard',
  rightPaddleHandicap: stored.rightPaddleHandicap || 'standard',
  theme: {bg:'#0b1221', fg:'#e5e7eb', accent:'#06b6d4', accent2:'#22c55e', danger:'#ef4444'}
};

function saveConfig(){
  localStorage.setItem('beamerConfig', JSON.stringify({
    winScore: cfg.winScore,
    ballSpeed: cfg.ballSpeed,
    lensCurvature: cfg.lensCurvature,
    lensMaterial: cfg.lensMaterial,
    beamWavelength: cfg.beamWavelength,
    beamDiameter: cfg.beamDiameter,
    powerupsFrequency: cfg.powerupsFrequency,
    leftPaddleHandicap: cfg.leftPaddleHandicap,
    rightPaddleHandicap: cfg.rightPaddleHandicap
  }));
}

// Lens material properties
function getLensRefractiveIndex(material) {
  const indices = {
    'glass': 1.7,
    'silicon': 2.5,
    'germanium': 4.0
  };
  return indices[material] || 1.7;
}

function getLensMaterialDisplayName(material) {
  const names = {
    'glass': 'Glass (n=1.7)',
    'silicon': 'Silicon (n=2.5)',
    'germanium': 'Germanium (n=4.0)'
  };
  return names[material] || 'Glass (n=1.7)';
}

// Handicap system
function getHandicapHeight(handicap) {
  const baseHeight = 96;
  const heights = {
    'small': Math.floor(baseHeight * 0.7),
    'standard': baseHeight,
    'large': Math.floor(baseHeight * 1.3),
    'extra_large': Math.floor(baseHeight * 1.6)
  };
  return heights[handicap] || baseHeight;
}

function getHandicapDisplayName(handicap) {
  const names = {
    'small': 'Small',
    'standard': 'Standard',
    'large': 'Large',
    'extra_large': 'Extra Large'
  };
  return names[handicap] || 'Standard';
}

// Audio
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playBeep(freq, dur){
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type='sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {
    console.log('Audio error:', e);
  }
}

class Paddle{
  constructor(x,name){
    this.x=x;
    this.y=cfg.height/2-48;
    this.width=16;
    this.baseHeight=getHandicapHeight(name === 'Left' ? cfg.leftPaddleHandicap : cfg.rightPaddleHandicap);
    this.height=this.baseHeight;
    this.speed=cfg.paddleSpeed;
    this.vy=0;
    this.score=0;
    this.name=name;
    this.ai=false;
  }
  update(dt){
    if(this.ai){
      const diff = ball.y - (this.y + this.height/2);
      const speedFactor = {easy:0.4,normal:0.6,hard:0.85,insane:1.2}[aiDifficulty];
      this.vy = Math.sign(diff) * this.speed * speedFactor;
    }
    this.y += this.vy*dt;
    if(this.y<0) this.y=0;
    if(this.y+this.height>cfg.height) this.y=cfg.height-this.height;
  }
  move(dir){ this.vy = dir*this.speed; }
  stop(){ if(!this.ai) this.vy=0; }
  resetToHandicap() {
    this.baseHeight = getHandicapHeight(this.name === 'Left' ? cfg.leftPaddleHandicap : cfg.rightPaddleHandicap);
    this.height = this.baseHeight;
  }
}

class Ball{
  constructor(){
    this.r=10;
    this.reset();
  }
  reset(){
    this.x=cfg.width/2; this.y=cfg.height/2;
    const angle=(Math.random()*0.7-0.35)*Math.PI;
    const dir=Math.random()<0.5?-1:1;
    this.speed=cfg.ballSpeed;
    this.vx=Math.cos(angle)*this.speed*dir;
    this.vy=Math.sin(angle)*this.speed;
    this.baseSpeed=this.speed;
    this.roundTime=0;
    this.lastHit=null;
    this.prevX = this.x;
    this.prevY = this.y;
    this.wasInLens = false;
    this.isInLens = false;
  }
  update(dt){
    this.roundTime += dt;
    const speedMult = Math.min(2, 1 + 0.1*this.roundTime);
    this.speed = this.baseSpeed * speedMult;
    const mag = Math.hypot(this.vx,this.vy);
    this.vx = (this.vx/mag)*this.speed;
    this.vy = (this.vy/mag)*this.speed;

    // Store previous position for intersection detection
    this.prevX = this.x;
    this.prevY = this.y;
    this.wasInLens = this.isInLens;

    // Update position
    this.x += this.vx*dt;
    this.y += this.vy*dt;

    // Check lens interaction with advanced refraction
    this.isInLens = lens.contains(this.x, this.y);
    
    // Handle lens entry/exit with proper refraction
    if (this.wasInLens !== this.isInLens) {
      this.handleLensTransition();
    }
  }
  
  handleLensTransition() {
    const intersection = this.findLensIntersection(!this.wasInLens);
    if (intersection) {
      this.refractAtIntersection(intersection, !this.wasInLens);
    }
  }
  
  findLensIntersection(entering) {
    // Binary search to find intersection point
    let x1 = this.prevX, y1 = this.prevY;
    let x2 = this.x, y2 = this.y;
    
    for (let i = 0; i < 10; i++) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const midInLens = lens.contains(midX, midY);
      
      if (entering) {
        if (midInLens) {
          x2 = midX; y2 = midY;
        } else {
          x1 = midX; y1 = midY;
        }
      } else {
        if (midInLens) {
          x1 = midX; y1 = midY;
        } else {
          x2 = midX; y2 = midY;
        }
      }
    }
    
    const intersectionX = (x1 + x2) / 2;
    const intersectionY = (y1 + y2) / 2;
    const [normalX, normalY] = lens.getNormalAtPoint(intersectionX, intersectionY);
    
    return {x: intersectionX, y: intersectionY, nx: normalX, ny: normalY};
  }
  
  refractAtIntersection(intersection, entering) {
    const n1 = entering ? 1.0 : getLensRefractiveIndex(cfg.lensMaterial);
    const n2 = entering ? getLensRefractiveIndex(cfg.lensMaterial) : 1.0;
    
    const speed = Math.hypot(this.vx, this.vy);
    if (speed === 0) return;
    
    const incidentX = this.vx / speed;
    const incidentY = this.vy / speed;
    
    let normalX = intersection.nx;
    let normalY = intersection.ny;
    
    // Adjust normal direction for proper refraction
    if (entering) {
      normalX = -normalX;
      normalY = -normalY;
    }
    
    // Calculate angle of incidence
    let cosTheta1 = -(incidentX * normalX + incidentY * normalY);
    
    if (cosTheta1 < 0) {
      normalX = -normalX;
      normalY = -normalY;
      cosTheta1 = -cosTheta1;
    }
    
    cosTheta1 = Math.max(0.0, Math.min(1.0, cosTheta1));
    const sinTheta1 = Math.sqrt(1.0 - cosTheta1 * cosTheta1);
    
    // Apply Snell's law
    const sinTheta2 = (n1 / n2) * sinTheta1;
    
    // Check for total internal reflection
    if (sinTheta2 > 1.0 && n1 > n2) {
      // Total internal reflection
      const dotProduct = incidentX * normalX + incidentY * normalY;
      const reflectedX = incidentX - 2.0 * dotProduct * normalX;
      const reflectedY = incidentY - 2.0 * dotProduct * normalY;
      
      this.vx = speed * reflectedX;
      this.vy = speed * reflectedY;
      playBeep(800, 0.05);
    } else {
      // Normal refraction
      const clampedSinTheta2 = Math.min(1.0, sinTheta2);
      const cosTheta2 = Math.sqrt(1.0 - clampedSinTheta2 * clampedSinTheta2);
      
      const ratio = n1 / n2;
      const c = ratio * cosTheta1 - cosTheta2;
      
      const refractedX = ratio * incidentX + c * normalX;
      const refractedY = ratio * incidentY + c * normalY;
      
      const refractedLength = Math.hypot(refractedX, refractedY);
      if (refractedLength > 0) {
        this.vx = speed * (refractedX / refractedLength);
        this.vy = speed * (refractedY / refractedLength);
      }
      
      playBeep(700, 0.05);
    }
  }
  
  reflectVertical(){ this.vy=-this.vy; }
  reflectHorizontal(){ this.vx=-this.vx; }
  speedUp(f){ this.vx*=f; this.vy*=f; this.speed*=f; this.baseSpeed*=f; }
  resetRoundTime(){ this.roundTime=0; this.baseSpeed=this.speed; }
}

class Lens{
  constructor(){
    this.curvature=cfg.lensCurvature;
    this.rx=1/this.curvature;
    this.ry=cfg.height/2;
    this.x=cfg.width/2;
    this.y=cfg.height/2;
    this.material = cfg.lensMaterial;
  }
  updateRadius(){ this.rx=1/this.curvature; }
  contains(px,py){
    const dx=(px-this.x)/this.rx;
    const dy=(py-this.y)/this.ry;
    return dx*dx+dy*dy<=1;
  }
  getNormalAtPoint(px, py) {
    // For ellipse (x-h)²/a² + (y-k)²/b² = 1
    // Normal at point (px, py) is proportional to: (2(px-h)/a², 2(py-k)/b²)
    const dx = (px - this.x) / (this.rx * this.rx);
    const dy = (py - this.y) / (this.ry * this.ry);
    
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      return [dx / length, dy / length];
    }
    return [1.0, 0.0];
  }
}

class PowerUp{
  constructor(kind){
    this.kind=kind;
    this.size=30; // Increased from 20 to 30
    this.vx = 0;
    this.vy = 60; // Slower fall speed
    this.ttl = 15.0; // Time to live in seconds
    do{
      this.x=Math.random()*(cfg.width-60)+30;
      this.y=Math.random()*(cfg.height-60)+30;
    }while(lens.contains(this.x,this.y));
    this.active=true;
  }
  
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.y > cfg.height + this.size || this.ttl <= 0) {
      this.active = false;
    }
  }
  
  bounds(){return [this.x-this.size/2,this.y-this.size/2,this.x+this.size/2,this.y+this.size/2];}
  draw(ctx){
    const colors={PADDLE_EXPAND:cfg.theme.accent2,PADDLE_SHRINK_OPP:cfg.theme.danger,BALL_SLOW:'#60a5fa',BALL_FAST:'#f59e0b'};
    ctx.fillStyle=colors[this.kind]||cfg.theme.accent;
    ctx.fillRect(this.x-this.size/2,this.y-this.size/2,this.size,this.size);
    ctx.fillStyle='#0b0f1a';
    ctx.font='bold 10px sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(this.kind.split('_')[0],this.x,this.y);
  }
}

// Animation system
class Animation {
  constructor(duration) {
    this.duration = duration;
    this.elapsed = 0;
    this.active = true;
  }
  
  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.active = false;
    }
  }
  
  getProgress() {
    return Math.min(1.0, this.elapsed / this.duration);
  }
}

class PowerUpCollectedAnimation extends Animation {
  constructor(x, y, powerupKind, duration = 0.8) {
    super(duration);
    this.x = x;
    this.y = y;
    this.powerupKind = powerupKind;
    
    this.text = {
      'PADDLE_EXPAND': 'EXPAND!',
      'PADDLE_SHRINK_OPP': 'SHRINK!',
      'BALL_SLOW': 'SLOW!',
      'BALL_FAST': 'SPEED!'
    }[powerupKind] || 'POWER!';
    
    this.color = {
      'PADDLE_EXPAND': '#00ff00',
      'PADDLE_SHRINK_OPP': '#ff3030',
      'BALL_SLOW': '#60a5fa',
      'BALL_FAST': '#f59e0b'
    }[powerupKind] || '#ffffff';
  }
  
  draw(ctx) {
    if (!this.active) return;
    
    const progress = this.getProgress();
    const alpha = 1.0 - progress;
    
    const textY = this.y - 30 * progress;
    const textSize = Math.floor(16 * (1.0 + 0.5 * (1.0 - progress)));
    
    // Parse color for alpha blending
    const r = parseInt(this.color.slice(1, 3), 16);
    const g = parseInt(this.color.slice(3, 5), 16);
    const b = parseInt(this.color.slice(5, 7), 16);
    
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.font = `bold ${textSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x, textY);
    
    // Expanding circle effect
    const circleSize = 30 * progress;
    const circleAlpha = alpha * 0.5;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${circleAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, circleSize, 0, Math.PI * 2);
    ctx.stroke();
  }
}

class PaddleAnimation extends Animation {
  constructor(paddle, color, duration = 1.0) {
    super(duration);
    this.paddle = paddle;
    this.color = color;
  }
  
  draw(ctx) {
    if (!this.active) return;
    
    const progress = this.getProgress();
    const alpha = 1.0 - progress;
    
    const x1 = this.paddle.x;
    const y1 = this.paddle.y;
    const x2 = this.paddle.x + this.paddle.width;
    const y2 = this.paddle.y + this.paddle.height;
    const centerY = (y1 + y2) / 2;
    
    // Parse color
    const r = parseInt(this.color.slice(1, 3), 16);
    const g = parseInt(this.color.slice(3, 5), 16);
    const b = parseInt(this.color.slice(5, 7), 16);
    
    // Draw glow rings
    for (let i = 0; i < 3; i++) {
      const effectAlpha = alpha * (1.0 - i * 0.3);
      const size = 8 * effectAlpha * (1 + i * 0.4);
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${effectAlpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1 - size, centerY - size, (x2 - x1) + 2 * size, 2 * size);
    }
  }
}

class BallSpeedAnimation extends Animation {
  constructor(ball, speedIncrease, duration = 1.5) {
    super(duration);
    this.ball = ball;
    this.speedIncrease = speedIncrease;
    this.particles = [];
    
    // Create particles
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 50 + 30;
      this.particles.push({
        x: ball.x,
        y: ball.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0
      });
    }
  }
  
  update(dt) {
    super.update(dt);
    
    // Update particles
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt / this.duration;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
  }
  
  draw(ctx) {
    if (!this.active) return;
    
    const progress = this.getProgress();
    const auraAlpha = 1.0 - progress;
    const auraSize = 15 * auraAlpha;
    
    const colorBase = this.speedIncrease ? [255, 165, 0] : [100, 149, 237];
    
    // Draw aura rings
    for (let i = 0; i < 3; i++) {
      const ringAlpha = auraAlpha * (1.0 - i * 0.3);
      const ringSize = auraSize * (1 + i * 0.5);
      const [r, g, b] = colorBase;
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, ringSize, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw particles
    for (const particle of this.particles) {
      if (particle.life > 0) {
        const alpha = particle.life;
        const [r, g, b] = colorBase;
        const size = 3 * alpha;
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

const left=new Paddle(32,'Left');
const right=new Paddle(cfg.width-48,'Right');
const ball=new Ball();
const lens=new Lens();
let powerups=[];
let animations=[];
let lastPowerupTime=0;
let rallyHits=0;
let trail=[];

let expandTimers={left:0,right:0};
let shrinkTimers={left:0,right:0};
let ballTimer=0;
let ballSpeedFactor=1;

const RAINBOW=['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#4b0082','#9400d3'];

function getBeamColor(wavelength){
  const w=wavelength;
  if(w<380)return '#8000ff';
  if(w<440){const t=(w-380)/(440-380);const r=Math.round(128*(1-t));return `#${r.toString(16).padStart(2,'0')}00ff`;}
  if(w<490){const t=(w-440)/(490-440);const g=Math.round(255*t);return `#00${g.toString(16).padStart(2,'0')}ff`;}
  if(w<510){const t=(w-490)/(510-490);const b=Math.round(255*(1-t));return `#00ff${b.toString(16).padStart(2,'0')}`;}
  if(w<580){const t=(w-510)/(580-510);const r=Math.round(255*t);return `#${r.toString(16).padStart(2,'0')}ff00`;}
  if(w<645){const t=(w-580)/(645-580);const g=Math.round(255*(1-t));return `#ff${g.toString(16).padStart(2,'0')}00`;}
  if(w<=750)return '#ff0000';
  return '#800000';
}

function handleKeyDown(key){
  console.log('Key pressed:', key, 'State:', state); // Debug logging
  
  // Initialize audio on first interaction
  initAudio();
  
  switch(key){
    case 'Enter':
      if(state==='menu'){
        console.log('Starting game...');
        state='running';
        hidePanels();
      } else if(state==='gameover'){
        console.log('Restarting game...');
        resetScores();
        state='running';
        hidePanels();
      }
      break;
    case 'Escape':
      if(state==='running'||state==='paused'){state='menu';showPanel(menuPanel);}      
      else if(state==='help'){state='menu';showPanel(menuPanel);} 
      break;
    case 'p': case 'P':
      if(state==='running'){state='paused';showPanel(pausedPanel);} else if(state==='paused'){state='running';hidePanels();}
      break;
    case 'r': case 'R':
      if(state==='running'||state==='paused'){resetRound();}
      break;
    case 'F1':
    case 'f1':
      if(state==='menu'){state='help';showPanel(helpPanel);} else if(state==='help'){state='menu';showPanel(menuPanel);} 
      break;
    case 'n':
      if(state==='menu'){left.ai=!left.ai;updateMenuDisplay();}
      break;
    case 'm':
      if(state==='menu'){right.ai=!right.ai;updateMenuDisplay();}
      break;
    case '1': case '2': case '3': case '4':
      if(state==='menu'){aiDifficulty={'1':'easy','2':'normal','3':'hard','4':'insane'}[key];updateMenuDisplay();}
      break;
    case '+': case '=':
      if(state==='menu'){cfg.winScore=Math.min(21,cfg.winScore+1);saveConfig();updateMenuDisplay();}
      break;
    case '-': case '_':
      if(state==='menu'){cfg.winScore=Math.max(1,cfg.winScore-1);saveConfig();updateMenuDisplay();}
      break;
    case 'b': case 'B':
      if(state==='menu'){cfg.ballSpeed=Math.min(900,cfg.ballSpeed+20);saveConfig();updateMenuDisplay();}
      break;
    case 'v': case 'V':
      if(state==='menu'){cfg.ballSpeed=Math.max(100,cfg.ballSpeed-20);saveConfig();updateMenuDisplay();}
      break;
    case 'c':
      if(state==='menu'){cfg.lensCurvature=Math.min(cfg.lensCurvature+0.002,0.05);lens.curvature=cfg.lensCurvature;lens.updateRadius();saveConfig();updateMenuDisplay();}
      break;
    case 'x':
      if(state==='menu'){cfg.lensCurvature=Math.max(cfg.lensCurvature-0.002,0.002);lens.curvature=cfg.lensCurvature;lens.updateRadius();saveConfig();updateMenuDisplay();}
      break;
    case 'l': case 'L':
      if(state==='menu'){
        const materials = ['glass', 'silicon', 'germanium'];
        const currentIndex = materials.indexOf(cfg.lensMaterial);
        cfg.lensMaterial = materials[(currentIndex + 1) % materials.length];
        lens.material = cfg.lensMaterial;
        saveConfig();updateMenuDisplay();
      }
      break;
    case 'd':
      if(state==='menu'){cfg.beamDiameter=Math.min(cfg.beamDiameter+0.1,5.0);saveConfig();updateMenuDisplay();}
      break;
    case 'f':
      if(state==='menu'){cfg.beamDiameter=Math.max(cfg.beamDiameter-0.1,0.1);saveConfig();updateMenuDisplay();}
      break;
    case 't':
      if(state==='menu'){cfg.beamWavelength=Math.min(cfg.beamWavelength+10,1064);saveConfig();updateMenuDisplay();}
      break;
    case 'g':
      if(state==='menu'){cfg.beamWavelength=Math.max(cfg.beamWavelength-10,213);saveConfig();updateMenuDisplay();}
      break;
    case 'u': case 'U':
      if(state==='menu'){
        const frequencies = ['off', 'low', 'moderate', 'high'];
        const currentIndex = frequencies.indexOf(cfg.powerupsFrequency);
        cfg.powerupsFrequency = frequencies[(currentIndex + 1) % frequencies.length];
        saveConfig();updateMenuDisplay();
      }
      break;
    case 'j': case 'J':
      if(state==='menu'){
        const handicaps = ['small', 'standard', 'large', 'extra_large'];
        const currentIndex = handicaps.indexOf(cfg.leftPaddleHandicap);
        cfg.leftPaddleHandicap = handicaps[(currentIndex + 1) % handicaps.length];
        left.resetToHandicap();
        saveConfig();updateMenuDisplay();
      }
      break;
    case 'k': case 'K':
      if(state==='menu'){
        const handicaps = ['small', 'standard', 'large', 'extra_large'];
        const currentIndex = handicaps.indexOf(cfg.rightPaddleHandicap);
        cfg.rightPaddleHandicap = handicaps[(currentIndex + 1) % handicaps.length];
        right.resetToHandicap();
        saveConfig();updateMenuDisplay();
      }
      break;
  }
}

document.addEventListener('keydown', e=>{
  keys[e.key.toLowerCase()]=true;
  handleKeyDown(e.key);
  e.preventDefault(); // Prevent default browser behavior
});
document.addEventListener('keyup', e=>{
  keys[e.key.toLowerCase()]=false;
  e.preventDefault();
});

// Mobile touch controls
function setupMobileControls() {
  const leftUp = document.getElementById('left-up');
  const leftDown = document.getElementById('left-down');
  const rightUp = document.getElementById('right-up');
  const rightDown = document.getElementById('right-down');

  if (!leftUp || !leftDown || !rightUp || !rightDown) return;

  // Left paddle controls
  leftUp.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['w'] = true;
  });
  leftUp.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['w'] = false;
  });

  leftDown.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['s'] = true;
  });
  leftDown.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['s'] = false;
  });

  // Right paddle controls
  rightUp.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['arrowup'] = true;
  });
  rightUp.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['arrowup'] = false;
  });

  rightDown.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['arrowdown'] = true;
  });
  rightDown.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['arrowdown'] = false;
  });

  // Also handle mouse events for testing
  [leftUp, leftDown, rightUp, rightDown].forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const key = btn.id.includes('left') ? 
        (btn.id.includes('up') ? 'w' : 's') :
        (btn.id.includes('up') ? 'arrowup' : 'arrowdown');
      keys[key] = true;
    });
    
    btn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      const key = btn.id.includes('left') ? 
        (btn.id.includes('up') ? 'w' : 's') :
        (btn.id.includes('up') ? 'arrowup' : 'arrowdown');
      keys[key] = false;
    });
    
    btn.addEventListener('mouseleave', (e) => {
      e.preventDefault();
      const key = btn.id.includes('left') ? 
        (btn.id.includes('up') ? 'w' : 's') :
        (btn.id.includes('up') ? 'arrowup' : 'arrowdown');
      keys[key] = false;
    });
  });
}

// Initialize mobile controls
setupMobileControls();

// Make canvas focusable
canvas.tabIndex = 1000;

function showPanel(panel){
  overlay.classList.remove('hidden');
  menuPanel.classList.add('hidden');
  helpPanel.classList.add('hidden');
  pausedPanel.classList.add('hidden');
  gameoverPanel.classList.add('hidden');
  panel.classList.remove('hidden');
  
  // Update menu text with current settings
  if (panel === menuPanel) {
    updateMenuDisplay();
  }
  
  // Focus the canvas to ensure keyboard events work
  setTimeout(() => canvas.focus(), 100);
}

function hidePanels(){
  overlay.classList.add('hidden');
  menuPanel.classList.add('hidden');
  helpPanel.classList.add('hidden');
  pausedPanel.classList.add('hidden');
  gameoverPanel.classList.add('hidden');
  
  // Force a small delay to ensure CSS transition completes
  setTimeout(() => {
    canvas.focus();
  }, 100);
}

function updateMenuDisplay() {
  const settingsDiv = document.getElementById('settings-display');
  if (settingsDiv) {
    settingsDiv.innerHTML = `
      <div>Win Score: ${cfg.winScore} | Ball Speed: ${cfg.ballSpeed} px/s | AI Difficulty: ${aiDifficulty}</div>
      <div>AI: ${left.ai ? 'Left ON' : 'Left OFF'}, ${right.ai ? 'Right ON' : 'Right OFF'}</div>
      <div>Lens: ${getLensMaterialDisplayName(cfg.lensMaterial)} | Curvature: ${cfg.lensCurvature.toFixed(3)}</div>
      <div>Beam: ${cfg.beamWavelength.toFixed(1)}nm, ${cfg.beamDiameter.toFixed(1)}mm | Power-ups: ${getPowerupFrequencyDisplayName(cfg.powerupsFrequency)}</div>
      <div>Handicaps: Left ${getHandicapDisplayName(cfg.leftPaddleHandicap)}, Right ${getHandicapDisplayName(cfg.rightPaddleHandicap)}</div>
    `;
  }
}

showPanel(menuPanel);

// Make sure canvas is focused initially and update settings display
canvas.focus();
updateMenuDisplay();

// Add click handler for start button
document.getElementById('start-btn').addEventListener('click', () => {
  if (state === 'menu') {
    initAudio();
    state = 'running';
    hidePanels();
    canvas.focus();
  }
});

function getPowerupFrequencyDisplayName(freq) {
  const names = {
    'off': 'OFF',
    'low': 'Low',
    'moderate': 'Moderate',
    'high': 'High'
  };
  return names[freq] || 'Moderate';
}

function getPowerupSettings(freq){
  switch(freq){
    case 'off': return [false,999,[999,999]];
    case 'low': return [true,4,[6,10]];
    case 'high': return [true,1,[1,2.5]];
    default: return [true,2,[2,4]];
  }
}

function spawnPowerupMaybe(){
  const [enabled,minHits,timeRange]=getPowerupSettings(cfg.powerupsFrequency);
  if(!enabled) return;
  const now=performance.now()/1000;
  if(rallyHits>=minHits && now-lastPowerupTime>timeRange[0]){
    if(Math.random()<0.5){
      const kinds=['PADDLE_EXPAND','PADDLE_SHRINK_OPP','BALL_SLOW','BALL_FAST'];
      powerups.push(new PowerUp(kinds[Math.floor(Math.random()*kinds.length)]));
    }
    lastPowerupTime=now;
  }
}

function applyPowerup(kind,hitter){
  // Add collection animation at power-up location
  const powerup = powerups.find(p => p.kind === kind && p.active);
  if (powerup) {
    animations.push(new PowerUpCollectedAnimation(powerup.x, powerup.y, kind));
  }
  
  if(kind==='PADDLE_EXPAND' && hitter){
    const pad=hitter==='left'?left:right;
    pad.height=Math.min(pad.baseHeight*1.35, cfg.height*0.65);
    expandTimers[hitter]=5;
    animations.push(new PaddleAnimation(pad, '#00ff00'));
  } else if(kind==='PADDLE_SHRINK_OPP' && hitter){
    const opp=hitter==='left'?right:left;
    opp.height=Math.max(opp.baseHeight*0.72, 40);
    shrinkTimers[hitter==='left'?'right':'left']=5;
    animations.push(new PaddleAnimation(opp, '#ff3030'));
  } else if(kind==='BALL_SLOW'){
    ball.speedUp(0.85);ballTimer=5;ballSpeedFactor=0.85;
    animations.push(new BallSpeedAnimation(ball, false));
  } else if(kind==='BALL_FAST'){
    ball.speedUp(1.18);ballTimer=5;ballSpeedFactor=1.18;
    animations.push(new BallSpeedAnimation(ball, true));
  }
  playBeep(660,0.1);
}

function resetRound() {
  ball.reset();
  left.resetToHandicap();
  right.resetToHandicap();
  powerups = [];
  animations = [];
  rallyHits = 0;
  expandTimers = {left:0,right:0};
  shrinkTimers = {left:0,right:0};
  ballTimer = 0;
  ballSpeedFactor = 1;
}

function startScoring(player) {
  if (state !== 'running') return; // Prevent double scoring
  
  // Update score
  if (player === 'left') {
    left.score++;
  } else {
    right.score++;
  }
  
  // Play scoring sound
  playBeep(220, 0.2);
  
  // Add score animation
  addScoreAnimation(player);
  
  // Check for game over
  checkGameOver();
  
  // If game is not over, reset immediately (like desktop version)
  if (state !== 'gameover') {
    ball.reset();
    left.resetToHandicap();
    right.resetToHandicap();
    rallyHits = 0;
    powerups = [];
  }
}

function addScoreAnimation(player) {
  // Add a pulsing animation to the score that just increased
  animations.push({
    type: 'score-pulse',
    player: player,
    duration: 1.0,
    elapsed: 0,
    active: true,
    update: function(dt) {
      this.elapsed += dt;
      if (this.elapsed >= this.duration) {
        this.active = false;
      }
    },
    getScale: function() {
      // Pulse effect: start at 1.5x, ease back to 1x
      const progress = this.elapsed / this.duration;
      if (progress >= 1) return 1;
      
      // Smooth ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      return 1 + (0.5 * (1 - eased));
    }
  });
}


function update(dt){
  if(state!=='running') return;

  if(!left.ai){
    if(keys['w']) left.move(-1);
    else if(keys['s']) left.move(1);
    else left.stop();
  }
  if(!right.ai){
    if(keys['arrowup']) right.move(-1);
    else if(keys['arrowdown']) right.move(1);
    else right.stop();
  }

  left.update(dt);
  right.update(dt);
  ball.update(dt);

  if(ball.y-ball.r<=0 || ball.y+ball.r>=cfg.height){
    ball.reflectVertical();
    playBeep(880,0.05);
  }
  if(ball.x-ball.r<left.x+left.width && ball.y>left.y && ball.y<left.y+left.height && ball.vx<0){
    ball.x=left.x+left.width+ball.r;
    ball.reflectHorizontal();
    ball.lastHit='left';
    ball.resetRoundTime();
    rallyHits++;
    playBeep(440,0.05);
    spawnPowerupMaybe();
  }
  if(ball.x+ball.r>right.x && ball.y>right.y && ball.y<right.y+right.height && ball.vx>0){
    ball.x=right.x-ball.r;
    ball.reflectHorizontal();
    ball.lastHit='right';
    ball.resetRoundTime();
    rallyHits++;
    playBeep(440,0.05);
    spawnPowerupMaybe();
  }

  // Check for scoring (ball completely off screen)
  if(ball.x + ball.r < 0){
    startScoring('right');
  }
  if(ball.x - ball.r > cfg.width){
    startScoring('left');
  }

  // Update powerups
  powerups.forEach(p => p.update(dt));
  powerups = powerups.filter(p => p.active);

  powerups.forEach(p=>{
    if(p.active){
      const [x0,y0,x1,y1]=p.bounds();
      if(ball.x>x0 && ball.x<x1 && ball.y>y0 && ball.y<y1){
        p.active=false;
        applyPowerup(p.kind, ball.lastHit);
      }
    }
  });
  
  // Update animations
  animations.forEach(anim => anim.update(dt));
  animations = animations.filter(anim => anim.active);

  if(expandTimers.left>0){expandTimers.left-=dt;if(expandTimers.left<=0)left.resetToHandicap();}
  if(expandTimers.right>0){expandTimers.right-=dt;if(expandTimers.right<=0)right.resetToHandicap();}
  if(shrinkTimers.left>0){shrinkTimers.left-=dt;if(shrinkTimers.left<=0)left.resetToHandicap();}
  if(shrinkTimers.right>0){shrinkTimers.right-=dt;if(shrinkTimers.right<=0)right.resetToHandicap();}
  if(ballTimer>0){ballTimer-=dt;if(ballTimer<=0){ball.speedUp(1/ballSpeedFactor);ballSpeedFactor=1;}}

  trail.push([ball.x,ball.y]);
  if(trail.length>120) trail.shift();
}

function checkGameOver(){
  if(left.score>=cfg.winScore || right.score>=cfg.winScore){
    winnerEl.textContent = left.score>right.score? 'Left Wins!' : 'Right Wins!';
    state='gameover';
    showPanel(gameoverPanel);
  }
}

function resetScores(){
  left.score=0; right.score=0; 
  resetRound();
}

function render(){
  // Clear the entire canvas
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  
  // Set background
  ctx.fillStyle=cfg.theme.bg;
  ctx.fillRect(0,0,cfg.width,cfg.height);

  // lens
  ctx.strokeStyle=cfg.theme.accent;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.ellipse(lens.x,lens.y,lens.rx,lens.ry,0,0,Math.PI*2);
  ctx.stroke();

  // beam trail
  if(trail.length>1){
    const beamColor=getBeamColor(cfg.beamWavelength);
    const beamWidth=cfg.beamDiameter*2;
    for(let i=0;i<trail.length-1;i++){
      const [x1,y1]=trail[i];
      const [x2,y2]=trail[i+1];
      let color=beamColor;
      if(lens.contains(x1,y1) || lens.contains(x2,y2)){
        color=RAINBOW[i%RAINBOW.length];
      }
      const intensity=(i+1)/trail.length;
      ctx.strokeStyle=color;
      ctx.globalAlpha=intensity;
      ctx.lineWidth=beamWidth;
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  // paddles and ball
  ctx.fillStyle=cfg.theme.fg;
  ctx.fillRect(left.x,left.y,left.width,left.height);
  ctx.fillRect(right.x,right.y,right.width,right.height);

  ctx.fillStyle='#ff3b3b';
  ctx.beginPath();
  ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);
  ctx.fill();

  // powerups
  powerups.forEach(p=>p.draw(ctx));

  // animations
  animations.forEach(anim => { if (anim && typeof anim.draw === 'function') anim.draw(ctx); });

  // scores
  ctx.fillStyle=cfg.theme.fg;
  ctx.font='32px sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='top';
  
  // Find any active score animation
  const scoreAnim = animations.find(anim => anim.type === 'score-pulse' && anim.active);
  
  // Draw left score
  ctx.save();
  if (scoreAnim && scoreAnim.player === 'left') {
    const scale = scoreAnim.getScale();
    ctx.translate(cfg.width/2 - 40, 20 + 16); // Center of text
    ctx.scale(scale, scale);
    ctx.translate(-(cfg.width/2 - 40), -(20 + 16));
  }
  ctx.fillText(left.score, cfg.width/2 - 40, 20);
  ctx.restore();
  
  // Draw right score
  ctx.save();
  if (scoreAnim && scoreAnim.player === 'right') {
    const scale = scoreAnim.getScale();
    ctx.translate(cfg.width/2 + 40, 20 + 16); // Center of text
    ctx.scale(scale, scale);
    ctx.translate(-(cfg.width/2 + 40), -(20 + 16));
  }
  ctx.fillText(right.score, cfg.width/2 + 40, 20);
  ctx.restore();
  
  // Debug info during gameplay (optional)
  if (state === 'running' && false) { // Set to true to show debug info
    ctx.font='12px sans-serif';
    ctx.textAlign='left';
    ctx.textBaseline='top';
    ctx.fillStyle = cfg.theme.fg;
    const debugY = 60;
    ctx.fillText(`Ball Speed: ${Math.round(cfg.ballSpeed)} px/s`, 10, debugY);
    ctx.fillText(`Lens: ${getLensMaterialDisplayName(cfg.lensMaterial)}`, 10, debugY + 15);
    ctx.fillText(`Beam: ${cfg.beamWavelength.toFixed(1)}nm, ${cfg.beamDiameter.toFixed(1)}mm`, 10, debugY + 30);
    ctx.fillText(`Power-ups: ${getPowerupFrequencyDisplayName(cfg.powerupsFrequency)}`, 10, debugY + 45);
    ctx.fillText(`Left: ${getHandicapDisplayName(cfg.leftPaddleHandicap)}, Right ${getHandicapDisplayName(cfg.rightPaddleHandicap)}`, 10, debugY + 60);
  }
}

let lastTime=performance.now()/1000;
function loop(ts){
  const t=ts/1000;
  const dt=t-lastTime;
  lastTime=t;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

})();
