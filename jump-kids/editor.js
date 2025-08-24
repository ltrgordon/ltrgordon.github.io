import { buildLevelFromArrays } from './entities.js';

const TILE = 32;
let rows = 22, cols = 96, baseWidth = 96;
let grid = [];
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const paletteEl = document.getElementById('palette');
const backdropSel = document.getElementById('backdropSelect');

// Check if we're running from file:// protocol
const isFileProtocol = window.location.protocol === 'file:';

const tiles = [
  {ch:'_', label:'Erase', color:'#eef'},
  {ch:'#', label:'Ground', color:'#8b5a2b'},
  {ch:'=', label:'Platform', color:'#a0522d'},
  {ch:'M', label:'Moving', color:'#555'},
  {ch:'C', label:'Coin', color:'#ffd700'},
  {ch:'R', label:'Shamrock', color:'#00c853'},
  {ch:'N', label:'Rainbow', color:'#00bcd4'},
  {ch:'U', label:'Mega', color:'#d500f9'},
  {ch:'J', label:'Trampoline', color:'#8e24aa'},
  {ch:'V', label:'Giant Sunflower', color:'#ffeb3b'},
  {ch:'E', label:'Goomba', color:'#c0392b'},
  {ch:'H', label:'Hellmonk', color:'#ff9800'},
  {ch:'F', label:'Fire', color:'#e64a19'},
  {ch:'X', label:'Skeleton', color:'#b0bec5'},
  {ch:'W', label:'Sunflower', color:'#ffeb3b'},
  {ch:'D', label:'Butterfly', color:'#ff80ab'},
  {ch:'Q', label:'Kangaroo', color:'#d2b48c'},
  {ch:'K', label:'Checkpoint', color:'#fff'},
  {ch:'G', label:'Goal', color:'#2e7d32'}
];
let currentTile = '#';

function initGrid(r=rows,c=cols){
  rows=r; cols=c;
  grid = Array.from({length:rows},()=>Array(cols).fill('_'));
  canvas.width = cols*TILE;
  canvas.height = rows*TILE;
  draw();
}

function tileColor(ch){
  const t = tiles.find(t=>t.ch===ch);
  return t ? t.color : '#ccc';
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const ch = grid[y][x];
      if(ch !== '_'){
        ctx.fillStyle = tileColor(ch);
        ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
        ctx.fillStyle = '#000';
        ctx.font = '16px system-ui';
        ctx.fillText(ch, x*TILE+8, y*TILE+20);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.strokeRect(x*TILE,y*TILE,TILE,TILE);
    }
  }
}

paletteEl.innerHTML='';
tiles.forEach(t=>{
  const btn=document.createElement('button');
  btn.textContent=t.ch;
  btn.title=t.label;
  btn.style.background=t.color;
  btn.addEventListener('click',()=>{ currentTile=t.ch; });
  paletteEl.appendChild(btn);
});

function place(e){
  const rect=canvas.getBoundingClientRect();
  const x=Math.floor((e.clientX-rect.left)/TILE);
  const y=Math.floor((e.clientY-rect.top)/TILE);
  if(x>=0&&x<cols&&y>=0&&y<rows){
    grid[y][x]=currentTile;
    draw();
  }
}
canvas.addEventListener('mousedown', place);
canvas.addEventListener('mousemove', e=>{ if(e.buttons) place(e); });

const newBtn=document.getElementById('newBtn');
newBtn.onclick=()=>{ initGrid(rows,cols); };

const saveBtn=document.getElementById('saveBtn');
saveBtn.onclick=()=>{
  const base = grid.map(r=>r.slice(0,baseWidth).join(''));
  const ext = grid.map(r=>r.slice(baseWidth).join(''));
  const data = { backdrop: backdropSel.value, base, ext };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='level-custom.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

document.getElementById('backBtn').onclick=()=>{ window.location.href='index.html'; };

async function loadList(){
  const sel=document.getElementById('levelLoad');
  let entries=[];
  
  if (isFileProtocol) {
    // Default levels for file protocol
    entries = [
      {file: 'level1.json', name: '1-1'},
      {file: 'level2.json', name: '1-2'}
    ];
  } else {
    try{ const r=await fetch('assets/levels/levels.json'); if(r.ok){ entries=await r.json(); } }catch{}
  }
  
  sel.innerHTML='';
  entries.forEach(ent=>{ const opt=document.createElement('option'); opt.value=ent.file; opt.textContent=ent.name||ent.file; sel.appendChild(opt); });
}
loadList();

document.getElementById('loadBtn').onclick=async ()=>{
  const file=document.getElementById('levelLoad').value;
  if(!file) return;
  
  if (isFileProtocol) {
    console.log('File protocol detected - level loading limited in editor');
    alert('Level loading is limited when running from file system. Use a local server for full functionality.');
    return;
  }
  
  try{ const r=await fetch('assets/levels/'+file); if(r.ok){ const data=await r.json(); loadLevel(data); backdropSel.value=data.backdrop||'hills'; } }catch{}
};

function loadLevel(data){
  baseWidth = (data.base && data.base[0]) ? data.base[0].length : cols;
  const level = buildLevelFromArrays(data.base||[], data.ext||[]);
  initGrid(level.length, level[0].length);
  for(let y=0;y<level.length;y++){
    for(let x=0;x<level[0].length;x++){
      grid[y][x]=level[y][x];
    }
  }
  draw();
}

initGrid();
