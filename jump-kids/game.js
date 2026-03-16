import { buildLevelFromArrays, buildWorld, setLevel, LEVEL, H, W, tileAt, isSolid, groundTopAt, setEnemyConfigs, BASE, EXT } from './entities.js';
import { createSpecialMoves } from './special-moves.js';
import { initInput, keys, setWorld as inputSetWorld, setSpecialMoves, setHUD, unlockAudio, playBeep, consumeReturnToMenu } from './input.js';
import { update as updatePhysics } from './physics.js';
import { initRenderer, draw, fitCanvas, ellipsePath, setBackdrop } from './rendering.js';

const LEVEL_PATH = 'assets/levels/';

// Check if we're running from file:// protocol
const isFileProtocol = window.location.protocol === 'file:';

// Show file mode indicator if running from file system
if (isFileProtocol) {
  const fileModeIndicator = document.getElementById('fileMode');
  if (fileModeIndicator) {
    fileModeIndicator.style.display = 'block';
  }
}

try{
  const r = await fetch('assets/enemies.json', {cache:'no-store'});
  if (r.ok){ const cfg = await r.json(); setEnemyConfigs(cfg); }
}catch{
  if (isFileProtocol) {
    console.log('Running from file system - using default enemy config');
  }
}

// Global variables that will be initialized when DOM is ready
let canvas, ctx, HUD;
let menuEl, worldGrid, levelSelect, levelGrid, levelPrompt, charGrid, charPreview, charPrevCtx, charSelect, startBtn, editorBtn, charPreviewWrap;
let selectedLevelFile = 'level1.json';
let selectedWorld = null;
let selectedChar = 'lucy';
let levelsByWorld = new Map();

const CHARACTERS = [
  { id:'lucy', name:'Lucy', age:8, bio:'Gymnast', colors:{hat:'#c2385f', outfit:'#ff5fa2', hair:'#f2d16b', accent:'#7e1b3a'} },
  { id:'joey', name:'Joey', age:6, bio:'Ninja', colors:{hat:'#111', outfit:'#1f2937', hair:'#e4d18b', accent:'#00bcd4'} },
  { id:'abe',  name:'Abe',  age:3, bio:'Pajamas & Gloves', colors:{hat:'#87cefa', outfit:'#a7e0ff', hair:'#caa36d', accent:'#e63946'} },
  { id:'leo',  name:'Leo',  age:1, bio:'Diaper Champ', colors:{hat:'#f8fafc', outfit:'#ffffff', hair:'#edd9a3', accent:'#ffd166'} },
];

function drawPortrait(id){
  if (!charPrevCtx || !charPreview) {
    return;
  }
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
    if (charPreview) {
      charPreview.style.opacity = '1';
      charPreview.style.display = 'block';
    }
  }
}
function setupCharacterEventListeners(){
  if (charGrid){
    const togglePreview = (show)=>{ if (charPreviewWrap) charPreviewWrap.classList.toggle('visible', !!show); };
    charGrid.addEventListener('mouseover', (e)=>{ const btn = e.target.closest('.char-card'); if (btn){ updateCharSelection(btn.dataset.char, true); } });
    charGrid.addEventListener('focusin', (e)=>{ const btn = e.target.closest('.char-card'); if (btn){ updateCharSelection(btn.dataset.char, true); } });
    charGrid.addEventListener('click', (e)=>{ const btn = e.target.closest('.char-card'); if (btn) updateCharSelection(btn.dataset.char, false); });
    charGrid.addEventListener('mouseout', (e)=>{ if (!charGrid.contains(e.relatedTarget)) togglePreview(false); });
    charGrid.addEventListener('focusout', ()=>{ const anyFocused = !!charGrid.querySelector('.char-card:focus'); if (!anyFocused) togglePreview(false); });
  }
}

// Global variables for world and special moves (initialized later)
let SPECIAL_MOVES, world;

// Level & menu handling ---------------------------------------------------
async function discoverLevels(){
  let entries = null;
  
  // If running from file:// protocol, use fallback data
  if (isFileProtocol) {
    console.log('Running from file system - using default levels');
    const list = [
      {file: 'level1.json', name: '1-1'},
      {file: 'level2.json', name: '1-2'},
      {file: 'level2-1.json', name: '2-1'}
    ];
    setupWorldLevelSelect(list);
    return;
  }
  
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
  setupWorldLevelSelect(list);
}

function setupWorldLevelSelect(list){
  levelsByWorld = new Map();
  list.forEach((ent)=>{
    const match = String(ent.name || '').match(/^(\d+)-/);
    const worldId = match ? match[1] : '1';
    if (!levelsByWorld.has(worldId)) levelsByWorld.set(worldId, []);
    levelsByWorld.get(worldId).push(ent);
  });
  buildWorldGrid([...levelsByWorld.keys()].sort((a,b)=>Number(a)-Number(b)));
  selectedWorld = null;
  buildLevelGrid([]);
  if (levelPrompt) levelPrompt.textContent = 'Choose a world to view levels.';
  if (levelGrid) levelGrid.classList.add('locked');
  levelSelect.innerHTML = '';
  selectedLevelFile = '';
}

function buildWorldGrid(worlds){
  if (!worldGrid) return;
  worldGrid.innerHTML = '';
  worlds.forEach((worldId)=>{
    const tile = document.createElement('button');
    tile.className = 'world-tile';
    tile.textContent = `World ${worldId}`;
    tile.dataset.world = worldId;
    tile.addEventListener('click', ()=>{
      worldGrid.querySelectorAll('.world-tile').forEach(el=> el.classList.remove('active'));
      tile.classList.add('active');
      selectedWorld = worldId;
      buildLevelGrid(levelsByWorld.get(worldId) || []);
      if (levelPrompt) levelPrompt.textContent = `World ${worldId} levels`;
      if (levelGrid) levelGrid.classList.remove('locked');
      playBeep(540,0.06,0.06);
    });
    worldGrid.appendChild(tile);
  });
}

function buildLevelGrid(entries){
  if (!levelGrid) return;
  levelGrid.innerHTML = '';
  levelSelect.innerHTML = '';
  if (!entries.length){
    selectedLevelFile = '';
    return;
  }
  entries.forEach((ent)=>{
    const opt=document.createElement('option');
    opt.value=ent.file;
    opt.textContent=ent.name;
    levelSelect.appendChild(opt);
  });
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
  selectedLevelFile = entries[0].file;
  levelSelect.value = selectedLevelFile;
}
async function startFromMenu(){
  unlockAudio();
  if (!selectedWorld){
    if (levelPrompt) levelPrompt.textContent = 'Select a world first.';
    playBeep(320,0.08,0.08);
    return;
  }
  if (!selectedLevelFile){
    if (levelPrompt) levelPrompt.textContent = `Select a level in World ${selectedWorld}.`;
    playBeep(320,0.08,0.08);
    return;
  }
  const levelFile = selectedLevelFile || levelSelect.value || 'level1.json';
  
  // Try to load from JSON first, fallback to built-in data if that fails
  try{
    const resp = await fetch(LEVEL_PATH + levelFile + '?v=' + Date.now());
    if (resp.ok){
      const data = await resp.json();
      console.log('Loaded level data from JSON:', data);
      console.log('Base array has spikes?', data.base ? data.base.some(row => row.includes('^')) : 'no base data');
      console.log('Ext array has spikes?', data.ext ? data.ext.some(row => row.includes('^')) : 'no ext data');
      setBackdrop(data.backdrop || 'hills');
      const newLevel = buildLevelFromArrays(data.base||[], data.ext||[]);
      console.log('Built level has spikes?', newLevel ? newLevel.some(row => row.includes('^')) : 'no level built');
      if (newLevel && newLevel.length){ 
        setLevel(newLevel); 
        console.log('Level set successfully, checking LEVEL global...');
        // Add a small delay to let the level set properly
        setTimeout(() => {
          console.log('LEVEL global has spikes?', LEVEL ? LEVEL.some(row => row.includes('^')) : 'no LEVEL global');
        }, 100);
        SPECIAL_MOVES = createSpecialMoves({W,H,tileAt,isSolid,groundTopAt}); 
        setSpecialMoves(SPECIAL_MOVES); 
      }
    } else {
      throw new Error('Failed to fetch level file');
    }
  }catch(error){
    // Fallback to built-in level data
    console.log('Failed to load level file:', error, 'using built-in data');
    setBackdrop('hills');
    const newLevel = buildLevelFromArrays(BASE, EXT);
    if (newLevel && newLevel.length){ 
      setLevel(newLevel); 
      SPECIAL_MOVES = createSpecialMoves({W,H,tileAt,isSolid,groundTopAt}); 
      setSpecialMoves(SPECIAL_MOVES); 
    }
  }
  
  resetGame();
  console.log('Game reset complete, world:', world ? 'exists' : 'undefined');
  console.log('World state:', world ? world.state : 'no world');
  world.player.charId = selectedChar;
  world.state = 'play';
  HUD.msg.textContent = 'Reach the flag to finish the demo level';
  menuEl.classList.add('hidden');
  playBeep(700,0.08,0.08);
}
function setupButtonEventListeners(){
  if (startBtn) {
    startBtn.addEventListener('click', startFromMenu);
    startBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); startFromMenu(); });
  }
  if (editorBtn){
    const openEditor = ()=>{ window.location.href = 'level-editor/index.html'; };
    editorBtn.addEventListener('click', openEditor);
    editorBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); openEditor(); });
  }
  document.addEventListener('keydown', (e)=>{ if (menuEl && !menuEl.classList.contains('hidden') && (e.key==='Enter' || e.key===' ')) startFromMenu(); });
}

// Game reset --------------------------------------------------------------
function resetGame(){
  world = buildWorld();
  inputSetWorld(world);
  HUD.coins.textContent = 0;
  HUD.lives.textContent = 3;
  HUD.msg.textContent = 'Ready!';
  if (world && world.player) world.player.charId = selectedChar;
}

// Return to main menu -----------------------------------------------------
function returnToMainMenu(){
  if (world) {
    world.state = 'menu';
  }
  HUD.msg.textContent = 'Select a level and character to play';
  if (menuEl) {
    menuEl.classList.remove('hidden');
  }
  playBeep(520,0.08,0.08);
}

// Main loop ---------------------------------------------------------------
let last=0;
function loop(ts){
  if (!last) last=ts;
  const dt = Math.min(1/60, (ts-last)/1000);
  last = ts;
  
  // Check for return to menu request
  if (consumeReturnToMenu()) {
    returnToMainMenu();
  }
  
  if (!menuEl || menuEl.classList.contains('hidden')){
    if (world) {
      updatePhysics(world, keys, HUD, dt, resetGame, SPECIAL_MOVES);
    }
  }
  
  if (world) {
    draw(world);
  } else {
    console.log('World is undefined in main loop');
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Initial DOM readiness ---------------------------------------------------
async function initMenu(){
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  
  // Additional delay to ensure all elements are available
  await new Promise(resolve => setTimeout(resolve, 100));

  // Initialize DOM elements
  canvas = document.getElementById('game');
  if (!canvas) {
    console.error('Game canvas not found');
    return;
  }
  
  ctx = canvas.getContext('2d');
  initRenderer(canvas, ctx);
  setBackdrop('hills');
  HUD = { coins:document.getElementById('coins'), lives:document.getElementById('lives'), world:document.getElementById('world'), msg:document.getElementById('msg') };
  setHUD(HUD);

  // Menu elements
  menuEl = document.getElementById('menu');
  worldGrid = document.getElementById('worldGrid');
  levelSelect = document.getElementById('levelSelect');
  levelGrid = document.getElementById('levelGrid');
  levelPrompt = document.getElementById('levelPrompt');
  charGrid = document.getElementById('charGrid');
  charPreview = document.getElementById('charPreview');
  charPrevCtx = charPreview ? charPreview.getContext('2d') : null;
  charSelect = document.getElementById('charSelect');
  startBtn = document.getElementById('startBtn');
  editorBtn = document.getElementById('editorBtn');
  charPreviewWrap = document.querySelector('.char-preview-wrap');

  if (!menuEl || !charGrid || !charPreview || !startBtn) {
    console.error('Required menu elements not found');
    return;
  }

  // Show file mode indicator if running from file system
  if (isFileProtocol) {
    const fileModeIndicator = document.getElementById('fileMode');
    if (fileModeIndicator) {
      fileModeIndicator.style.display = 'block';
    }
  }

  // Set up event listeners
  setupCharacterEventListeners();
  setupButtonEventListeners();

  await discoverLevels();
  
  // Initialize level data FIRST - use built-in data if file protocol
  if (isFileProtocol) {
    console.log('Initializing with built-in level data');
    setBackdrop('hills');
    const newLevel = buildLevelFromArrays(BASE, EXT);
    if (newLevel && newLevel.length){
      setLevel(newLevel);
    }
  } else {
    try{
      const resp = await fetch(LEVEL_PATH + 'level1.json');
      if (resp.ok){
        const data = await resp.json();
        const newLevel = buildLevelFromArrays(data.base||[], data.ext||[]);
        if (newLevel && newLevel.length){
          setBackdrop(data.backdrop || 'hills');
          setLevel(newLevel);
        }
      }
    }catch{
      // Fallback to built-in data
      setBackdrop('hills');
      const newLevel = buildLevelFromArrays(BASE, EXT);
      if (newLevel && newLevel.length){
        setLevel(newLevel);
      }
    }
  }

  // NOW initialize world and input system (after level is loaded)
  SPECIAL_MOVES = createSpecialMoves({W,H,tileAt,isSolid,groundTopAt});
  world = buildWorld();
  console.log('Initial world created:', world ? 'success' : 'failed');
  console.log('World player:', world ? world.player : 'no world');
  console.log('World enemies count:', world ? world.enemies.length : 'no world');
  inputSetWorld(world);
  setSpecialMoves(SPECIAL_MOVES);
  initInput();

  HUD.coins.textContent = world.player.coins;
  HUD.lives.textContent = world.player.lives;
  
  // Show menu
  if (menuEl) menuEl.classList.remove('hidden');
  
  // Ensure character preview canvas is properly visible
  if (charPreviewWrap) {
    charPreviewWrap.classList.add('visible');
  }
  if (charPreview) {
    charPreview.style.opacity = '1';
    charPreview.style.display = 'block';
  }
  
  updateCharSelection(selectedChar || 'lucy', false);
}

// Initialize immediately
initMenu();

// Fit canvas to device pixel ratio
addEventListener('resize', fitCanvas); fitCanvas();
