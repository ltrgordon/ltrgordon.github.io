const tileSize = 32;
let cols = 20;
let rows = 15;
let levelName = '';

const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');

let tiles = createEmptyTiles();
let features = [];
let enemies = [];
let goals = [];

const tileTypes = [
  {id:1,name:'ground',color:'#8B4513'},
  {id:2,name:'grass',color:'#228B22'},
  {id:3,name:'rock',color:'#A9A9A9'},
  {id:4,name:'brick',color:'#B22222'}
];
const featureTypes = [
  {id:'platform',name:'Moving Platform',symbol:'='},
  {id:'ladder',name:'Ladder',symbol:'#'},
  {id:'spikes',name:'Spikes',symbol:'^'}
];
const enemyTypes = [
  {id:'slime',name:'Slime',symbol:'👾'},
  {id:'bat',name:'Bat',symbol:'🦇'},
  {id:'crab',name:'Crab',symbol:'🦀'}
];
const goalTypes = [
  {id:'flag',name:'Flag',symbol:'🚩'},
  {id:'spawn',name:'Spawn',symbol:'⭐'},
  {id:'door',name:'Door',symbol:'🚪'}
];

let currentTool = {category:'tile', id:1};

function createEmptyTiles(){
  return Array.from({length:rows}, ()=>Array(cols).fill(0));
}

function draw(){
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const t = tiles[y][x];
      if(t){
        const tile = tileTypes.find(tt=>tt.id===t);
        ctx.fillStyle = tile ? tile.color : '#000';
        ctx.fillRect(x*tileSize,y*tileSize,tileSize,tileSize);
      }
      ctx.strokeStyle = '#ccc';
      ctx.strokeRect(x*tileSize,y*tileSize,tileSize,tileSize);
    }
  }
  drawEntities(features, featureTypes);
  drawEntities(enemies, enemyTypes);
  drawEntities(goals, goalTypes);
}

function drawEntities(list, types){
  for(const ent of list){
    const def = types.find(t=>t.id===ent.type);
    if(def){
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, ent.x*tileSize + tileSize/2, ent.y*tileSize + tileSize/2);
    }
  }
}

draw();

canvas.addEventListener('click', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left)/tileSize);
  const y = Math.floor((e.clientY - rect.top)/tileSize);
  if(x<0||x>=cols||y<0||y>=rows) return;
  if(currentTool.category==='tile'){
    tiles[y][x] = currentTool.id;
  }else if(currentTool.category==='feature'){
    features.push({type:currentTool.id,x,y});
  }else if(currentTool.category==='enemy'){
    enemies.push({type:currentTool.id,x,y});
  }else if(currentTool.category==='goal'){
    goals.push({type:currentTool.id,x,y});
  }
  draw();
});

// Palette and tabs
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    buildPalette(btn.dataset.tab);
  });
});

function buildPalette(tab){
  const pal = document.getElementById('palette');
  pal.innerHTML = '';
  let list = [];
  if(tab==='base'){list=tileTypes;}
  else if(tab==='features'){list=featureTypes;}
  else if(tab==='enemies'){list=enemyTypes;}
  else if(tab==='goals'){list=goalTypes;}
  list.forEach(item=>{
    const div = document.createElement('div');
    div.className='item';
    div.title=item.name;
    if(tab==='base'){
      div.style.background=item.color;
    }else{
      div.textContent=item.symbol;
    }
    div.addEventListener('click',()=>{
      pal.querySelectorAll('.item').forEach(i=>i.classList.remove('selected'));
      div.classList.add('selected');
      currentTool = {category:mapCategory(tab), id:item.id};
    });
    pal.appendChild(div);
  });
  const first = pal.querySelector('.item');
  if(first){ first.click(); }
}

function mapCategory(tab){
  if(tab==='base') return 'tile';
  if(tab==='features') return 'feature';
  if(tab==='enemies') return 'enemy';
  if(tab==='goals') return 'goal';
}

buildPalette('base');

// Buttons
const newBtn = document.getElementById('newLevel');
const loadBtn = document.getElementById('loadLevel');
const saveBtn = document.getElementById('saveLevel');
const fileInput = document.getElementById('fileInput');
const levelNameDiv = document.getElementById('levelName');

newBtn.addEventListener('click',()=>{
  const name = prompt('Level name?');
  if(!name) return;
  levelName = name;
  tiles = createEmptyTiles();
  features = [];
  enemies = [];
  goals = [];
  draw();
  levelNameDiv.textContent = 'Editing: ' + levelName;
});

loadBtn.addEventListener('click',()=> fileInput.click());

fileInput.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const data = JSON.parse(ev.target.result);
    levelName = data.name || file.name.replace(/\.json$/,'');
    cols = data.width || cols;
    rows = data.height || rows;
    tiles = data.tiles || createEmptyTiles();
    features = data.features || [];
    enemies = data.enemies || [];
    goals = data.goals || [];
    draw();
    levelNameDiv.textContent = 'Editing: ' + levelName;
  };
  reader.readAsText(file);
});

saveBtn.addEventListener('click',()=>{
  const data = {name:levelName,width:cols,height:rows,tiles,features,enemies,goals};
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (levelName || 'level') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
