import { TILE } from './config.js';
import { Entity } from './entity.js';

// Built-in level data used as fallback when JSON fails to load
export const BASE = [
"M_____________________________________________________________________________________________________________",
"S_______________________________________S_____________________________________________________________________",
"________________________________________MUC_________________________C_________________________________________",
"__________R________________________________==______________________====_______________________________________",
"___________________________C__________________C_______________________S_C_____________________________________",
"__________________________===___________R_______________________E_____MUC___==______________________C_________",
"______________________________C____________====______________====______________________==_____________________",
"_________C_____________==_______==_____________________C_______________________________==____________________",
"________====___C____R__________________C_____________________C__________==_________________________====_______",
"______________________________________________________________________________________________________________",
"___L_P__________==____________________E_____====__E_____________=___________________________C___E____________",
"__LT#######___#########____#######____#############__#########__#########___##########___#############__G____",
"__L########___#########____#######____#############__#########__#########___##########___############__GGG___",
"__L########___#########____#######____#############__#########__#########___##########___############_GGGGG__",
"__L___________________________________________________________________________________________________________",
"__L___________________________________________________________________________________________________________",
"__L_N_______________O_______________________________________K___________________O_____________________________",
"##L#____###____###____#____###____###____###____#___###____###____###____#____###____###____###____#___###_",
"##L#____###____###____#___####____###____###____#___###____###____###____#___####____###____###____#___###_",
"##L#____###____###____#___####____###____###____#___###____###____###____#___####____###____###____#___###_",
"##L#______________________________________________#___#____________________________________#________________#___#_",
"##L###########################################################################################################"
];

// Second half of the demo level with tougher challenges
export const EXT = [
"M___________________________________________________________C______________________________C__________________",
"S______________________________S________________________________________________________________C______________",
"________________________C_____MUC_______________C__________________________C______________________________C___",
"_______________________====___R___________==_____________________====___________________________==___________",
"__________C__________C___________C_________________C________________C____________C___________________________",
"__________==____________________====___________________________====________________________==_____U__________",
"_____C____R___====__________C______________==____________C___________====____________C_____________==________",
"________==__________________==___________________________________==__________________________________==______",
"_____________=________________________C___________________C______________==______________________C____________",
"______________________________________________________________________________________________________________",
"L____E__C_______==___________________C__Z_______HEH=________Z_C_____________==________H__H_______C_____X____",
"L############__#__############____#########_____###############____###########_____############_____#########",
"L#############_____############____#########_____###############____###########_____############_____##__GGGGG",
"L_____________________________________________________________________________________________________________",
"L_____________________________________________________________________________________________________________",
"L_____________________________________________________________________________________________________________",
"L______________________________________________________________________________E______________________________",
"##L#____###____###____###___###____###____###____#___###____###____###____###___###____###____###____#___###",
"##L#____###____###____###__####____###____###____#___###____###____###____###__####____###____###____#___###",
"##L#____###____###____###__####____###____###____#___###____###____###____###__####____###____###____#___###",
"##L#______________________________________#___#_______________________________________#_________________#___#",
"##L###########################################################################################################"
];

// Build a unified level array from base and extension segments
export function buildLevelFromArrays(base, ext){
  const rows = base.slice();
  const extLocal = ext ? ext.slice() : [];
  while (extLocal.length < rows.length) extLocal.push((extLocal[0]||'').padEnd((rows[0]||'').length||96, '_'));
  return rows.map((row,i)=> row + (extLocal[i]||''));
}

export let LEVEL = buildLevelFromArrays(BASE, EXT);
export let H = LEVEL.length;
export let W = LEVEL[0].length;

// Allow game.js to swap in a new level dynamically
export function setLevel(newLevel){
  LEVEL = newLevel;
  H = LEVEL.length;
  W = LEVEL[0].length;
}

// Tile helpers -------------------------------------------------------------
export function tileAt(tx, ty){
  if (ty<0||ty>=H||tx<0||tx>=W) return '_';
  return LEVEL[ty][tx] || '_';
}
export function isSolid(c){
  return c==='#' || c==='=' || c==='[' || c===']' || c==='T' || c==='^';
}
export function groundTopAt(tx, startTy){
  for (let ty=startTy; ty<H; ty++){
    if (isSolid(tileAt(tx,ty))) return (ty-1)*TILE;
  }
  return (H-1)*TILE;
}
export function surfaceTopAt(tx, startTy){
  for (let ty=startTy; ty>=1; ty--){
    if (isSolid(tileAt(tx,ty)) && !isSolid(tileAt(tx,ty-1))) return (ty-1)*TILE;
  }
}

// Entity classes ----------------------------------------------------------
export class Player extends Entity{
  constructor(x,y){
    super(x,y,20,28);
    this.grounded=false; this.facing=1; this.invuln=0; this.lives=3; this.coins=0;
    this.spawnX=x; this.spawnY=y; this.coyote=0; this.jumpBuffer=0; this.big=false;
    this.action=null; this.lockControls=false; this.invisible=0;
    this.rainbow=0; this.onLadder=false; this.mega=0;
  }
  respawn(){
    this.x=this.spawnX; this.y=this.spawnY; this.vx=0; this.vy=0;
    this.invuln=1.2; this.big=false; this.w=20; this.h=28;
    this.action=null; this.lockControls=false; this.invisible=0;
  }
}

export class Goomba extends Entity{
  constructor(x,y){ super(x,y,24,22); this.speed=65; this.vx=-this.speed; }
}

// Hellmonk: monkey with bright yellow helmet
export class Hellmonk extends Entity{
  constructor(x,y){
    super(x,y,24,24);
    this.speed=55; this.chargeSpeed=210; this.state='idle';
    this.reactCD=0; this.facing=-1; this.jump=-520;
  }
}

export class Zakko extends Entity{
  constructor(x,y){
    // Tall dummy enemy; will chase player slowly but avoid walking off ledges
    super(x,y,20,160);
    this.knocked=false;
    this.speed=30;
  }
}

// Ghost enemy: slow floating spooky foe
export class Ghost extends Entity{
  constructor(x,y){ super(x,y,24,24); this.vx = -40; this.phase = Math.random()*Math.PI*2; }
}

// Fire enemy: rolling flame along the ground
export class FireEnemy extends Entity{
  constructor(x,y){ super(x,y,20,20); this.vx = -80; }
}

// Bird enemy for high platforms
export class Bird extends Entity{
  constructor(x,y){
    super(x,y,24,20);
    this.vx = 80;
    this.baseY = y;
    this.range = 80;
    this.vy = 0;
    this.state = 'patrol';
  }
}

// Kangaroo enemy: leaps toward the player, needs two stomps
export class Kangaroo extends Entity{
  constructor(x,y){
    super(x,y,24,30);
    this.vx = 0;
    this.jumpT = 0;
    this.speed = 80;
    this.hp = 2;
  }
}

// Sunflower enemy: bouncy plant that launches players upward
export class Sunflower extends Entity{
  constructor(x,y){
    super(x,y,24,32);
    this.speed = 40;
    this.vx = -this.speed;
  }
}

// Butterfly enemy: flutters high in the sky
export class Butterfly extends Entity{
  constructor(x,y){
    super(x,y,20,16);
    this.vx = 40;
    this.baseY = y;
    this.baseX = x;
    this.range = 40;
    this.vy = 0;
  }
}

// Skeleton enemy: crumbles when stomped, then reforms
export class Skeleton extends Entity{
  constructor(x,y){
    super(x,y,24,30);
    this.speed = 50;
    this.vx = -this.speed;
    this.state = 'walk';
    this.reformT = 0;
    this.baseH = 30;
  }
}

// Giant monkey boss that throws bananas
export class GiantMonkey extends Entity{
  constructor(x,y){
    super(x,y,32,32);
    this.speed = 45;
    this.vx = -this.speed;
    this.jump = -420;
    this.hp = 3;
    this.throwCD = 0;
  }
}

// Banana projectile tossed by giant monkey
export class Banana extends Entity{
  constructor(x,y){
    super(x,y,12,12);
    this.vx = 0;
    this.vy = 0;
  }
}

// Enemy configuration -------------------------------------------------------
export let ENEMY_CONFIGS = {
  'E': { class: 'Goomba' },
  'H': { class: 'Hellmonk' },
  'Z': { class: 'Zakko' },
  'O': { class: 'Ghost' },
  'F': { class: 'FireEnemy' },
  'S': { class: 'Bird' },
  'X': { class: 'Skeleton' },
  'Y': { class: 'GiantMonkey' },
  'W': { class: 'Sunflower' },
  'D': { class: 'Butterfly' },
  'Q': { class: 'Kangaroo' },
};

export function setEnemyConfigs(cfg){
  ENEMY_CONFIGS = { ...ENEMY_CONFIGS, ...(cfg || {}) };
}

const ENEMY_CLASSES = { Goomba, Hellmonk, Zakko, Ghost, FireEnemy, Bird, Skeleton, GiantMonkey, Banana, Sunflower, Butterfly, Kangaroo };

// World creation ----------------------------------------------------------
function findInMap(symbol){
  for (let y=0;y<H;y++){
    const x=LEVEL[y].indexOf(symbol);
    if (x!==-1) return {x,y};
  }
  return {x:2,y:2};
}

export function buildWorld(){
  const spawn = findInMap('P');
  const world = {
    player:new Player(spawn.x*TILE,(spawn.y-1)*TILE),
    enemies:[], coins:[], blocks:[], chests:[], items:[], popCoins:[], chestBursts:[],
    goal:null, checkpoint:null, platforms:[], camX:0, state:'play', winT:0, time:0,
    initialEnemies: [] // Track initial enemy configurations for respawning
  };
  for (let y=0;y<H;y++){
    for (let x=0;x<W;x++){
      const c=LEVEL[y][x];
      const cfg = ENEMY_CONFIGS[c];
      if (cfg){
        const Cls = ENEMY_CLASSES[cfg.class];
        if (Cls){
          const enemyY = (y-1)*TILE;
          const enemyX = x*TILE;
          const ent = new Cls(enemyX, enemyY);
          if (cfg.params){
            Object.assign(ent, cfg.params);
            if ('speed' in cfg.params && 'vx' in ent){ ent.vx = (ent.vx<0?-1:1) * ent.speed; }
          }
          if (!(ent instanceof Bird) && !(ent instanceof Ghost) && !(ent instanceof Butterfly)){
            ent.y = groundTopAt(x,y) - ent.h;
          }
          world.enemies.push(ent);
          
          // Store initial enemy configuration for respawning
          world.initialEnemies.push({
            class: cfg.class,
            x: ent.x,
            y: ent.y,
            params: cfg.params ? {...cfg.params} : null,
            groundAdjusted: !(ent instanceof Bird) && !(ent instanceof Ghost) && !(ent instanceof Butterfly)
          });
        }
      }
      if (c==='C') world.coins.push({x:x*TILE+8,y:(y-1)*TILE+8,r:7,taken:false});
      if (c==='R') world.items.push({x:x*TILE+8,y:(y-1)*TILE+8,w:16,h:16,vx:0,vy:0,grounded:false,type:'shamrock',remove:false,static:true});
      if (c==='N') world.items.push({x:x*TILE+8,y:(y-1)*TILE+8,w:16,h:16,vx:0,vy:0,grounded:false,type:'rainbow',remove:false,static:true});
      if (c==='U') world.items.push({x:x*TILE+8,y:(y-1)*TILE+8,w:16,h:16,vx:0,vy:0,grounded:false,type:'mushroom',remove:false,static:true});
      if (c==='J') world.items.push({x:x*TILE,y:(y-1)*TILE+24,w:TILE,h:8,vx:0,vy:0,grounded:true,type:'trampoline',remove:false,static:true});
      if (c==='V') world.items.push({x:x*TILE,y:(y-1)*TILE,w:TILE,h:TILE,vx:0,vy:0,grounded:true,type:'giantSunflower',remove:false,static:true});
      if (c==='M') world.platforms.push({x:x*TILE,y:(y-1)*TILE,w:TILE*2,h:8,dir:1,speed:40,range:64,baseX:x*TILE});
      if (c==='[') world.blocks.push({x:x*TILE,y:(y-1)*TILE,w:TILE,h:TILE,type:'q',bounce:0,used:false});
      if (c==='B') world.chests.push({x:x*TILE,y:(y-1)*TILE,w:TILE,h:TILE});
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
  
  // Add fire enemies to pit areas
  addFireEnemiesToPits(world);
  
  return world;
}

// Snake placement logic - find pit areas and place snakes
function addFireEnemiesToPits(world) {
  // Define pit locations manually based on our level design
  // These correspond to the gaps in the ground level where we removed spikes
  const pitLocations = [
    { startX: 4, endX: 6, y: 22 },   // First pit area
    { startX: 11, endX: 13, y: 22 }, // Second pit area
    { startX: 26, endX: 28, y: 22 }, // Third pit area
    { startX: 35, endX: 37, y: 22 }, // Fourth pit area
    { startX: 42, endX: 44, y: 22 }, // Fifth pit area
    { startX: 49, endX: 51, y: 22 }, // Sixth pit area
    { startX: 58, endX: 60, y: 22 }, // Seventh pit area
    { startX: 65, endX: 67, y: 22 }, // Eighth pit area
    { startX: 74, endX: 76, y: 22 }, // Ninth pit area
    { startX: 81, endX: 83, y: 22 }, // Tenth pit area
    { startX: 90, endX: 92, y: 22 }, // Eleventh pit area
    { startX: 97, endX: 99, y: 22 }  // Twelfth pit area
  ];
  
  // Only use every other pit to reduce the number by half
  const usedPits = pitLocations.filter((_, index) => index % 2 === 0);
  
  usedPits.forEach(pit => {
    // Place 2-3 fire enemies at the bottom of each pit
    const fireEnemyCount = 2 + Math.floor(Math.random() * 2); // 2 or 3 fire enemies
    
    for (let i = 0; i < fireEnemyCount; i++) {
      const fireX = (pit.startX + (pit.endX - pit.startX) * (i / Math.max(1, fireEnemyCount - 1))) * TILE;
      const fireY = (pit.y - 2) * TILE; // Place at bottom of pit, one tile up from floor
      
      const fireEnemy = new FireEnemy(fireX, fireY);
      world.enemies.push(fireEnemy);
      
      // Store initial fire enemy configuration for respawning
      world.initialEnemies.push({
        class: 'FireEnemy',
        x: fireX,
        y: fireY,
        params: null,
        groundAdjusted: false
      });
    }
  });
}

// Function to respawn all enemies to their initial positions and states
export function respawnAllEnemies(world) {
  // Clear current enemies
  world.enemies = [];
  
  // Recreate all enemies from their initial configurations
  world.initialEnemies.forEach(config => {
    const Cls = ENEMY_CLASSES[config.class];
    if (Cls) {
      const enemy = new Cls(config.x, config.y);
      
      // Apply any stored parameters
      if (config.params) {
        Object.assign(enemy, config.params);
        if ('speed' in config.params && 'vx' in enemy) {
          enemy.vx = (enemy.vx < 0 ? -1 : 1) * enemy.speed;
        }
      }
      
      // Reset enemy state
      enemy.remove = false;
      if ('reactCD' in enemy) enemy.reactCD = 0;
      if ('state' in enemy) enemy.state = 'idle';
      
      world.enemies.push(enemy);
    }
  });
}


