import { TILE, COL } from './config.js';
import { LEVEL, H, W, Hellmonk, Zakko, Ghost, FireEnemy, Bird, Skeleton } from './entities.js';

let canvas, ctx;
let backdrop = 'hills';
export function initRenderer(cvs, context){ canvas=cvs; ctx=context; }
export function setBackdrop(name){ backdrop = name; }

// Ellipse helper usable by other modules
export function ellipsePath(x,y,rx,ry, ctxArg){
  const k = ctxArg || ctx;
  if (typeof k.ellipse === 'function'){
    k.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  } else {
    k.save(); k.translate(x,y); k.scale(rx,ry); k.arc(0,0,1,0,Math.PI*2); k.restore();
  }
}

// Background helpers ------------------------------------------------------
function drawClouds(camX){
  const w = canvas.width / (window.devicePixelRatio||1);
  const h = canvas.height / (window.devicePixelRatio||1);
  const t = performance.now()/1000;
  ctx.save();
  ctx.globalAlpha = 0.6;
  const clouds = 6;
  for (let i=0;i<clouds;i++){
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

function drawHills(camX){
  const w = canvas.width / (window.devicePixelRatio||1);
  ctx.save(); ctx.fillStyle = '#88c070';
  for(let i=0;i<3;i++){
    const x = -camX*0.2 + i*400;
    ctx.beginPath(); ctx.arc(x,280,200,Math.PI,2*Math.PI); ctx.fill();
  }
  ctx.restore();
}

function drawBackdrop(camX){
  if (backdrop === 'hills'){
    drawClouds(camX);
    drawHills(camX);
  } else if (backdrop === 'cave') {
    ctx.fillStyle = '#222';
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }
}

// Tile draw helpers -------------------------------------------------------
function drawGround(x,y){
  ctx.fillStyle = COL.ground; ctx.fillRect(x,y,TILE,TILE);
  ctx.fillStyle = COL.grass; ctx.fillRect(x,y, TILE, 4);
}
function drawBrick(x,y){
  ctx.fillStyle = COL.brick; ctx.fillRect(x,y,TILE,TILE);
  ctx.strokeStyle = '#8a3a20'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let r=8; r<TILE; r+=8){ ctx.moveTo(x, y+r); ctx.lineTo(x+TILE, y+r); }
  ctx.stroke();
}
function drawTrapdoor(x,y){
  drawGround(x,y);
  ctx.fillStyle = '#4a2e13';
  ctx.fillRect(x+4,y+20,TILE-8,8);
}
function drawLadder(x,y){
  ctx.fillStyle = '#b97a56';
  ctx.fillRect(x+6,y,4,TILE);
  ctx.fillRect(x+22,y,4,TILE);
  ctx.fillStyle = '#d9a066';
  ctx.fillRect(x+6,y+8,20,4);
  ctx.fillRect(x+6,y+20,20,4);
}
function drawSpikes(x,y){
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.moveTo(x,y+TILE);
  ctx.lineTo(x+TILE/2,y);
  ctx.lineTo(x+TILE,y+TILE);
  ctx.closePath();
  ctx.fill();
}
function drawQBlock(x,y){
  ctx.fillStyle = '#f2c14e'; ctx.fillRect(x,y,TILE,TILE);
  ctx.strokeStyle = '#b3831a'; ctx.strokeRect(x+0.5,y+0.5,TILE-1,TILE-1);
  ctx.fillStyle = '#7a4c00';
  ctx.font = 'bold 18px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('?', x+TILE/2, y+TILE/2+1);
}
function drawChest(x,y){
  ctx.save();
  ctx.translate(x,y);
  ctx.fillStyle = '#4b2e00';
  ctx.fillRect(4,12,24,16);
  ctx.beginPath();
  ctx.moveTo(4,12); ctx.lineTo(28,12); ctx.lineTo(24,8); ctx.lineTo(8,8); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(8,4,16,8);
  ctx.restore();
}
function drawChestPiece(x,y,w,h,color){
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x,y,w,h);
  ctx.restore();
}
function drawCoin(x,y,r){
  ctx.save();
  ctx.fillStyle = COL.coin; ctx.strokeStyle = '#b38b1a'; ctx.lineWidth=1;
  ctx.beginPath(); ellipsePath(x,y,r*1.0,r*0.9); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawShamrock(x,y){
  ctx.save();
  ctx.translate(x+8,y+8);
  ctx.fillStyle = '#00c853';
  for (let i=0;i<3;i++){
    const ang = i*(Math.PI*2/3);
    const cx = Math.cos(ang)*5;
    const cy = Math.sin(ang)*5;
    ctx.beginPath(); ellipsePath(cx,cy,4,4); ctx.fill();
  }
  ctx.fillRect(-1,4,2,6);
  ctx.restore();
}
function drawRainbow(x,y){
  ctx.save();
  ctx.translate(x+8,y+8);
  const colors=['#ff0000','#ffa500','#ffff00','#00ff00','#0000ff','#4b0082','#ee82ee'];
  for(let i=0;i<colors.length;i++){
    ctx.strokeStyle=colors[i]; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,8-i,0,Math.PI*2); ctx.stroke();
  }
  ctx.restore();
}
function drawMushroom(x,y){
  ctx.save();
  ctx.translate(x+8,y+8);
  ctx.fillStyle='#fff';
  ctx.fillRect(-4,4,8,8);
  const colors=['#ff0000','#ffa500','#ffff00','#00ff00','#0000ff','#4b0082','#ee82ee'];
  for(let i=0;i<colors.length;i++){
    ctx.fillStyle=colors[i];
    ctx.beginPath();
    ctx.moveTo(0,4);
    ctx.arc(0,4,8,Math.PI + i*Math.PI/colors.length, Math.PI + (i+1)*Math.PI/colors.length);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function drawPlatform(x,y,w){
  ctx.save(); ctx.fillStyle='#888'; ctx.fillRect(x,y,w,8); ctx.restore();
}

// Character and entity drawing -------------------------------------------
function drawPlayer(x,y,p){
  ctx.save();
  ctx.translate(x + p.w/2, y + p.h);
  if (p.facing<0) ctx.scale(-1,1);
  ctx.translate(0, -p.h/2);
  if (p.action==='flip') ctx.rotate(p.flip||0);
  ctx.translate(-p.w/2, -p.h/2);
  if (p.rainbow>0){
    const colors=['#ff0000','#ffa500','#ffff00','#00ff00','#0000ff','#4b0082','#ee82ee'];
    for(let i=0;i<colors.length;i++){
      ctx.strokeStyle=colors[i]; ctx.lineWidth=1;
      ctx.strokeRect(-2-i, -2-i, p.w+4+2*i, p.h+4+2*i);
    }
  }
  const id = p.charId || 'lucy';
  if (id==='joey' && p.invisible>0) ctx.globalAlpha = 0.3;

  const t = performance.now()/200;
  const step = Math.sin(t*10 + p.x*0.1)*2;
  const skin = '#ffddbf';
  let suit='#e0502d', accent='#b02020', head='#000';
  switch(id){
    case 'lucy':
      suit='#ff5fa2'; accent='#c2385f'; head='#f2d16b';
      break;
    case 'joey':
      suit='#1f2937'; accent='#00bcd4'; head='#111';
      break;
    case 'abe':
      suit='#a7e0ff'; accent='#e63946'; head='#e76f51';
      break;
    case 'leo':
      suit='#ffffff'; accent='#ffd166'; head=skin;
      break;
  }

  const headR = Math.min(p.w,p.h)*0.4;
  const bodyTop = headR*2;
  const grad = ctx.createLinearGradient(0,bodyTop,0,p.h);
  grad.addColorStop(0,suit);
  grad.addColorStop(1,'#00000033');
  ctx.fillStyle = grad;
  ctx.fillRect(0,bodyTop,p.w,p.h-bodyTop);

  // head
  ctx.fillStyle = skin;
  ctx.beginPath(); ellipsePath(p.w/2, headR, headR, headR); ctx.fill();

  // eyes
  ctx.fillStyle='#000';
  ctx.fillRect(p.w/2-4, headR-1,2,2);
  ctx.fillRect(p.w/2+2, headR-1,2,2);

  // head details
  if(id==='lucy'){
    ctx.fillStyle=head; ctx.fillRect(-2,2,6,8); ctx.fillRect(p.w-4,2,6,8);
    ctx.fillStyle=accent; ctx.fillRect(1,0,p.w-2,4);
  } else if(id==='joey'){
    ctx.fillStyle=head; ctx.fillRect(-1,0,p.w+2,8);
    ctx.fillStyle=accent; ctx.fillRect(0,2,p.w,2);
  } else if(id==='abe'){
    ctx.fillStyle=head; ctx.fillRect(-3,bodyTop+4,6,6); ctx.fillRect(p.w-3,bodyTop+4,6,6);
    ctx.strokeStyle=accent; ctx.lineWidth=1; ctx.strokeRect(-3,bodyTop+4,6,6); ctx.strokeRect(p.w-3,bodyTop+4,6,6);
  } else if(id==='leo'){
    ctx.fillStyle=accent; ctx.fillRect(p.w/2-2, headR+1,4,3);
  } else {
    ctx.fillStyle=accent; ctx.fillRect(1,0,p.w-2,4);
  }

  // arms
  ctx.fillStyle = skin;
  ctx.fillRect(-3,bodyTop+2,6,10);
  ctx.fillRect(p.w-3,bodyTop+2,6,10);

  // legs with simple step animation
  const legY = p.h-8;
  ctx.fillStyle = '#3b3b3b';
  ctx.fillRect(2,legY+step,6,8);
  ctx.fillRect(p.w-8,legY-step,6,8);

  ctx.restore();
}

function drawGoal(x,y,poleH){
  ctx.save();
  const poleHLocal = poleH || TILE*5.5, flagW=TILE*2.5, flagH=TILE*2.0;
  ctx.strokeStyle = '#c0d0e0'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x+8, y+poleHLocal); ctx.lineTo(x+8, y); ctx.stroke();
  const fx = x+10, fy = y + TILE*0.7;
  ctx.fillStyle = '#169B62'; ctx.fillRect(fx, fy, flagW/3, flagH);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(fx+flagW/3, fy, flagW/3, flagH);
  ctx.fillStyle = '#FF883E'; ctx.fillRect(fx+2*flagW/3, fy, flagW/3, flagH);
  ctx.fillStyle = '#8b8b8b'; ctx.fillRect(x+2, y+poleHLocal, 12, 6);
  ctx.restore();
}

function drawCheckpoint(x,y, activated, poleHParam){
  ctx.save();
  const poleH = poleHParam || TILE*4, flagW = TILE*1.8, flagH = TILE*1.2;
  ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x+6, y+poleH); ctx.lineTo(x+6, y); ctx.stroke();
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
  ctx.fillStyle = '#8b8b8b'; ctx.fillRect(x+1, y+poleH, 10, 6);
  ctx.restore();
}

// Enemy drawings ----------------------------------------------------------
function drawGoomba(x,y){
  const t = performance.now()/1000;
  const bob = Math.sin(t*6 + x*0.1)*2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle='#8b5a2b';
  ctx.beginPath(); ellipsePath(12,10,12,10); ctx.fill();
  ctx.fillStyle='#6b3f1b';
  ctx.fillRect(2,18,8,6);
  ctx.fillRect(14,18,8,6);
  ctx.fillStyle='#fff';
  ctx.beginPath(); ellipsePath(8,9,4,4); ctx.fill();
  ctx.beginPath(); ellipsePath(16,9,4,4); ctx.fill();
  ctx.fillStyle='#000';
  ctx.fillRect(7,8,2,3);
  ctx.fillRect(15,8,2,3);
  ctx.fillRect(8,14,8,2);
  ctx.restore();
}

function drawHellmonk(x,y,e){
  const t = performance.now()/1000;
  const bob = Math.sin(t*4 + x*0.05)*2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(2,6,20,16);
  // arms
  ctx.fillRect(-4,8,6,10);
  ctx.fillRect(22,8,6,10);
  // legs
  ctx.fillStyle = '#5c361b';
  ctx.fillRect(4,20,6,6);
  ctx.fillRect(14,20,6,6);
  // face
  ctx.fillStyle = '#c89f7a';
  ctx.fillRect(6,8,12,10);
  ctx.fillStyle = '#000';
  ctx.fillRect(9,11,2,3);
  ctx.fillRect(15,11,2,3);
  // helmet
  ctx.fillStyle = '#ffd400';
  ctx.fillRect(1,2,22,8);
  ctx.strokeStyle = '#bfa000';
  ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(2,9.5); ctx.lineTo(22,9.5); ctx.stroke();
  ctx.restore();
}

function drawZakko(x,y,e){
  const t = performance.now()/1000;
  const sway = Math.sin(t*2 + x*0.05)*2;
  ctx.save();
  ctx.translate(x, y + sway);
  if (!e.knocked){
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(4,40,12,e.h-40);
    // arms
    ctx.fillRect(-6,50,8,20);
    ctx.fillRect(18,50,8,20);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0,e.h-10,20,10);
    ctx.fillStyle = '#ffddbf';
    ctx.fillRect(2,0,16,40);
    ctx.fillStyle = '#000';
    ctx.fillRect(6,12,3,4);
    ctx.fillRect(12,12,3,4);
    ctx.fillStyle = '#b91c1c';
    for (let i=-1;i<=3;i++){ ctx.beginPath(); ctx.arc(10 + i*6, -2 - (i%2)*4, 12, 0, Math.PI*2); ctx.fill(); }
  } else {
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(0,e.h-20,20,20);
  }
  ctx.restore();
}

function drawGhost(x,y){
  const t = performance.now()/1000;
  const bob = Math.sin(t*3 + x*0.1)*2;
  ctx.save();
  ctx.translate(x, y + bob);
  const grd = ctx.createRadialGradient(12,12,4,12,12,12);
  grd.addColorStop(0,'rgba(255,255,255,0.9)');
  grd.addColorStop(1,'rgba(200,200,255,0.8)');
  ctx.fillStyle=grd;
  ctx.beginPath(); ellipsePath(12,12,12,12); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(0,12);
  for(let i=0;i<4;i++){
    ctx.quadraticCurveTo(6*i+3,24 + ((i%2)?2:-2),6*i+6,12);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle='#000';
  ctx.fillRect(6,8,3,4);
  ctx.fillRect(15,8,3,4);
  ctx.restore();
}

function drawFireEnemy(x,y){
  const t = performance.now()/1000;
  const scale = 1 + Math.sin(t*12 + x)*0.1;
  ctx.save();
  ctx.translate(x+10, y+10);
  ctx.scale(scale, scale);
  const grd=ctx.createRadialGradient(0,0,2,0,0,10);
  grd.addColorStop(0,'#fff8');
  grd.addColorStop(0.3,'#ff0');
  grd.addColorStop(1,'#f00');
  ctx.fillStyle=grd;
  ctx.beginPath();
  ctx.moveTo(0,-10);
  ctx.lineTo(10,10);
  ctx.lineTo(-10,10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBird(x,y){
  const t = performance.now()/1000;
  const flap = Math.sin(t*8 + x*0.05)*4;
  ctx.save();
  ctx.translate(x+12, y+10);
  // body
  ctx.fillStyle="#444";
  ctx.beginPath(); ellipsePath(0,0,12,8); ctx.fill();
  // wings
  ctx.save();
  ctx.rotate(-flap*0.1);
  ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-24,-6); ctx.lineTo(-24,6); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.rotate(flap*0.1);
  ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(24,-6); ctx.lineTo(24,6); ctx.closePath(); ctx.fill();
  ctx.restore();
  // beak
  ctx.fillStyle='#f2c14e';
  ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(18,2); ctx.lineTo(12,4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawSkeleton(x,y,e){
  const t = performance.now()/1000;
  const bob = Math.sin(t*4 + x*0.05)*2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = '#ddd';
  if (e.state==='crumbled'){
    ctx.fillRect(0,e.h-6,24,6);
  } else {
    ctx.fillRect(4,0,16,24);
    ctx.fillRect(0,24,24,6);
    ctx.fillStyle = '#bbb';
    for(let i=6;i<20;i+=4){ ctx.fillRect(6,i,12,2); }
    ctx.fillStyle = '#000';
    ctx.fillRect(8,8,3,3);
    ctx.fillRect(13,8,3,3);
  }
  ctx.restore();
}

// HUD overlays ------------------------------------------------------------
function formatTime(s){
  const m = Math.floor(s/60); const sec = s - m*60; const mm = ''+m; const ss = sec.toFixed(2).padStart(5,'0');
  return `${mm}:${ss}`;
}
function drawVictoryOverlay(world){
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
  ctx.font = '600 18px system-ui';
  const statsY = y+96;
  ctx.fillText(`Coins: ${world.player.coins}`, w/2, statsY);
  ctx.fillText(`Time: ${formatTime(world.time)}`, w/2, statsY+26);
  const t = world.winT || 0;
  const bob = Math.sin(t*6) * 6;
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

// Main draw ---------------------------------------------------------------
export function draw(world){
  const camX = world.camX|0;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBackdrop(camX);
  for (let y=0;y<H;y++){
    for (let x=0; x<W; x++){
      const c = LEVEL[y][x];
      const sx = x*TILE - camX, sy = (y-1)*TILE;
      if (c==='#') drawGround(sx,sy);
      else if (c==='=') drawBrick(sx,sy);
      else if (c==='T') drawTrapdoor(sx,sy);
      else if (c==='L') drawLadder(sx,sy);
      else if (c==='^') drawSpikes(sx,sy);
    }
  }
  for (const m of world.platforms){ drawPlatform(m.x - camX, m.y, m.w); }
  for (const b of world.blocks){ const bx = b.x - camX; const by = b.y - b.bounce*10; drawQBlock(bx,by); }
  for (const ch of world.chests){ drawChest(ch.x - camX, ch.y); }
  for (const burst of world.chestBursts){ for (const pc of burst.pieces){ drawChestPiece(pc.x - camX, pc.y, pc.w, pc.h, pc.color); } }
  const t = performance.now()/1000;
  for (const c of world.coins){ if (c.taken) continue; drawCoin(c.x - camX, c.y + Math.sin(t*6 + c.x*0.02)*2, c.r); }
  for (const pc of world.popCoins){ drawCoin(pc.x - camX, pc.y, 7); }
  for (const it of world.items){
    if (it.type==='shamrock') drawShamrock(it.x - camX, it.y);
    else if (it.type==='coin') drawCoin(it.x - camX + 8, it.y + 8, 7);
    else if (it.type==='rainbow') drawRainbow(it.x - camX, it.y);
    else if (it.type==='mushroom') drawMushroom(it.x - camX, it.y);
  }
  for (const e of world.enemies){
    if (e.remove) continue;
    if (e instanceof Hellmonk) drawHellmonk(e.x - camX, e.y, e);
    else if (e instanceof Zakko) drawZakko(e.x - camX, e.y, e);
    else if (e instanceof Ghost) drawGhost(e.x - camX, e.y);
    else if (e instanceof FireEnemy) drawFireEnemy(e.x - camX, e.y);
    else if (e instanceof Bird) drawBird(e.x - camX, e.y);
    else if (e instanceof Skeleton) drawSkeleton(e.x - camX, e.y, e);
    else drawGoomba(e.x - camX, e.y);
  }
  drawPlayer(world.player.x - camX, world.player.y, world.player);
  if (world.goal) drawGoal(world.goal.x - camX, world.goal.y, world.goal.poleH);
  if (world.checkpoint) drawCheckpoint(world.checkpoint.x - camX, world.checkpoint.y, world.checkpoint.activated, world.checkpoint.poleH);
  if (world.state === 'win') drawVictoryOverlay(world);
  if (world.state === 'pause') drawPauseOverlay();
}

// Canvas DPI fitting ------------------------------------------------------
export function fitCanvas(){
  const dpr=Math.min(2, devicePixelRatio||1);
  const cssW = canvas.clientWidth || canvas.offsetWidth || (canvas.width/dpr) || 960;
  const cssH = canvas.clientHeight || canvas.offsetHeight || (canvas.height/dpr) || 540;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
