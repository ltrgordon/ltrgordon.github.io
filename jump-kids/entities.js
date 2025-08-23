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
"##L#^__#^__#^__#^__#___#^__#^__#^__#^__#M__#^__#^__#^__#^__#___#^__#^__#^__#^__#M__#^__#^__#^__#^__#___#^__#^_",
"##L#^__#^_C#^__#^__#^__#^__#^_M#^__#^__#^__#^__#^_C#^__#^__#^__#^__#^__#^__#^__#^__#^__#^_C#^__#^__#^__#^__#^_",
"##L#^__#^__#^__X^__#^__#^__#^__#^__E^__#^__#^__#^__#^__M^__#^__#^__#^__#^__E^__#^__#^__#^__#^__M^__#^__#^__#^_",
"##L#^__#^__#^__#^__#E__#^C_#^__#^__#^__#^__#^M_#^__#^__#^__#E__#^C_#^_E#^__#^__#^__#^E_#^__#^__#^__#E__#^C_#^_",
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
"_____________=________________________C___________________C______________==______________________C___________^",
"______________________________________________________________________________________________________________",
"L____E__C_______==___________________C__Z_______HEH=________Z_C_____________==________H__H_______C_____X____",
"L############__#__############____#########_____###############____###########_____############_____#########",
"L#############_____############____#########_____###############____###########_____############_____##__GGGGG",
"L_____________________________________________________________________________________________________________",
"L_____________________________________________________________________________________________________________",
"L_____________________________________________________________________________________________________________",
"L______________________________________________________________________________E______________________________",
"##L#^__#^__#^__E^__#^__#^__#^__#^__M^__#^__#^__#^__#^__E^__#^__#^__#^__#^__M^__#^__#^__#^__#^__E^__#^__#^__#^_",
"##L#^__#^_C#^__#^__#^__#^__#^__#^__#^__#^__#^__#^_M#^__#^__#^__#^__#^_C#^__#^__#^__#^__#^__#^__#^__#^__#^__#^_",
"##L#^__#^__#^__#^__#M__#^__#^__#^__#^__#___#^__#^__#^__#^__#M__#^__#^__#^__#^__#___#^__#^__#^__#^__#M__#^__#^_",
"##L#^__#^__#^__#^__#^__#^C_#^_E#^__#^__#E__#^E_#^__#^__#^__#^__#^C_#^__#^__#^__#E__#^M_#^_E#^__#^__#^__#^C_#^_",
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

// Enemy configuration -------------------------------------------------------
export let ENEMY_CONFIGS = {
  'E': { class: 'Goomba' },
  'H': { class: 'Hellmonk' },
  'Z': { class: 'Zakko' },
  'O': { class: 'Ghost' },
  'F': { class: 'FireEnemy' },
  'S': { class: 'Bird' },
  'X': { class: 'Skeleton' },
};

export function setEnemyConfigs(cfg){
  ENEMY_CONFIGS = { ...ENEMY_CONFIGS, ...(cfg || {}) };
}

const ENEMY_CLASSES = { Goomba, Hellmonk, Zakko, Ghost, FireEnemy, Bird, Skeleton };

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
  console.log('Building world, spawn position:', spawn);
  console.log('LEVEL dimensions:', H, 'x', W);
  console.log('LEVEL first few rows:', LEVEL.slice(0, 3));
  const world = {
    player:new Player(spawn.x*TILE,(spawn.y-1)*TILE),
    enemies:[], coins:[], blocks:[], chests:[], items:[], popCoins:[], chestBursts:[],
    goal:null, checkpoint:null, platforms:[], camX:0, state:'play', winT:0, time:0
  };
  console.log('Player created at:', world.player.x, world.player.y);
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
          if (!(ent instanceof Bird) && !(ent instanceof Ghost)){
            ent.y = groundTopAt(x,y) - ent.h;
          }
          world.enemies.push(ent);
        }
      }
      if (c==='C') world.coins.push({x:x*TILE+8,y:(y-1)*TILE+8,r:7,taken:false});
      if (c==='R') world.items.push({x:x*TILE+8,y:(y-1)*TILE+8,w:16,h:16,vx:0,vy:0,grounded:false,type:'shamrock',remove:false,static:true});
      if (c==='N') world.items.push({x:x*TILE+8,y:(y-1)*TILE+8,w:16,h:16,vx:0,vy:0,grounded:false,type:'rainbow',remove:false,static:true});
      if (c==='U') world.items.push({x:x*TILE+8,y:(y-1)*TILE+8,w:16,h:16,vx:0,vy:0,grounded:false,type:'mushroom',remove:false,static:true});
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
  return world;
}
