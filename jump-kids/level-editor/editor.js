const tileSize = 32;
let cols = 96;  // Standard Jump Kids level width
let rows = 22;  // Standard Jump Kids level height
let levelName = '';

const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');

// Use the correct Jump Kids level format with base and ext layers
let baseLayer = createEmptyLevel();
let extLayer = createEmptyLevel();
let currentLayer = 'base';

// Jump Kids tile definitions matching the actual game
const tileTypes = [
  {id:'_', name:'Empty/Air', color:'#eef', symbol:'_'},
  {id:'#', name:'Ground Block', color:'#8b5a2b', symbol:'#'},
  {id:'=', name:'Platform/Brick', color:'#b85a35', symbol:'='},
  {id:'T', name:'Trapdoor', color:'#8B4513', symbol:'T'},
  {id:'L', name:'Ladder', color:'#d9a066', symbol:'L'},
  {id:'^', name:'Spikes', color:'#666', symbol:'^'},
  {id:'M', name:'Moving Platform', color:'#888', symbol:'M'}
];

const collectibleTypes = [
  {id:'C', name:'Coin', color:'#ffd700', symbol:'C'},
  {id:'R', name:'Shamrock', color:'#00c853', symbol:'R'},
  {id:'N', name:'Rainbow', color:'#ff4081', symbol:'N'},
  {id:'U', name:'Mega Mushroom', color:'#d500f9', symbol:'U'}
];

const enemyTypes = [
  {id:'E', name:'Goomba', color:'#c0392b', symbol:'E'},
  {id:'H', name:'Hellmonk', color:'#ff9800', symbol:'H'},
  {id:'F', name:'Fire Enemy', color:'#e64a19', symbol:'F'},
  {id:'O', name:'Ghost', color:'#9e9e9e', symbol:'O'},
  {id:'S', name:'Bird', color:'#795548', symbol:'S'},
  {id:'X', name:'Skeleton', color:'#b0bec5', symbol:'X'},
  {id:'Y', name:'Giant Monkey', color:'#8bc34a', symbol:'Y'},
  {id:'M', name:'Monkey', color:'#4caf50', symbol:'M'},
  {id:'W', name:'Sunflower', color:'#ffeb3b', symbol:'W'},
  {id:'D', name:'Butterfly', color:'#ff80ab', symbol:'D'},
  {id:'T', name:'Red Trampoline', color:'#f44336', symbol:'T'}
];

const goalTypes = [
  {id:'P', name:'Player Spawn', color:'#2196f3', symbol:'P'},
  {id:'K', name:'Checkpoint Flag', color:'#fff', symbol:'K'},
  {id:'G', name:'Goal Flag', color:'#2e7d32', symbol:'G'},
  {id:'[', name:'Q-Block', color:'#f2c14e', symbol:'['},
  {id:'B', name:'Chest', color:'#8d6e63', symbol:'B'}
];

let currentTool = {category:'tile', id:'#'};

function createEmptyLevel(){
  return Array.from({length:rows}, ()=>Array(cols).fill('_'));
}

function draw(){
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  
  const currentLayerData = currentLayer === 'base' ? baseLayer : extLayer;
  
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const symbol = currentLayerData[y][x];
      
      if(symbol && symbol !== '_'){
        // Find the tile definition
        const allTypes = [...tileTypes, ...collectibleTypes, ...enemyTypes, ...goalTypes];
        const tileDef = allTypes.find(t => t.id === symbol);
        
        if(tileDef) {
          ctx.fillStyle = tileDef.color;
          ctx.fillRect(x*tileSize, y*tileSize, tileSize, tileSize);
          
          // Draw symbol text
          ctx.fillStyle = '#000';
          ctx.font = 'bold 16px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(symbol, x*tileSize + tileSize/2, y*tileSize + tileSize/2);
          
          // Draw label for enemies and features (non-tile items)
          if (enemyTypes.some(e => e.id === symbol) || goalTypes.some(g => g.id === symbol) || 
              collectibleTypes.some(c => c.id === symbol) || 
              ['T', 'L', '^', 'M'].includes(symbol)) {
            ctx.font = 'bold 8px system-ui';
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(x*tileSize + 1, y*tileSize + 1, tileSize - 2, 12);
            ctx.fillStyle = '#000';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const shortName = tileDef.name.length > 8 ? tileDef.name.substring(0, 8) : tileDef.name;
            ctx.fillText(shortName, x*tileSize + 2, y*tileSize + 2);
          }
        }
      }
      
      // Draw grid lines
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x*tileSize, y*tileSize, tileSize, tileSize);
    }
  }
  
  // Draw layer indicator
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(10, 10, 120, 30);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Layer: ${currentLayer.toUpperCase()}`, 15, 20);
}

draw();

// Handle left click to place tiles and right click to delete
canvas.addEventListener('click', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left)/tileSize);
  const y = Math.floor((e.clientY - rect.top)/tileSize);
  if(x<0||x>=cols||y<0||y>=rows) return;
  
  const currentLayerData = currentLayer === 'base' ? baseLayer : extLayer;
  currentLayerData[y][x] = currentTool.id;
  draw();
});

// Handle right click to delete tiles
canvas.addEventListener('contextmenu', (e)=>{
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left)/tileSize);
  const y = Math.floor((e.clientY - rect.top)/tileSize);
  if(x<0||x>=cols||y<0||y>=rows) return;
  
  const currentLayerData = currentLayer === 'base' ? baseLayer : extLayer;
  currentLayerData[y][x] = '_'; // Set to empty
  draw();
});

// Add layer switching and delete key functionality
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    currentLayer = currentLayer === 'base' ? 'ext' : 'base';
    updateLayerButtons();
    draw();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    // Switch to eraser tool
    currentTool = {category:'tile', id:'_'};
    // Update palette selection
    const eraserItem = document.querySelector('.item[title*="Eraser"]');
    if (eraserItem) {
      document.querySelectorAll('.item').forEach(i=>i.classList.remove('selected'));
      eraserItem.classList.add('selected');
    }
  }
});

function updateLayerButtons() {
  const baseLayerBtn = document.getElementById('baseLayerBtn');
  const extLayerBtn = document.getElementById('extLayerBtn');
  
  if (baseLayerBtn && extLayerBtn) {
    if (currentLayer === 'base') {
      baseLayerBtn.classList.add('active');
      extLayerBtn.classList.remove('active');
    } else {
      extLayerBtn.classList.add('active');
      baseLayerBtn.classList.remove('active');
    }
  }
}

// Layer switching button functionality
const baseLayerBtn = document.getElementById('baseLayerBtn');
const extLayerBtn = document.getElementById('extLayerBtn');

if (baseLayerBtn && extLayerBtn) {
  baseLayerBtn.addEventListener('click', () => {
    currentLayer = 'base';
    updateLayerButtons();
    draw();
  });

  extLayerBtn.addEventListener('click', () => {
    currentLayer = 'ext';
    updateLayerButtons();
    draw();
  });
}

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
  
  if(tab==='base'){
    list = [...tileTypes, ...collectibleTypes];
  } else if(tab==='features'){
    list = tileTypes.filter(t => ['T', 'L', '^', 'M'].includes(t.id));
  } else if(tab==='enemies'){
    list = enemyTypes;
  } else if(tab==='goals'){
    list = goalTypes;
  }
  
  // Add eraser tool to all tabs
  const eraserItem = {id:'_', name:'Eraser (Delete)', color:'#f5f5f5', symbol:'✕'};
  list.unshift(eraserItem);
  
  list.forEach(item=>{
    const div = document.createElement('div');
    div.className='item';
    div.title=item.name;
    div.style.background=item.color;
    div.style.color = item.id === '_' ? '#666' : '#000';
    div.style.fontWeight = 'bold';
    div.style.fontFamily = item.id === '_' ? 'system-ui' : 'monospace';
    div.textContent=item.symbol;
    
    if (item.id === '_') {
      div.style.border = '2px dashed #999';
    }
    
    // Add text label below the symbol
    const label = document.createElement('div');
    label.className = 'item-label';
    label.textContent = item.name;
    label.style.fontSize = '9px';
    label.style.fontFamily = 'system-ui';
    label.style.fontWeight = 'normal';
    label.style.color = '#333';
    label.style.textAlign = 'center';
    label.style.marginTop = '2px';
    label.style.lineHeight = '1';
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.whiteSpace = 'nowrap';
    
    div.appendChild(label);
    
    div.addEventListener('click',()=>{
      pal.querySelectorAll('.item').forEach(i=>i.classList.remove('selected'));
      div.classList.add('selected');
      currentTool = {category:'tile', id:item.id};
    });
    pal.appendChild(div);
  });
  
  const first = pal.querySelector('.item');
  if(first){ first.click(); }
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
  baseLayer = createEmptyLevel();
  extLayer = createEmptyLevel();
  draw();
  levelNameDiv.textContent = 'Editing: ' + levelName;
});

loadBtn.addEventListener('click',()=> fileInput.click());

fileInput.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      levelName = data.name || file.name.replace(/\.json$/,'');
      
      // Handle Jump Kids level format
      if (data.base && data.ext) {
        // Convert string arrays to character arrays
        baseLayer = data.base.map(row => row.split(''));
        extLayer = data.ext.map(row => row.split(''));
        
        // Adjust dimensions if needed
        rows = Math.max(baseLayer.length, extLayer.length);
        cols = Math.max(
          Math.max(...baseLayer.map(row => row.length)),
          Math.max(...extLayer.map(row => row.length))
        );
        
        // Pad arrays to match dimensions
        while(baseLayer.length < rows) baseLayer.push(Array(cols).fill('_'));
        while(extLayer.length < rows) extLayer.push(Array(cols).fill('_'));
        baseLayer.forEach(row => {
          while(row.length < cols) row.push('_');
        });
        extLayer.forEach(row => {
          while(row.length < cols) row.push('_');
        });
      } else {
        // Fallback for old format
        baseLayer = createEmptyLevel();
        extLayer = createEmptyLevel();
      }
      
      draw();
      levelNameDiv.textContent = 'Editing: ' + levelName;
    } catch (error) {
      alert('Error loading file: ' + error.message);
    }
  };
  reader.readAsText(file);
});

saveBtn.addEventListener('click', async ()=>{
  // Convert character arrays back to strings for Jump Kids format
  const baseStrings = baseLayer.map(row => row.join(''));
  const extStrings = extLayer.map(row => row.join(''));
  
  const data = {
    backdrop: 'hills',
    base: baseStrings,
    ext: extStrings
  };
  
  const jsonContent = JSON.stringify(data, null, 2);
  const fileName = (levelName || 'level') + '.json';
  
  // Try to use the modern File System Access API for save-to-location functionality
  if ('showSaveFilePicker' in window) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'JSON files',
          accept: {'application/json': ['.json']},
        }],
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write(jsonContent);
      await writable.close();
      
      alert('Level saved successfully!');
      return;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('File System Access API failed:', err);
      } else {
        return; // User cancelled
      }
    }
  }
  
  // Fallback to download method
  const blob = new Blob([jsonContent], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
});

// Initialize first layer
baseLayerBtn?.classList.add('active');
