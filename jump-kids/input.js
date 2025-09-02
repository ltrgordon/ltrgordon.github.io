import { JUMP_BUFFER } from './config.js';

// Global key state used by the physics step
export const keys = {left:false,right:false,jump:false,dash:false,up:false,down:false};

let restartRequested = false;
let returnToMenuRequested = false;
let worldRef = null;
let specialMoves = null;
let hudRef = null;

export function setWorld(w){ worldRef = w; }
export function setSpecialMoves(sm){ specialMoves = sm; }
export function setHUD(h){ hudRef = h; }

// --- Audio handling ------------------------------------------------------
let audioReady = false;
let audioCtx = null;
const SFX = { coin: new Audio('../assets/sounds/collect.wav') };
SFX.coin.volume = 0.45;

export function unlockAudio(){
  if (audioReady) return; audioReady = true;
  try { audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } catch {}
}

export function playBeep(freq=600, dur=0.08, vol=0.08){
  if (!audioReady || !audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square'; o.frequency.value = freq; g.gain.value = vol;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}

export function playCoin(){ if (!audioReady) return; try{ SFX.coin.currentTime=0; SFX.coin.play(); }catch{} }
export function playShamrock(){
  if (!audioReady) return;
  playBeep(520,0.1,0.1);
  setTimeout(()=>playBeep(760,0.12,0.1),100);
}

// --- Input handling ------------------------------------------------------
function setKey(k,val){ keys[k]=val; }
function bufferJump(){
  if (!worldRef || !worldRef.player) return;
  worldRef.player.jumpBuffer = Math.max(worldRef.player.jumpBuffer, JUMP_BUFFER);
}
function triggerSpecial(which){
  if (!worldRef || !worldRef.player || !specialMoves) return;
  const p = worldRef.player;
  if (p.cooldowns && p.cooldowns[which]>0) return;
  const ability = specialMoves[p.charId];
  if (!ability) return;
  if (p.charId==='leo' && p.action==='bubble'){
    p.action=null; p.lockControls=false; p.bubbleHold=0; return;
  }
  let res = false;
  if (which==='s1' && ability.s1) res = ability.s1(p, worldRef);
  if (which==='s2' && ability.s2) res = ability.s2(p, worldRef);
  if (which==='s3' && ability.s3) res = ability.s3(p, worldRef);
  if (which==='s4' && ability.s4) res = ability.s4(p, worldRef);
  if (res){
    p.cooldowns[which] = p.cooldownDurations[which];
    if (hudRef && hudRef.cooldowns){
      const el = hudRef.cooldowns.querySelector('.hourglass.'+which);
      if (el){
        el.style.display='block';
        const fill = el.querySelector('.fill');
        if (fill) fill.style.height='100%';
      }
    }
  }
}

export function initInput(){
  addEventListener('keydown', e=>{ const k=e.key.toLowerCase(); unlockAudio();
    if (k==='arrowleft'||k==='a') setKey('left',true);
    if (k==='arrowright') setKey('right',true);
    if (k==='d') setKey('dash',true);
    if (k===' '||k==='z'){ setKey('jump',true); bufferJump(); }
    if (k==='arrowup'||k==='w') setKey('up',true);
    if (k==='arrowdown') setKey('down',true);
    if (k==='s') triggerSpecial('s1');
    if (k==='f') triggerSpecial('s2');
    if (k==='e') triggerSpecial('s3');
    if (k==='c') triggerSpecial('s4');
    if (k==='p' && worldRef && hudRef){
      if (worldRef.state==='play'){
        worldRef.state='pause';
        hudRef.msg.textContent='Paused — press P to resume, ESC for menu';
        playBeep(440,0.06,0.06);
      } else if (worldRef.state==='pause'){
        worldRef.state='play';
        hudRef.msg.textContent='';
        playBeep(520,0.06,0.06);
      }
    }
    if (k==='escape' && worldRef && worldRef.state==='pause'){
      // Request return to main menu
      returnToMenuRequested = true;
      playBeep(380,0.08,0.08);
    }
    if (k==='r'){ restartRequested = true; }
  });
  addEventListener('keyup', e=>{ const k=e.key.toLowerCase();
    if (k==='arrowleft'||k==='a') setKey('left',false);
    if (k==='arrowright') setKey('right',false);
    if (k==='d') setKey('dash',false);
    if (k===' '||k==='z') setKey('jump',false);
    if (k==='arrowup'||k==='w') setKey('up',false);
    if (k==='arrowdown') setKey('down',false);
  });
  const bindAll = ()=>{
    bindButton('left','left');
    bindButton('right','right');
    bindButton('jump','jump');
    bindButton('dash','dash');
  };
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindAll);
  } else {
    bindAll();
  }
}

function bindButton(id, name){
  const el=document.getElementById(id);
  if (!el) { console.warn(`Button element with id "${id}" not found`); return; }
  const start=(ev)=>{ ev.preventDefault(); unlockAudio(); setKey(name,true); if (name==='jump') bufferJump(); };
  const end=()=> setKey(name,false);
  ['touchstart','mousedown'].forEach(ev=> el.addEventListener(ev,start,{passive:false}));
  ['touchend','touchcancel','mouseup','mouseleave'].forEach(ev=> el.addEventListener(ev,end));
}

// Exposed helper for physics to consume restart requests
export function consumeRestart(){ const r = restartRequested; restartRequested = false; return r; }

// Exposed helper for game to consume return to menu requests
export function consumeReturnToMenu(){ const r = returnToMenuRequested; returnToMenuRequested = false; return r; }
