// ======= Core constants & helpers =======
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
// Menu elements
const menuEl = document.getElementById('menu');
const levelSelect = document.getElementById('levelSelect');
const levelGrid = document.getElementById('levelGrid');
const charGrid = document.getElementById('charGrid');
const charPreview = document.getElementById('charPreview');
const charPrevCtx = charPreview ? charPreview.getContext('2d') : null;
const charSelect = document.getElementById('charSelect'); // retained as fallback
const startBtn = document.getElementById('startBtn');
const charPreviewWrap = document.querySelector('.char-preview-wrap');
let selectedLevelFile = 'level1.json';
let selectedChar = 'lucy';
const CHARACTERS = [
  { id:'lucy', name:'Lucy', age:8, bio:'Gymnast', colors:{hat:'#c2385f', outfit:'#ff5fa2', hair:'#f2d16b', accent:'#7e1b3a'} },
  { id:'joey', name:'Joey', age:6, bio:'Ninja', colors:{hat:'#111', outfit:'#1f2937', hair:'#e4d18b', accent:'#00bcd4'} },
  { id:'abe',  name:'Abe',  age:3, bio:'Pajamas & Gloves', colors:{hat:'#87cefa', outfit:'#a7e0ff', hair:'#caa36d', accent:'#e63946'} },
  { id:'leo',  name:'Leo',  age:1, bio:'Diaper Champ', colors:{hat:'#f8fafc', outfit:'#ffffff', hair:'#edd9a3', accent:'#ffd166'} },
];
// Helper: robust ellipse path for browsers lacking ctx.ellipse
function ellipsePath(x,y,rx,ry, ctxArg){
  const k = ctxArg || ctx;
  if (typeof k.ellipse === 'function'){
    k.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  } else {
    k.save(); k.translate(x,y); k.scale(rx,ry); k.arc(0,0,1,0,Math.PI*2); k.restore();
  }
}

const HUD = { coins:document.getElementById('coins'), lives:document.getElementById('lives'), world:document.getElementById('world'), msg:document.getElementById('msg') };

const TILE = 32;
const GRAVITY = 1800;      // px/s^2
const MOVE_ACC = 2600;     // px/s^2
const MOVE_MAX = 230;      // px/s
const FRICTION = 1800;     // px/s^2
const JUMP_VEL = 620;      // px/s
const CAM_MARGIN_X = 340;  // camera lead
const EPSY = 0.75;         // vertical snap epsilon (px) to stop jitter
// New: jump feel helpers
const COYOTE_TIME = 0.10;  // seconds after walking off ledge where jump still works
const JUMP_BUFFER = 0.12;  // seconds to buffer jump pressed slightly before landing

// Simple SFX (coin via asset, others via tiny beeps); unlock on first input
let audioReady = false;
let audioCtx = null;
const SFX = { coin: new Audio('../assets/sounds/collect.wav') };
SFX.coin.volume = 0.45;
function unlockAudio(){
  if (audioReady) return; audioReady = true;
  try { audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } catch {}
}
function playBeep(freq=600, dur=0.08, vol=0.08){
  if (!audioReady || !audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square'; o.frequency.value = freq; g.gain.value = vol;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
function playCoin(){ if (!audioReady) return; try{ SFX.coin.currentTime=0; SFX.coin.play(); }catch{} }

// Canvas colors (avoid CSS var() in canvas for broader browser support)
const COL = { ground:'#7c4a1f', grass:'#49a020', brick:'#b85a35', coin:'#f2c14e' };

// ===== Character portraits (menu) =====
function drawPortrait(id){
  if (!charPrevCtx || !charPreview) return;
  const W = charPreview.width, H = charPreview.height;
  charPrevCtx.clearRect(0,0,W,H);
  const cdef = CHARACTERS.find(c=>c.id===id) || CHARACTERS[0];
  const c = charPrevCtx;
  // Background burst
  c.save();
  const grad = c.createRadialGradient(W/2,H/2,20, W/2,H/2, Math.max(W,H)/2);
  grad.addColorStop(0,'#ffffff'); grad.addColorStop(1,'#e6f2ff');
  c.fillStyle = grad; c.fillRect(0,0,W,H);
  // Shadow base
  c.fillStyle = 'rgba(0,0,0,0.08)'; c.beginPath(); ellipsePath(W/2, H-32, 120, 18, c); c.fill();
  c.translate(W/2, H/2 + 20);
  c.scale(3.2, 3.2);
  // Unified cute body layout; then vary hair/outfit/accessories
  // Body
  c.fillStyle = cdef.colors.outfit; c.fillRect(-8,-10,16,18);
  // Head
  c.fillStyle = '#ffddbf'; c.fillRect(-10,-24,20,14);
  // Eyes
  c.fillStyle = '#000'; c.fillRect(-4,-20,2,3); c.fillRect(2,-20,2,3);
  // Feet
  c.fillStyle = '#3b3b3b'; c.fillRect(-8,8,6,6); c.fillRect(2,8,6,6);
  // Character-specific
  switch(cdef.id){
    case 'lucy':
      // Long blond hair + leotard
      c.fillStyle = cdef.colors.hair; c.fillRect(-12,-24,6,14); c.fillRect(6,-24,6,14);
      c.fillStyle = cdef.colors.hat; c.fillRect(-9,-28,18,6); // headband
      break;
    case 'joey':
      // Ninja hood + headband tail
      c.fillStyle = cdef.colors.hat; c.fillRect(-11,-26,22,10);
      c.fillStyle = cdef.colors.accent; c.fillRect(-10,-22,20,3);
      c.fillRect(10,-22,6,3); c.fillRect(10,-19,4,3);
      break;
    case 'abe':
      // Pajamas + red boxing gloves
      c.fillStyle = cdef.colors.accent; c.fillRect(-14,-2,6,6); c.fillRect(8,-2,6,6);
      c.strokeStyle = '#e76f51'; c.lineWidth=1; c.strokeRect(-14,-2,6,6); c.strokeRect(8,-2,6,6);
      break;
    case 'leo':
      // Diaper + pacifier
      c.fillStyle = '#fff'; c.fillRect(-8,2,16,6);
      c.strokeStyle='#e5e7eb'; c.strokeRect(-8,2,16,6);
      c.fillStyle = cdef.colors.accent; c.beginPath(); c.arc(0,-14,3,0,Math.PI*2); c.fill(); // pacifier
      break;
  }
  c.restore();
}
function updateCharSelection(id, previewOnly=false){
  if (!id) return; 
  if (!previewOnly) selectedChar = id;
  // Update aria-selected on cards
  if (charGrid){
    const cards = charGrid.querySelectorAll('.char-card');
    cards.forEach(btn=> btn.setAttribute('aria-selected', String(btn.dataset.char===selectedChar)));
  }
  drawPortrait(id);
  // Always show portrait when a character is selected/hovered
  if (charPreviewWrap) {
    charPreviewWrap.classList.add('visible');
    // Also ensure the canvas is visible by setting opacity directly as fallback
    if (charPreview) charPreview.style.opacity = '1';
  }
}
if (charGrid){
  const isMobile = () => window.innerWidth <= 1023;
  const togglePreview = (show)=>{ if (charPreviewWrap) charPreviewWrap.classList.toggle('visible', !!show); };
  
  charGrid.addEventListener('mouseover', (e)=>{ const btn = e.target.closest('.char-card'); if (btn){ updateCharSelection(btn.dataset.char, true); } });
  charGrid.addEventListener('focusin', (e)=>{ const btn = e.target.closest('.char-card'); if (btn){ updateCharSelection(btn.dataset.char, true); } });
  charGrid.addEventListener('click', (e)=>{ const btn = e.target.closest('.char-card'); if (btn) updateCharSelection(btn.dataset.char, false); });
  
  // Hide portrait logic: only hide on mobile when leaving grid/focus
  charGrid.addEventListener('mouseout', (e)=>{ 
    if (isMobile() && !charGrid.contains(e.relatedTarget)) togglePreview(false); 
  });
  charGrid.addEventListener('focusout', ()=>{ 
    if (isMobile()) {
      const anyFocused = !!charGrid.querySelector('.char-card:focus'); 
      if (!anyFocused) togglePreview(false); 
    }
  });
}

// Simple level encoding (extended to ~2x length)
const BASE = [
"______________________________________________________________________________________________________________",
"______________________________________________________________________________________________________________",
"____________________________________________________________________C_________________________________________",
"___________________________________________==______________________====_______________________________________",
"___________________________C__________________C_________________________C_____________________________________",
"__________________________===_________E_________________________E___________==______________________C_________",
"______________________________C____________====______________====______________________==_____________________",
"_________C_____________==_______==_____________________C_______________________________==_______E____________",
"________====___C_______________________C__________E__________C__________==_________________________====_______",
"______________________________________________________________________________________________________________",
"_____P___________==__________________________====________________=___________________________C________________",
"###########___#########____#######____#############__#########__#########___##########___#############__G____",
"###########___#########____#######____#############__#########__#########___##########___############__GGG___",
"###########___#########____#######____#############__#########__#########___##########___############_GGGGG__",
];
// Build a second half with higher platforms, coins, enemies (E) and Hellmonks (H)
const EXT = [
// 0
"____________________________________________________________C______________________________C__________________",
// 1
"_______________________________________________________________________________________________C______________",
// 2 high coins
"________________________C_______________________C__________________________C______________________________C___",
// 3 high platforms
"_______________________====_______________==_____________________====___________________________==___________",
// 4 staggered coins
"__________C__________C___________C_________________C________________C____________C___________________________",
// 5 mixed platforms and enemies
"__________==_____E______________====____________H______________====____________E___________==_____C__________",
// 6 higher platforms and coins
"_____C________====__________C______________==____________C___________====____________C_____________==________",
// 7 tall jumps with hellmonks guarding
"________==__________________==____________________H______________==___________________H______________==______",
// 8 run-ups and pits
"_____________=________________________C__________E________C______________==______________H_______C___________",
// 9 sky
"______________________________________________________________________________________________________________",
// 10 above ground ledges
"________C_______==___________________C____________==__________C_____________==___________________C__________",
// 11 ground (with checkpoint K near the start of second half)
"#############__K__############____#########_____###############____###########_____############_____#########",
// 12 ground with final goal near end
"#############_____############____#########_____###############____###########_____############_____##__GGGGG",
// 13 ground thickness row (not used, kept consistent with BASE height)
];
// New: level builder + mutable LEVEL size so we can reload JSON
function buildLevelFromArrays(base, ext){
  const rows = base.slice();
  const extLocal = ext ? ext.slice() : [];
  while (extLocal.length < rows.length) extLocal.push((extLocal[0]||'').padEnd((rows[0]||'').length||96, '_'));
  return rows.map((row,i)=> row + (extLocal[i]||''));
}
let LEVEL = buildLevelFromArrays(BASE, EXT);
let H = LEVEL.length, W = LEVEL[0].length;
function tileAt(tx, ty){ if (ty<0||ty>=H||tx<0||tx>=W) return '_'; return LEVEL[ty][tx] || '_'; }
function isSolid(c){ return c==='#' || c==='=' || c==='[' || c===']' || c==='B'; }
// Find the top surface (y in world px) of the first solid tile at or below startTy in the given column
function groundTopAt(tx, startTy){
  for (let ty=startTy; ty<H; ty++){
    if (isSolid(tileAt(tx,ty))) return (ty-1)*TILE;
  }
  return (H-1)*TILE;
}
// Find the nearest platform surface at or above startTy (scan upward); returns undefined if none
function surfaceTopAt(tx, startTy){
  for (let ty=startTy; ty>=1; ty--){
    if (isSolid(tileAt(tx,ty)) && !isSolid(tileAt(tx,ty-1))) return (ty-1)*TILE;
  }
}

// Entities
class Entity{
  constructor(x,y,w,h){ this.x=x; this.y=y; this.w=w; this.h=h; this.vx=0; this.vy=0; this.dead=false; this.remove=false; this.grounded=false; }
  get left(){ return this.x; } get right(){ return this.x+this.w; } get top(){ return this.y; } get bottom(){ return this.y+this.h; }
}
class Player extends Entity{
  constructor(x,y){ super(x,y,20,28); this.grounded=false; this.facing=1; this.invuln=0; this.lives=3; this.coins=0; this.spawnX=x; this.spawnY=y; this.coyote=0; this.jumpBuffer=0; this.big=false; }
  respawn(){ this.x=this.spawnX; this.y=this.spawnY; this.vx=0; this.vy=0; this.invuln=1.2; this.big=false; this.w=20; this.h=28; }
}
class Goomba extends Entity{
  constructor(x,y){ super(x,y,24,22); this.speed=65; this.vx=-this.speed; }
}
// Hellmonk: monkey with bright yellow helmet
class Hellmonk extends Entity{
  constructor(x,y){ super(x,y,24,24); this.speed=55; this.chargeSpeed=210; this.state='idle'; this.reactCD=0; this.facing=-1; this.jump=-520; }
}
class Zakko extends Entity{
  constructor(x,y){ super(x,y,20,80); this.knocked=false; }
}

function growPlayer(p){
  if (p.big) return;
  p.big = true;
  const oldH = p.h, oldW = p.w;
  p.h = 40; p.w = 26;
  p.y -= (p.h - oldH);
}
function shrinkPlayer(p){
  if (!p.big) return;
  const oldH = p.h, oldW = p.w;
  p.big = false;
  p.h = 28; p.w = 20;
  p.y += (oldH - p.h);
}

// Instantiate world from current LEVEL
function findInMap(symbol){ for (let y=0;y<H;y++){ const x=LEVEL[y].indexOf(symbol); if (x!==-1) return {x,y}; } return {x:2,y:2}; }
function buildWorld(){
  const spawn = findInMap('P');
  const world = { player:new Player(spawn.x*TILE,(spawn.y-1)*TILE), enemies:[], coins:[], blocks:[], goal:null, checkpoint:null, camX:0, state:'play', winT:0, time:0 };
  let boxAlt = 0;
  for (let y=0;y<H;y++){
    for (let x=0;x<W;x++){
      const c=LEVEL[y][x];
      if (c==='E') world.enemies.push(new Goomba(x*TILE,(y-1)*TILE));
      if (c==='H') world.enemies.push(new Hellmonk(x*TILE,(y-1)*TILE));
      if (c==='Z'){ const top = groundTopAt(x,y) - 80; world.enemies.push(new Zakko(x*TILE, top)); }
      if (c==='C') world.coins.push({x:x*TILE+8,y:(y-1)*TILE+8,r:7,taken:false});
      if (c==='[') world.blocks.push({x:x*TILE,y:(y-1)*TILE,w:TILE,h:TILE,type:'q',bounce:0,used:false});
      if (c==='B'){
        const content = (boxAlt++%2===0) ? {type:'coins',amount:2+Math.floor(Math.random()*3)} : {type:'shamrock'};
        world.blocks.push({x:x*TILE,y:(y-1)*TILE,w:TILE,h:TILE,type:'mystery',bounce:0,used:false,content});
      }
      if (c==='G'){
        const poleH = TILE*5.5;
        let topY = surfaceTopAt(x, y);
        if (topY === undefined) topY = groundTopAt(x, y);
        const candidate = {x:x*TILE, y: topY - poleH, w:4*TILE, h:6*TILE, poleH, tx:x};
        if (!world.goal || x > world.goal.tx) world.goal = candidate;
      }
      if (c==='K' && !world.checkpoint){
        const poleH = TILE*4;
        let topY = surfaceTopAt(x, y);
        if (topY === undefined) topY = groundTopAt(x, y);
        world.checkpoint = {x:x*TILE, y: topY - poleH, w:3*TILE, h:4*TILE, poleH, activated:false};
      }
    }
  }
  HUD.coins.textContent = world.player.coins;
  HUD.lives.textContent = world.player.lives;
  return world;
}
let world = buildWorld();

// Menu logic: populate levels and start game
async function discoverLevels(){
  // Try to load a manifest first
  let entries = null;
  try{
    const r = await fetch('levels.json', {cache:'no-store'});
    if (r.ok){ entries = await r.json(); }
  }catch{}
  let list = [];
  if (Array.isArray(entries) && entries.length){
    list = entries.filter(e=>e && e.file).map(e=> ({file:e.file, name: e.name || e.file.replace(/\.json$/,'')}));
    // Populate fallback select
    levelSelect.innerHTML = '';
    for (const ent of list){ const opt=document.createElement('option'); opt.value=ent.file; opt.textContent=ent.name; levelSelect.appendChild(opt);}    
  } else {
    // Fallback: probe common names
    const candidates = ['level1.json','level-1-1.json','level-1.json'];
    const found = [];
    for (const name of candidates){ try{ const r = await fetch(name, {cache:'no-store'}); if (r.ok){ found.push(name); } }catch{} }
    if (!found.includes('level1.json')) found.unshift('level1.json');
    list = [...new Set(found)].map(f=> ({file:f, name: (f.replace(/\.json$/,'').replace(/level[-_]?/i,'') || '1-1')}));
    // Fallback select
    levelSelect.innerHTML = '';
    for (const ent of list){ const opt=document.createElement('option'); opt.value=ent.file; opt.textContent=ent.name; levelSelect.appendChild(opt);}    
  }
  // Build large level tiles
  buildLevelGrid(list);
  // Default selection
  selectedLevelFile = (list[0] && list[0].file) || 'level1.json';
}
function buildLevelGrid(entries){
  if (!levelGrid) return;
  levelGrid.innerHTML = '';
  entries.forEach((ent, idx)=>{
    const tile = document.createElement('button');
    tile.className = 'level-tile' + (idx===0?' active':'');
    tile.textContent = ent.name;
    tile.dataset.file = ent.file;
    tile.addEventListener('click', ()=>{
      // Update active
      levelGrid.querySelectorAll('.level-tile').forEach(el=> el.classList.remove('active'));
      tile.classList.add('active');
      selectedLevelFile = ent.file;
      // Keep fallback select in sync
      const opt = [...levelSelect.options].find(o=>o.value===ent.file); if (opt) levelSelect.value = opt.value;
      playBeep(600,0.06,0.06);
    });
    levelGrid.appendChild(tile);
  });
}
async function startFromMenu(){
  unlockAudio();
  const levelFile = selectedLevelFile || levelSelect.value || 'level1.json';
  try{
    const resp = await fetch(levelFile);
    if (resp.ok){
      const data = await resp.json();
      const newLevel = buildLevelFromArrays(data.base||[], data.ext||[]);
      if (newLevel && newLevel.length){ LEVEL = newLevel; H = LEVEL.length; W = LEVEL[0].length; }
    }
  }catch{}
  resetGame();
  world.player.charId = selectedChar;
  world.state = 'play';
  HUD.msg.textContent = 'Reach the flag to finish the demo level';
  menuEl.classList.add('hidden');
  playBeep(700,0.08,0.08);
}
startBtn.addEventListener('click', startFromMenu);
document.addEventListener('keydown', (e)=>{ if (menuEl && !menuEl.classList.contains('hidden') && (e.key==='Enter' || e.key===' ')) startFromMenu(); });

// Input
const keys = {left:false,right:false,jump:false,dash:false};
let restartRequested = false;
function setKey(k, val){ keys[k]=val; }
function bufferJump(){ if (!world || !world.player) return; world.player.jumpBuffer = Math.max(world.player.jumpBuffer, JUMP_BUFFER); }
addEventListener('keydown', e=>{ const k=e.key.toLowerCase(); unlockAudio();
  if (k==='arrowleft'||k==='a') setKey('left',true);
  if (k==='arrowright') setKey('right',true);
  if (k==='d') setKey('dash',true);
  if (k===' '||k==='z'||k==='w'||k==='arrowup'){ setKey('jump',true); bufferJump(); }
  if (k==='p'){ if (world.state==='play'){ world.state='pause'; HUD.msg.textContent='Paused — press P to resume'; playBeep(440,0.06,0.06); } else if (world.state==='pause'){ world.state='play'; HUD.msg.textContent=''; playBeep(520,0.06,0.06); } }
  if (k==='r'){ restartRequested = true; }
});
addEventListener('keyup', e=>{ const k=e.key.toLowerCase();
  if (k==='arrowleft'||k==='a') setKey('left',false);
  if (k==='arrowright') setKey('right',false);
  if (k==='d') setKey('dash',false);
  if (k===' '||k==='z'||k==='w'||k==='arrowup') setKey('jump',false);
});
function bindButton(id, name){
  const el=document.getElementById(id);
  if (!el) {
    console.warn(`Button element with id "${id}" not found`);
    return;
  }
  const start=(ev)=>{ ev.preventDefault(); unlockAudio(); setKey(name,true); if (name==='jump') bufferJump(); };
  const end=()=> setKey(name,false);
  ['touchstart','mousedown'].forEach(ev=> el.addEventListener(ev,start,{passive:false}));
  ['touchend','touchcancel','mouseup','mouseleave'].forEach(ev=> el.addEventListener(ev,end));
}
// Ensure DOM is ready before binding buttons
document.addEventListener('DOMContentLoaded', ()=>{
  bindButton('left','left'); bindButton('right','right'); bindButton('jump','jump'); bindButton('dash','dash');
});

// Physics & collision
function rectOverlap(x1,y1,w1,h1,x2,y2,w2,h2){ return !(x1+w1<=x2||x1>=x2+w2||y1+h1<=y2||y1>=y2+h2); }
function aabb(a,b){ return rectOverlap(a.x,a.y,a.w,a.h,b.x,b.y,b.w,b.h); }
function circleRectOverlap(cx,cy,cr, rx,ry,rw,rh){
  const nx=Math.max(rx,Math.min(cx,rx+rw)), ny=Math.max(ry,Math.min(cy,ry+rh));
  const dx=cx-nx, dy=cy-ny; return dx*dx+dy*dy<=cr*cr;
}

// Move with tile collisions; y uses consistent (ty-1)*TILE mapping
function moveWithCollisions(ent, dx, dy, isEnemy=false){
  let collidedX=false;
  if (dx!==0){
    ent.x += dx;
    const from = Math.floor((Math.min(ent.left, ent.left-dx))/TILE);
    const to   = Math.floor((Math.max(ent.right, ent.right-dx))/TILE);
    const top  = Math.floor(ent.top/TILE)+1; // +1 to map world Y -> tile row
    const bot  = Math.floor((ent.bottom-1)/TILE)+1; // +1 to map world Y -> tile row
    for (let tx=from; tx<=to; tx++){
      for (let ty=top; ty<=bot; ty++){
        const c = tileAt(tx,ty);
        if (!isSolid(c)) continue;
        const tileRect = {x:tx*TILE, y:(ty-1)*TILE, w:TILE, h:TILE};
        if (rectOverlap(ent.x,ent.y,ent.w,ent.h,tileRect.x,tileRect.y,tileRect.w,tileRect.h)){
          if (dx>0) ent.x = tileRect.x - ent.w;
          else ent.x = tileRect.x + tileRect.w;
          ent.vx = isEnemy ? -ent.vx : 0;
          collidedX = true;
        }
      }
    }
  }
  if (dy!==0){
    ent.y += dy;
    const left = Math.floor(ent.left/TILE);
    const right= Math.floor((ent.right-1)/TILE);
    const from = Math.floor((Math.min(ent.top, ent.top-dy))/TILE)+1; // +1 to map world Y -> tile row
    const to   = Math.floor((Math.max(ent.bottom, ent.bottom-dy))/TILE)+1; // +1 to map world Y -> tile row
    let onGround=false;
    for (let ty=from; ty<=to; ty++){
      for (let tx=left; tx<=right; tx++){
        const c = tileAt(tx,ty);
        if (!isSolid(c)) continue;
        const tileRect = {x:tx*TILE, y:(ty-1)*TILE, w:TILE, h:TILE};
        if (rectOverlap(ent.x,ent.y,ent.w,ent.h,tileRect.x,tileRect.y,tileRect.w,tileRect.h)){
          if (dy>0) ent.y = tileRect.y - ent.h - 0.01; // restore landing snap above tile
          else ent.y = tileRect.y + tileRect.h;
          ent.vy = 10;
          onGround=true;
        }
      }
    }
    ent.grounded = onGround;
  }
  return collidedX;
}

// Snap to ground to eliminate sub-pixel hover/jitter
function trySnapToGround(ent){
  if (ent.vy < -0.01) return false; // rising
  const left = Math.floor((ent.left+2)/TILE);
  const right= Math.floor((ent.right-2)/TILE);
  const belowTy = Math.floor(ent.bottom/TILE)+1; // +1 to map world Y -> tile row below
  for (let tx=left; tx<=right; tx++){
    const c = tileAt(tx, belowTy);
    if (!isSolid(c)) continue;
    const tileTop = (belowTy-1)*TILE;
    const gap = tileTop - ent.bottom;
    if (gap>=-0.25 && gap<=EPSY){
      ent.y = tileTop - ent.h;
      ent.vy = 0;
      ent.grounded = true;
      return true;
    }
  }
  return false;
}

// ======= Simple rendering helpers (restored) =======
function drawClouds(camX){
  const w = canvas.width / (window.devicePixelRatio||1);
  const h = canvas.height / (window.devicePixelRatio||1);
  const t = performance.now()/1000;
  ctx.save();
  ctx.globalAlpha = 0.6;
  const clouds = 6;
  for (let i=0;i<clouds;i++){
    const k = i*137.3;
    const x = ((i*220 + (t*12) - camX*0.2) % (w+300)) - 150;
    const y = 40 + (i*37 % 120);
    ctx.fillStyle = 'white';
    ctx.beginPath(); ellipsePath(x+20,y+16,22,14); ctx.fill();
    ctx.beginPath(); ellipsePath(x+44,y+12,18,12); ctx.fill();
    ctx.beginPath(); ellipsePath(x+66,y+18,24,16); ctx.fill();
    ctx.beginPath(); ellipsePath(x+46,y+26,52,16); ctx.fill();
  }
  ctx.restore();
}
function drawGround(x,y){
  ctx.fillStyle = COL.ground; ctx.fillRect(x,y,TILE,TILE);
  // top grass stripe for readability
  ctx.fillStyle = COL.grass; ctx.fillRect(x,y, TILE, 4);
}
function drawBrick(x,y){
  ctx.fillStyle = COL.brick; ctx.fillRect(x,y,TILE,TILE);
  ctx.strokeStyle = '#8a3a20'; ctx.lineWidth = 1;
  // simple brick lines
  ctx.beginPath();
  for (let r=8; r<TILE; r+=8){ ctx.moveTo(x, y+r); ctx.lineTo(x+TILE, y+r); }
  ctx.stroke();
}
function drawQBlock(x,y){
  // basic question block
  ctx.fillStyle = '#f2c14e'; ctx.fillRect(x,y,TILE,TILE);
  ctx.strokeStyle = '#b3831a'; ctx.strokeRect(x+0.5,y+0.5,TILE-1,TILE-1);
  ctx.fillStyle = '#7a4c00';
  ctx.font = 'bold 18px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('?', x+TILE/2, y+TILE/2+1);
}
function drawMysteryBox(x,y,used){
  ctx.save();
  ctx.translate(x,y);
  ctx.fillStyle = '#4b2e00';
  ctx.fillRect(4,12,24,16);
  ctx.beginPath();
  ctx.moveTo(4,12); ctx.lineTo(28,12); ctx.lineTo(24,8); ctx.lineTo(8,8); ctx.closePath();
  ctx.fill();
  if (!used){
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(8,4,16,8);
  }
  ctx.restore();
}
function drawCoin(x,y,r){
  ctx.save();
  ctx.fillStyle = COL.coin; ctx.strokeStyle = '#b38b1a'; ctx.lineWidth=1;
  ctx.beginPath(); ellipsePath(x,y,r*1.0,r*0.9); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Replace drawMario with drawPlayer supporting character styles
function drawPlayer(x,y,p){
  ctx.save();
  ctx.translate(x + p.w/2, y + p.h);
  if (p.facing<0) ctx.scale(-1,1);
  ctx.translate(-p.w/2, -p.h);
  const id = p.charId || selectedChar || 'lucy';
  switch(id){
    case 'lucy': // gymnast leotard, long blond hair, pink hat band
      ctx.fillStyle = '#ff5fa2'; ctx.fillRect(0,6, p.w, p.h-6); // outfit
      ctx.fillStyle = '#ffddbf'; ctx.fillRect(2,0, p.w-4, 10); // head
      ctx.fillStyle = '#f2d16b'; ctx.fillRect(-2,2, 6,8); ctx.fillRect(p.w-4,2, 6,8); // hair sides
      ctx.fillStyle = '#c2385f'; ctx.fillRect(1,-4, p.w-2, 6); // band
      break;
    case 'joey': // ninja suit + headband
      ctx.fillStyle = '#1f2937'; ctx.fillRect(0,6, p.w, p.h-6);
      ctx.fillStyle = '#111'; ctx.fillRect(1,-2, p.w-2, 12); // hood
      ctx.fillStyle = '#00bcd4'; ctx.fillRect(0,-1, p.w, 3); ctx.fillRect(p.w-2,2, 4,3); ctx.fillRect(p.w-3,5, 3,2); // band + tails
      break;
    case 'abe': // pajamas + boxing gloves
      ctx.fillStyle = '#a7e0ff'; ctx.fillRect(0,6, p.w, p.h-6);
      ctx.fillStyle = '#ffddbf'; ctx.fillRect(2,0, p.w-4, 10);
      ctx.fillStyle = '#e63946'; ctx.fillRect(-3,12, 6,6); ctx.fillRect(p.w-3,12, 6,6); // gloves (may clip)
      ctx.strokeStyle = '#e76f51'; ctx.lineWidth=1; ctx.strokeRect(-3,12,6,6); ctx.strokeRect(p.w-3,12,6,6);
      break;
    case 'leo': // diaper + pacifier
      ctx.fillStyle = '#fff'; ctx.fillRect(0,12, p.w, p.h-12);
      ctx.fillStyle = '#ffddbf'; ctx.fillRect(3,2, p.w-6, 10); // smaller head
      ctx.fillStyle = '#ffd166'; ctx.fillRect(8,8, 4,3); // pacifier
      break;
    default:
      ctx.fillStyle = '#e0502d'; ctx.fillRect(0,6, p.w, p.h-6);
      ctx.fillStyle = '#ffcc99'; ctx.fillRect(2,0, p.w-4, 10);
      ctx.fillStyle = '#b02020'; ctx.fillRect(1,-4, p.w-2, 6);
  }
  // legs common
  ctx.fillStyle = '#3b3b3b'; ctx.fillRect(2,p.h-8, 6,8); ctx.fillRect(p.w-8,p.h-8, 6,8);
  ctx.restore();
}
function drawGoal(x,y,poleH){
  // Large Irish flag on a pole
  ctx.save();
  const poleHLocal = poleH || TILE*5.5, flagW=TILE*2.5, flagH=TILE*2.0;
  // pole
  ctx.strokeStyle = '#c0d0e0'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x+8, y+poleHLocal); ctx.lineTo(x+8, y); ctx.stroke();
  // flag (vertical tricolour: green, white, orange)
  const fx = x+10, fy = y + TILE*0.7;
  ctx.fillStyle = '#169B62'; ctx.fillRect(fx, fy, flagW/3, flagH); // green
  ctx.fillStyle = '#ffffff'; ctx.fillRect(fx+flagW/3, fy, flagW/3, flagH); // white
  ctx.fillStyle = '#FF883E'; ctx.fillRect(fx+2*flagW/3, fy, flagW/3, flagH); // orange
  // small base
  ctx.fillStyle = '#8b8b8b'; ctx.fillRect(x+2, y+poleHLocal, 12, 6);
  ctx.restore();
}
// Draw a black-and-white checkered checkpoint flag
function drawCheckpoint(x,y, activated, poleHParam){
  ctx.save();
  const poleH = poleHParam || TILE*4, flagW = TILE*1.8, flagH = TILE*1.2;
  // pole
  ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x+6, y+poleH); ctx.lineTo(x+6, y); ctx.stroke();
  // checkered flag
  const fx = x+8, fy = y + TILE*0.8;
  const cols=4, rows=3, cw=flagW/cols, rh=flagH/rows;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      ctx.fillStyle = ((r+c)%2===0) ? '#000' : '#fff';
      ctx.fillRect(fx + c*cw, fy + r*rh, cw, rh);
    }
  }
  if (activated){
    ctx.globalAlpha = 0.25; ctx.fillStyle='#ffd400';
    ctx.beginPath(); ctx.arc(x+6, y+poleH-6, 18, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // base
  ctx.fillStyle = '#8b8b8b'; ctx.fillRect(x+1, y+poleH, 10, 6);
  ctx.restore();
}

// Game loop
let last=0;
function loop(ts){
  if (!last) last=ts;
  const dt = Math.min(1/60, (ts-last)/1000);
  last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Update step
function update(dt){
  if (menuEl && !menuEl.classList.contains('hidden')){ return; }
  const p = world.player;
  for (const b of world.blocks){ if (b.bounce>0) b.bounce = Math.max(0, b.bounce - dt*4); }
  if (world.state === 'pause') return;
  if (world.state !== 'win' && world.state !== 'gameover') world.time += dt;
  // Win state: freeze gameplay, animate victory
  if (world.state === 'win'){
    world.winT += dt;
    p.vx = 0; p.vy = 0; // freeze
    trySnapToGround(p);
    // simple victory dance: flip facing back and forth
    p.facing = (Math.sin(world.winT*8) > 0) ? 1 : -1;
    return; // skip gameplay updates
  }
  // Game over: wait for restart
  if (world.state === 'gameover'){
    if (restartRequested || keys.jump){ restartRequested=false; keys.jump=false; resetGame(); }
    return;
  }
  if (p.invuln>0) p.invuln = Math.max(0, p.invuln - dt);

  // Horizontal with dash/run
  const acc = MOVE_ACC * (keys.dash ? 1.5 : 1);
  const max = MOVE_MAX * (keys.dash ? 1.5 : 1);
  if (keys.left) p.vx = Math.max(-max, p.vx - acc*dt);
  if (keys.right) p.vx = Math.min( max, p.vx + acc*dt);
  if (!keys.left && !keys.right){
    if (p.vx>0) p.vx = Math.max(0, p.vx - FRICTION*dt);
    if (p.vx<0) p.vx = Math.min(0, p.vx + FRICTION*dt);
  }
  if (Math.abs(p.vx)<1) p.vx = 0;
  if (keys.left && !keys.right) p.facing = -1; else if (keys.right && !keys.left) p.facing = 1;

  // Gravity + Jump (with coyote + buffer)
  p.vy += GRAVITY*dt;
  if (p.vy>1200) p.vy=1200;
  if (p.grounded) p.coyote = COYOTE_TIME; else p.coyote = Math.max(0, p.coyote - dt);
  if (p.jumpBuffer>0) p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
  // Apply buffered jump when allowed
  if (p.jumpBuffer>0 && (p.grounded || p.coyote>0)){
    p.vy = -JUMP_VEL * (keys.dash ? 1.25 : 1);
    p.grounded = false;
    p.jumpBuffer = 0;
    playBeep(700,0.05,0.07);
  }

  // Integrate with collision
  moveWithCollisions(p, p.vx*dt, 0);
  const prevVy = p.vy;
  const prevBottom = p.bottom;
  moveWithCollisions(p, 0, p.vy*dt);

  // Final ground snap to stop jitter and ensure he rests on platforms
  if (!p.grounded) trySnapToGround(p);

  // Mystery boxes
  if (prevVy < 0){
    for (const b of world.blocks){
      if (b.used) continue;
      if (p.x < b.x + b.w && p.x + p.w > b.x && prevBottom <= b.y + b.h && p.y >= b.y + b.h - 2){
        b.used = true; b.bounce = 1;
        if (b.content && b.content.type==='coins'){
          p.coins += b.content.amount; HUD.coins.textContent = p.coins; playCoin();
        } else if (b.content && b.content.type==='shamrock'){
          growPlayer(p);
        }
      }
    }
  }

  // Collect coins
  for (const c of world.coins){
    if (c.taken) continue;
    if (circleRectOverlap(c.x,c.y,c.r,p.x,p.y,p.w,p.h)){
      c.taken=true; p.coins++; HUD.coins.textContent = p.coins; playCoin();
    }
  }

  // Checkpoint
  if (world.checkpoint && !world.checkpoint.activated && rectOverlap(p.x,p.y,p.w,p.h, world.checkpoint.x, world.checkpoint.y, world.checkpoint.w, world.checkpoint.h)){
    world.checkpoint.activated = true;
    // set current safe position as new respawn
    p.spawnX = p.x; p.spawnY = p.y;
    HUD.msg.textContent = 'Checkpoint!';
    playBeep(520,0.07,0.08);
  }

  // Enemies
  for (const e of world.enemies){
    if (e.remove) continue;
    e.vy += GRAVITY*dt;
    if (e instanceof Hellmonk){
      // AI: patrol -> jump surprise -> charge when close
      if (e.reactCD>0) e.reactCD -= dt;
      let collidedX = moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      const dx = (p.x + p.w/2) - (e.x + e.w/2);
      const dist = Math.abs(dx);
      const dir = Math.sign(dx) || e.facing;
      e.facing = dir;
      if (e.state==='idle'){
        if (e.vx===0) e.vx = -e.speed; // start moving
        // keep from walking off cliffs
        const aheadTx = Math.floor(((e.vx>0? e.right+1: e.left-1))/TILE);
        const footTy = Math.floor((e.bottom+1)/TILE)+1;
        if (!isSolid(tileAt(aheadTx, footTy)) && isSolid(tileAt(Math.floor(e.x/TILE), footTy))) e.vx *= -1;
        if (dist < 160 && e.grounded && e.reactCD<=0){
          e.vy = e.jump; // surprise jump
          e.state = 'chargePrep';
          e.reactCD = 0.8;
        }
      } else if (e.state==='chargePrep'){
        // once falling from jump and near player, start charge
        if (e.vy>0 || !e.grounded){
          e.vx = dir * e.chargeSpeed;
          e.state = 'charge';
        }
      } else if (e.state==='charge'){
        if (collidedX){ e.vx = -e.vx; }
        // stop charging if far away or after leaving ground for too long
        if (dist > 360){ e.state='idle'; e.vx = dir * e.speed; }
      }
      // Player collisions
      if (aabb(p,e)){
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){
          p.vy = -0.6*JUMP_VEL; // bounce off, Hellmonk survives
          // brief recoil for Hellmonk
          e.vx = -dir * Math.max(e.speed, 120);
          e.state = 'idle';
        } else if (p.invuln<=0){
          if (p.big){ shrinkPlayer(p); p.invuln = 1; }
          else {
            p.lives--; HUD.lives.textContent = p.lives;
            if (p.lives<=0){ HUD.msg.textContent="Game Over — press R or Jump to restart"; world.state='gameover'; playBeep(220,0.2,0.12); return; }
            p.respawn();
          }
        }
      }
    } else if (e instanceof Zakko){
      moveWithCollisions(e, 0, e.vy*dt, true);
      if (!e.remove && aabb(p,e)){
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){
          p.vy = -0.55*JUMP_VEL;
          if (!e.knocked){ e.knocked=true; e.h=40; e.y += 40; }
          else e.remove=true;
        } else if (p.invuln<=0){
          if (p.big){ shrinkPlayer(p); p.invuln=1; }
          else { p.lives--; HUD.lives.textContent = p.lives; if (p.lives<=0){ HUD.msg.textContent="Game Over — press R or Jump to restart"; world.state='gameover'; playBeep(220,0.2,0.12); return; } p.respawn(); }
        }
      }
    } else {
      // Goomba behavior
      moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      const aheadTx = Math.floor(((e.vx>0? e.right+1: e.left-1))/TILE);
      const footTy = Math.floor((e.bottom+1)/TILE)+1; // +1 to map world Y -> tile row
      if (!isSolid(tileAt(aheadTx, footTy)) && isSolid(tileAt(Math.floor(e.x/TILE), footTy))) e.vx *= -1;
      if (!e.remove && aabb(p,e)){
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){ e.remove=true; p.vy = -0.55*JUMP_VEL; }
        else if (p.invuln<=0){
          if (p.big){ shrinkPlayer(p); p.invuln = 1; }
          else {
            p.lives--; HUD.lives.textContent = p.lives;
            if (p.lives<=0){ HUD.msg.textContent="Game Over — press R or Jump to restart"; world.state='gameover'; playBeep(220,0.2,0.12); return; }
            p.respawn();
          }
        }
      }
    }
  }
  world.enemies = world.enemies.filter(e=>!e.remove);

  // Goal
  const g = world.goal;
  if (g && rectOverlap(p.x,p.y,p.w,p.h, g.x,g.y,g.w,g.h)){
    if (!g.awarded){
      const poleTop = g.y;
      const poleBottom = g.y + (g.poleH || TILE*5.5);
      const contactY = p.top;
      const frac = Math.max(0, Math.min(1, (poleBottom - contactY) / (poleBottom - poleTop) ));
      const bonus = Math.max(1, Math.min(10, Math.floor(frac*9)+1));
      p.coins += bonus; HUD.coins.textContent = p.coins;
      g.awarded = true;
    }
    world.state = 'win';
    world.winT = 0;
    HUD.msg.textContent = "Level Cleared";
    playBeep(880,0.15,0.1);
  }
  
  // Fell out of world
  if (p.y > (H+2)*TILE){
    p.lives--; HUD.lives.textContent = p.lives;
    if (p.lives<=0){ HUD.msg.textContent="Game Over — press R or Jump to restart"; world.state='gameover'; playBeep(220,0.2,0.12); return; }
    p.respawn();
  }

  // Camera follow
  const targetCam = Math.max(0, p.x - CAM_MARGIN_X);
  world.camX += (targetCam - world.camX)*Math.min(1, 8*dt);
}

// ======= Rendering =======
function draw(){
  const camX = world.camX|0;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawClouds(camX);
  // Disable tile culling entirely for reliability; level is small enough
  for (let y=0;y<H;y++){
    for (let x=0; x<W; x++){
      const c = LEVEL[y][x];
      const sx = x*TILE - camX, sy = (y-1)*TILE;
      if (c==='#') drawGround(sx,sy);
      else if (c==='=') drawBrick(sx,sy);
    }
  }
  for (const b of world.blocks){
    const bx = b.x - camX;
    const by = b.y - b.bounce*10;
    if (b.type==='mystery') drawMysteryBox(bx,by,b.used);
    else drawQBlock(bx,by);
  }
  const t = performance.now()/1000;
  for (const c of world.coins){ if (c.taken) continue; drawCoin(c.x - camX, c.y + Math.sin(t*6 + c.x*0.02)*2, c.r); }
  for (const e of world.enemies){ if (e.remove) continue; if (e instanceof Hellmonk) drawHellmonk(e.x - camX, e.y, e); else if (e instanceof Zakko) drawZakko(e.x - camX, e.y, e); else drawGoomba(e.x - camX, e.y); }
  drawPlayer(world.player.x - camX, world.player.y, world.player);
  if (world.goal) drawGoal(world.goal.x - camX, world.goal.y, world.goal.poleH);
  if (world.checkpoint) drawCheckpoint(world.checkpoint.x - camX, world.checkpoint.y, world.checkpoint.activated, world.checkpoint.poleH);
  if (world.state === 'win') drawVictoryOverlay();
  if (world.state === 'pause') drawPauseOverlay();
}
// time formatter
function formatTime(s){
  const m = Math.floor(s/60); const sec = s - m*60; const mm = ''+m; const ss = sec.toFixed(2).padStart(5,'0');
  return `${mm}:${ss}`;
}
// Draw a centered splash with stats and a small dance animation
function drawVictoryOverlay(){
  const dpr = window.devicePixelRatio||1;
  const w = canvas.width / dpr, h = canvas.height / dpr;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0,0,w,h);
  const boxW = Math.min(480, w*0.85), boxH = 260;
  const x = (w - boxW)/2, y = (h - boxH)/2;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, boxW, boxH, 16); ctx.fill(); ctx.stroke(); }
  else { ctx.fillRect(x, y, boxW, boxH); ctx.strokeRect(x, y, boxW, boxH); }
  ctx.fillStyle = '#0b1b2b';
  ctx.font = 'bold 32px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Level Cleared', w/2, y+44);
  // stats
  ctx.font = '600 18px system-ui';
  const statsY = y+96;
  ctx.fillText(`Coins: ${world.player.coins}`, w/2, statsY);
  ctx.fillText(`Time: ${formatTime(world.time)}`, w/2, statsY+26);
  // simple victory dance: bobbing
  const t = world.winT || 0;
  const bob = Math.sin(t*6) * 6;
  // draw player larger
  ctx.save();
  const scale = 2.2;
  ctx.translate(w/2, y + boxH - 56 + bob);
  ctx.scale(scale, scale);
  drawPlayer(-world.player.w/2, -world.player.h, world.player);
  ctx.restore();
  ctx.restore();
}

function drawPauseOverlay(){
  const dpr = window.devicePixelRatio||1;
  const w = canvas.width / dpr, h = canvas.height / dpr;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0,0,w,h);
  const boxW = Math.min(420, w*0.8), boxH = 120;
  const x = (w - boxW)/2, y = (h - boxH)/2;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, boxW, boxH, 14); ctx.fill(); ctx.stroke(); }
  else { ctx.fillRect(x, y, boxW, boxH); ctx.strokeRect(x, y, boxW, boxH); }
  ctx.fillStyle = '#0b1b2b'; ctx.font='bold 28px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Paused', w/2, y+38);
  ctx.font='600 14px system-ui';
  ctx.fillText('Press P to resume', w/2, y+74);
  ctx.restore();
}

// Draw a Goomba enemy
function drawGoomba(x,y){ ctx.save(); ctx.translate(x,y); ctx.fillStyle='#8b5a2b'; ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(0,2,24,18,6); }
  else { // fallback rounded-rect path for Safari/older browsers
    const ox=0, oy=2, w=24, h=18, r=6;
    ctx.moveTo(ox+r, oy);
    ctx.lineTo(ox+w-r, oy);
    ctx.quadraticCurveTo(ox+w, oy, ox+w, oy+r);
    ctx.lineTo(ox+w, oy+h-r);
    ctx.quadraticCurveTo(ox+w, oy+h, ox+w-r, oy+h);
    ctx.lineTo(ox+r, oy+h);
    ctx.quadraticCurveTo(ox, oy+h, ox, oy+h-r);
    ctx.lineTo(ox, oy+r);
    ctx.quadraticCurveTo(ox, oy, ox+r, oy);
  }
  ctx.fill();
  ctx.fillStyle='#6b3f1b'; ctx.fillRect(2,18,8,6); ctx.fillRect(14,18,8,6); ctx.fillStyle='#000'; ctx.fillRect(6,8,3,4); ctx.fillRect(15,8,3,4); ctx.restore(); }

// Draw a Hellmonk enemy (monkey with yellow helmet)
function drawHellmonk(x,y,e){
  ctx.save(); ctx.translate(x,y);
  // body
  ctx.fillStyle = '#7a4a2a';
  if (ctx.roundRect) { ctx.roundRect(2,6,20,16,6); ctx.fill(); }
  else { ctx.fillRect(2,6,20,16); }
  // legs
  ctx.fillStyle = '#5c361b'; ctx.fillRect(4,20,6,6); ctx.fillRect(14,20,6,6);
  // face
  ctx.fillStyle = '#c89f7a'; ctx.fillRect(6,8,12,10);
  // eyes
  ctx.fillStyle = '#000'; ctx.fillRect(9,11,2,3); ctx.fillRect(15,11,2,3);
  // bright yellow helmet
  ctx.fillStyle = '#ffd400';
  if (ctx.roundRect) { ctx.roundRect(1,2,22,8,4); } else { ctx.fillRect(1,2,22,8); }
  ctx.fill();
  // visor line
  ctx.strokeStyle = '#bfa000'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(2,9.5); ctx.lineTo(22,9.5); ctx.stroke();
  ctx.restore();
}

function drawZakko(x,y,e){
  ctx.save();
  ctx.translate(x,y);
  if (!e.knocked){
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(4,0,12,e.h);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0,e.h-10,20,10);
  } else {
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(0,e.h-20,20,20);
  }
  ctx.restore();
}

// DPI fit
function fitCanvas(){
  const dpr=Math.min(2, devicePixelRatio||1);
  const cssW = canvas.clientWidth || canvas.offsetWidth || (canvas.width/dpr) || 960;
  const cssH = canvas.clientHeight || canvas.offsetHeight || (canvas.height/dpr) || 540;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize', fitCanvas); fitCanvas();

// New: restart and external level loading
function resetGame(){
  world = buildWorld();
  HUD.coins.textContent = 0;
  HUD.lives.textContent = 3;
  HUD.msg.textContent = 'Ready!';
  if (world && world.player) world.player.charId = selectedChar;
}

// Ensure everything is initialized when DOM is ready
document.addEventListener('DOMContentLoaded', async ()=>{
  await discoverLevels();
  // Ensure we select a character and show portrait immediately
  updateCharSelection(selectedChar || 'lucy', false);
  try{
    const resp = await fetch('level1.json');
    if (resp.ok){ const data = await resp.json(); const newLevel = buildLevelFromArrays(data.base||[], data.ext||[]); if (newLevel && newLevel.length){ LEVEL = newLevel; H = LEVEL.length; W = LEVEL[0].length; } }
  }catch{}
  // Show menu by default
  if (menuEl) menuEl.classList.remove('hidden');
});
