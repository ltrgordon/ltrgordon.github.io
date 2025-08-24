import { JUMP_BUFFER } from './config.js';

// Global key state used by the physics step
export const keys = {left:false,right:false,jump:false,dash:false,up:false,down:false};

let restartRequested = false;
let worldRef = null;
let specialMoves = null;
let hudRef = null;

export function setWorld(w){ worldRef = w; }
export function setSpecialMoves(sm){ specialMoves = sm; }
export function setHUD(h){ hudRef = h; }

// --- Audio handling ------------------------------------------------------
let audioReady = false;
let audioCtx = null;
// Safe SFX container with lazy fallback if files are missing
const SFX = { coin: null };

function tryLoadSfx(){
  // Try a few likely paths; if all fail, we'll fall back to a beep
  const candidates = [
    'assets/audio/collect.wav',
    './assets/audio/collect.wav',
    'assets/sounds/collect.wav',
    '../assets/audio/collect.wav',
    '../assets/sounds/collect.wav'
  ];
  let i = 0;
  const audio = new Audio();
  audio.volume = 0.45;
  const advance = ()=>{
    if (i >= candidates.length){ SFX.coin = null; return; }
    audio.src = candidates[i++];
    // Trigger load; errors will try next candidate
    try { audio.load(); } catch {}
  };
  audio.addEventListener('canplaythrough', ()=>{ SFX.coin = audio; }, { once:true });
  audio.addEventListener('error', ()=>{ advance(); });
  advance();
}

export function unlockAudio(){
  if (audioReady) return; audioReady = true;
  try { 
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if (audioCtx && audioCtx.state === 'suspended'){
      const p = audioCtx.resume(); if (p && typeof p.catch==='function') p.catch(()=>{});
    }
  } catch {}
  // Kick off SFX loading once we have a user gesture
  tryLoadSfx();
}

export function getAudioContext(){ return audioCtx; }

export function playBeep(freq=600, dur=0.08, vol=0.08){
  if (!audioReady || !audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square'; o.frequency.value = freq; g.gain.value = vol;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}

function safePlay(audio){
  if (!audio) return;
  try{
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(()=>{});
  }catch{}
}

export function playCoin(){
  if (!audioReady) return;
  if (SFX.coin){
    safePlay(SFX.coin);
  } else {
    // Fallback to a quick two-beep chime if the asset is missing
    playBeep(1000,0.06,0.08);
    setTimeout(()=>playBeep(1400,0.06,0.06), 70);
  }
}
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
  const ability = specialMoves[p.charId];
  if (!ability) return;
  if (p.charId==='leo' && p.action==='bubble'){
    p.action=null; p.lockControls=false; p.bubbleHold=0; return;
  }
  if (which==='s1' && ability.s1) ability.s1(p, worldRef);
  if (which==='s2' && ability.s2) ability.s2(p, worldRef);
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
    if (k==='p' && worldRef && hudRef){
      if (worldRef.state==='play'){
        worldRef.state='pause';
        hudRef.msg.textContent='Paused — press P to resume';
        playBeep(440,0.06,0.06);
      } else if (worldRef.state==='pause'){
        worldRef.state='play';
        hudRef.msg.textContent='';
        playBeep(520,0.06,0.06);
      }
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
