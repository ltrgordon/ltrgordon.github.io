import { buildLevelFromArrays, buildWorld, setLevel, LEVEL, H, W, tileAt, isSolid, groundTopAt, setEnemyConfigs } from './entities.js';
import { createSpecialMoves } from './special-moves.js';
import { initInput, keys, setWorld as inputSetWorld, setSpecialMoves, setHUD, unlockAudio, playBeep } from './input.js';
import { update as updatePhysics } from './physics.js';
import { initRenderer, draw, fitCanvas, ellipsePath } from './rendering.js';

const LEVEL_PATH = 'assets/levels/';

try{
  const r = await fetch('assets/enemies.json', {cache:'no-store'});
  if (r.ok){ const cfg = await r.json(); setEnemyConfigs(cfg); }
}catch{}

// Canvas and HUD setup ----------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
initRenderer(canvas, ctx);
const HUD = { coins:document.getElementById('coins'), lives:document.getElementById('lives'), world:document.getElementById('world'), msg:document.getElementById('msg') };
setHUD(HUD);

// Menu elements -----------------------------------------------------------
const menuEl = document.getElementById('menu');
const levelSelect = document.getElementById('levelSelect');
const levelGrid = document.getElementById('levelGrid');
const charGrid = document.getElementById('charGrid');
const charPreview = document.getElementById('charPreview');
const charPrevCtx = charPreview ? charPreview.getContext('2d') : null;
const charSelect = document.getElementById('charSelect');
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

function drawPortrait(id){
  if (!charPrevCtx || !charPreview) return;
  const W = charPreview.width, H = charPreview.height;
  charPrevCtx.clearRect(0,0,W,H);
  const cdef = CHARACTERS.find(c=>c.id===id) || CHARACTERS[0];
  const c = charPrevCtx;
  c.save();
  const grad = c.createRadialGradient(W/2,H/2,20, W/2,H/2, Math.max(W,H)/2);
  grad.addColorStop(0,'#ffffff'); grad.addColorStop(1,'#e6f2ff');
  c.fillStyle = grad; c.fillRect(0,0,W,H);
  c.fillStyle = 'rgba(0,0,0,0.08)'; c.beginPath(); ellipsePath(W/2, H-32, 120, 18, c); c.fill();
  c.translate(W/2, H/2 + 20);
  c.scale(3.2, 3.2);
  c.fillStyle = cdef.colors.outfit; c.fillRect(-8,-10,16,18);
  c.fillStyle = '#ffddbf'; c.fillRect(-10,-24,20,14);
  c.fillStyle = '#000'; c.fillRect(-4,-20,2,3); c.fillRect(2,-20,2,3);
  c.fillStyle = '#3b3b3b'; c.fillRect(-8,8,6,6); c.fillRect(2,8,6,6);
  switch(cdef.id){
    case 'lucy':
      c.fillStyle = cdef.colors.hair; c.fillRect(-12,-24,6,14); c.fillRect(6,-24,6,14);
      c.fillStyle = cdef.colors.hat; c.fillRect(-9,-28,18,6);
      break;
    case 'joey':
      c.fillStyle = cdef.colors.hat; c.fillRect(-11,-26,22,10);
      c.fillStyle = cdef.colors.accent; c.fillRect(-10,-22,20,3);
      c.fillRect(10,-22,6,3); c.fillRect(10,-19,4,3);
      break;
    case 'abe':
      c.fillStyle = cdef.colors.accent; c.fillRect(-14,-2,6,6); c.fillRect(8,-2,6,6);
      c.strokeStyle = '#e76f51'; c.lineWidth=1; c.strokeRect(-14,-2,6,6); c.strokeRect(8,-2,6,6);
      break;
    case 'leo':
      c.fillStyle = '#fff'; c.fillRect(-8,2,16,6);
      c.strokeStyle='#e5e7eb'; c.strokeRect(-8,2,16,6);
      c.fillStyle = cdef.colors.accent; c.beginPath(); c.arc(0,-14,3,0,Math.PI*2); c.fill();
      break;
  }
  c.restore();
}

function updateCharSelection(id, previewOnly=false){
  if (!id) return;
  if (!previewOnly) selectedChar = id;
  if (charGrid){
    const cards = charGrid.querySelectorAll('.char-card');
    cards.forEach(btn=> btn.setAttribute('aria-selected', String(btn.dataset.char===selectedChar)));
  }
  drawPortrait(id);
  if (charPreviewWrap){
    charPreviewWrap.classList.add('visible');
    if (charPreview) charPreview.style.opacity = '1';
  }
}
if (charGrid){
  const togglePreview = (show)=>{ if (charPreviewWrap) charPreviewWrap.classList.toggle('visible', !!show); };
  charGrid.addEventListener('mouseover', (e)=>{ const btn = e.target.closest('.char-card'); if (btn){ updateCharSelection(btn.dataset.char, true); } });
  charGrid.addEventListener('focusin', (e)=>{ const btn = e.target.closest('.char-card'); if (btn){ updateCharSelection(btn.dataset.char, true); } });
  charGrid.addEventListener('click', (e)=>{ const btn = e.target.closest('.char-card'); if (btn) updateCharSelection(btn.dataset.char, false); });
  charGrid.addEventListener('mouseout', (e)=>{ if (!charGrid.contains(e.relatedTarget)) togglePreview(false); });
  charGrid.addEventListener('focusout', ()=>{ const anyFocused = !!charGrid.querySelector('.char-card:focus'); if (!anyFocused) togglePreview(false); });
}

// World and input initialization -----------------------------------------
let SPECIAL_MOVES = createSpecialMoves({W,H,tileAt,isSolid,groundTopAt});
let world = buildWorld();
inputSetWorld(world);
setSpecialMoves(SPECIAL_MOVES);
initInput();

HUD.coins.textContent = world.player.coins;
HUD.lives.textContent = world.player.lives;

// Level & menu handling ---------------------------------------------------
async function discoverLevels(){
  let entries = null;
  try{
    const r = await fetch(LEVEL_PATH + 'levels.json', {cache:'no-store'});
    if (r.ok){ entries = await r.json(); }
  }catch{}
  let list = [];
  if (Array.isArray(entries) && entries.length){
    list = entries.filter(e=>e && e.file).map(e=> ({file:e.file, name: e.name || e.file.replace(/\.json$/,'')}));
    levelSelect.innerHTML = '';
    for (const ent of list){ const opt=document.createElement('option'); opt.value=ent.file; opt.textContent=ent.name; levelSelect.appendChild(opt); }
  } else {
    const candidates = ['level1.json','level-1-1.json','level-1.json'];
    const found = [];
    for (const name of candidates){ try{ const r = await fetch(LEVEL_PATH + name, {cache:'no-store'}); if (r.ok){ found.push(name); } }catch{} }
    if (!found.includes('level1.json')) found.unshift('level1.json');
    list = [...new Set(found)].map(f=> ({file:f, name: (f.replace(/\.json$/,'').replace(/level[-_]?/i,'') || '1-1')}));
    levelSelect.innerHTML = '';
    for (const ent of list){ const opt=document.createElement('option'); opt.value=ent.file; opt.textContent=ent.name; levelSelect.appendChild(opt); }
  }
  buildLevelGrid(list);
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
      levelGrid.querySelectorAll('.level-tile').forEach(el=> el.classList.remove('active'));
      tile.classList.add('active');
      selectedLevelFile = ent.file;
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
    const resp = await fetch(LEVEL_PATH + levelFile);
    if (resp.ok){
      const data = await resp.json();
      const newLevel = buildLevelFromArrays(data.base||[], data.ext||[]);
      if (newLevel && newLevel.length){ setLevel(newLevel); SPECIAL_MOVES = createSpecialMoves({W,H,tileAt,isSolid,groundTopAt}); setSpecialMoves(SPECIAL_MOVES); }
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
startBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); startFromMenu(); });
document.addEventListener('keydown', (e)=>{ if (menuEl && !menuEl.classList.contains('hidden') && (e.key==='Enter' || e.key===' ')) startFromMenu(); });

// Game reset --------------------------------------------------------------
function resetGame(){
  world = buildWorld();
  inputSetWorld(world);
  HUD.coins.textContent = 0;
  HUD.lives.textContent = 3;
  HUD.msg.textContent = 'Ready!';
  if (world && world.player) world.player.charId = selectedChar;
}

// Main loop ---------------------------------------------------------------
let last=0;
function loop(ts){
  if (!last) last=ts;
  const dt = Math.min(1/60, (ts-last)/1000);
  last = ts;
  if (!menuEl || menuEl.classList.contains('hidden')){
    updatePhysics(world, keys, HUD, dt, resetGame, SPECIAL_MOVES);
  }
  draw(world);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Initial DOM readiness ---------------------------------------------------
document.addEventListener('DOMContentLoaded', async ()=>{
  await discoverLevels();
  updateCharSelection(selectedChar || 'lucy', false);
  try{
    const resp = await fetch(LEVEL_PATH + 'level1.json');
    if (resp.ok){ const data = await resp.json(); const newLevel = buildLevelFromArrays(data.base||[], data.ext||[]); if (newLevel && newLevel.length){ setLevel(newLevel); SPECIAL_MOVES = createSpecialMoves({W,H,tileAt,isSolid,groundTopAt}); setSpecialMoves(SPECIAL_MOVES); } }
  }catch{}
  if (menuEl) menuEl.classList.remove('hidden');
});

// Fit canvas to device pixel ratio
addEventListener('resize', fitCanvas); fitCanvas();
