import { buildLevelFromArrays, buildWorld, setLevel, LEVEL, H, W, tileAt, isSolid, groundTopAt, setEnemyConfigs, BASE, EXT } from './entities.js';
import { createSpecialMoves } from './special-moves.js';
import { initInput, keys, setWorld as inputSetWorld, setSpecialMoves, setHUD, unlockAudio, playBeep } from './input.js';
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
let menuEl, levelSelect, levelGrid, charGrid, charPreview, charPrevCtx, charSelect, startBtn, editorBtn, charPreviewWrap;
let pauseMenuEl; // new: pause menu element
let menuSource = null; // 'pause_char' | 'pause_level' | null
let selectedLevelFile = 'level1.json';
let selectedChar = 'lucy';

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
    charGrid.addEventListener('click', (e)=>{ const btn = e.target.closest('.char-card'); if (btn) {
      updateCharSelection(btn.dataset.char, false);
      // If user opened character select from pause menu, apply and restart immediately
      if (menuSource === 'pause_char'){
        menuSource = null;
        startFromMenu();
      }
    } });
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
      {file: 'level2.json', name: '1-2'}
    ];
    levelSelect.innerHTML = '';
    for (const ent of list){ 
      const opt=document.createElement('option'); 
      opt.value=ent.file; 
      opt.textContent=ent.name; 
      levelSelect.appendChild(opt); 
    }
    buildLevelGrid(list);
    selectedLevelFile = 'level1.json';
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
      // If user came from pause -> level select, start the selected level immediately
      if (menuSource === 'pause_level'){
        menuSource = null;
        startFromMenu();
      }
    });
    levelGrid.appendChild(tile);
  });
}
async function startFromMenu(){
  unlockAudio();
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
    const openEditor = ()=>{ window.location.href = 'editor.html'; };
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

// Main loop ---------------------------------------------------------------
let last=0;
function loop(ts){
  if (!last) last=ts;
  const dt = Math.min(1/60, (ts-last)/1000);
  last = ts;

  const isMainMenuOpen = !!(menuEl && !menuEl.classList.contains('hidden'));
  const isPauseMenuOpen = !!(pauseMenuEl && !pauseMenuEl.classList.contains('hidden'));

  if (!isMainMenuOpen && !isPauseMenuOpen){
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
  levelSelect = document.getElementById('levelSelect');
  levelGrid = document.getElementById('levelGrid');
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

  // Create pause menu overlay dynamically
  pauseMenuEl = document.createElement('div');
  pauseMenuEl.id = 'pauseMenu';
  pauseMenuEl.setAttribute('role','dialog');
  pauseMenuEl.setAttribute('aria-modal','true');
  pauseMenuEl.className = 'hidden';
  pauseMenuEl.style.position = 'fixed';
  pauseMenuEl.style.top = '0';
  pauseMenuEl.style.left = '0';
  pauseMenuEl.style.right = '0';
  pauseMenuEl.style.bottom = '0';
  pauseMenuEl.style.display = 'none'; // start hidden (none instead of flex)
  pauseMenuEl.style.alignItems = 'center';
  pauseMenuEl.style.justifyContent = 'center';
  pauseMenuEl.style.zIndex = '1000';

  const card = document.createElement('div');
  card.className = 'menu-card';
  card.style.minWidth = '320px';
  card.style.textAlign = 'center';

  const title = document.createElement('h2');
  title.className = 'menu-title arcade';
  title.textContent = 'Paused';
  card.appendChild(title);

  const btnList = document.createElement('div');
  btnList.style.display = 'grid';
  btnList.style.rowGap = '10px';
  btnList.style.marginTop = '10px';

  const makeBtn = (id, text)=>{
    const b = document.createElement('button'); b.id = id; b.className = 'menu-start'; b.textContent = text; b.style.margin = '6px auto'; b.style.minWidth = '200px'; return b;
  };

  const returnGameBtn = makeBtn('pause_return', 'Return to Game');
  const charSelectBtn = makeBtn('pause_char', 'Character Select');
  const levelSelectBtn = makeBtn('pause_level', 'Level Select');
  const mainMenuBtn = makeBtn('pause_main', 'Return to Main Menu');

  btnList.appendChild(returnGameBtn);
  btnList.appendChild(charSelectBtn);
  btnList.appendChild(levelSelectBtn);
  btnList.appendChild(mainMenuBtn);
  card.appendChild(btnList);
  pauseMenuEl.appendChild(card);
  document.body.appendChild(pauseMenuEl);

  // Pause menu button behavior
  const openPauseMenu = ()=>{
    // Only allow pause if currently playing a level and main menu is closed
    if (!world || !menuEl || !pauseMenuEl) return;
    if (!menuEl.classList.contains('hidden')) return; // main menu open
    if (world.state !== 'play') return; // only when playing

    pauseMenuEl.style.display = 'flex';
    pauseMenuEl.classList.remove('hidden');
    if (HUD && HUD.msg) HUD.msg.textContent = 'Paused';
    try{ world.state = 'pause'; }catch{}
  };
  const closePauseMenu = ()=>{
    if (!pauseMenuEl) return;
    pauseMenuEl.style.display = 'none';
    pauseMenuEl.classList.add('hidden');
    if (HUD && HUD.msg) HUD.msg.textContent = 'Reach the flag to finish the demo level';
    try{ world.state = 'play'; }catch{}
  };

  returnGameBtn.addEventListener('click', ()=>{ closePauseMenu(); playBeep(800,0.06,0.06); });
  charSelectBtn.addEventListener('click', ()=>{ 
    // Open main menu focused on character selection and auto-restart on select
    menuSource = 'pause_char';
    if (menuEl) menuEl.classList.remove('hidden');
    if (pauseMenuEl) { pauseMenuEl.style.display = 'none'; pauseMenuEl.classList.add('hidden'); }
    playBeep(700,0.06,0.06);
  });
  levelSelectBtn.addEventListener('click', ()=>{
    // Open main menu focused on level selection; selecting a level will auto-start
    menuSource = 'pause_level';
    if (menuEl) menuEl.classList.remove('hidden');
    if (pauseMenuEl) { pauseMenuEl.style.display = 'none'; pauseMenuEl.classList.add('hidden'); }
    playBeep(700,0.06,0.06);
  });
  mainMenuBtn.addEventListener('click', ()=>{
    menuSource = null;
    if (menuEl) menuEl.classList.remove('hidden');
    if (pauseMenuEl) { pauseMenuEl.style.display = 'none'; pauseMenuEl.classList.add('hidden'); }
    playBeep(650,0.06,0.06);
  });

  // Escape key toggles pause menu (only when playing a level and main menu closed)
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape'){
      if (!pauseMenuEl || !menuEl) return;
      // If main menu is open, ignore Esc here
      if (!menuEl.classList.contains('hidden')) return;
      // Only allow pausing when the world exists and is in 'play'
      if (!world || world.state !== 'play') return;

      if (pauseMenuEl.style.display === 'none' || pauseMenuEl.classList.contains('hidden')){
        openPauseMenu();
      } else {
        closePauseMenu();
      }
    }
  });

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
