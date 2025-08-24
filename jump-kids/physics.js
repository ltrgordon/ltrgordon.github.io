import { TILE, GRAVITY, MOVE_ACC, MOVE_MAX, FRICTION, JUMP_VEL, CAM_MARGIN_X, EPSY, COYOTE_TIME } from './config.js';
import { LEVEL, H, W, tileAt, isSolid, groundTopAt, surfaceTopAt, Player, Goomba, Hellmonk, Zakko, Ghost, FireEnemy, Bird, Skeleton, GiantMonkey, Banana, Sunflower, Butterfly, Kangaroo, respawnAllEnemies } from './entities.js';
import { consumeRestart, playBeep, playCoin, playShamrock } from './input.js';

// Basic geometry helpers --------------------------------------------------
function rectOverlap(x1,y1,w1,h1,x2,y2,w2,h2){ return !(x1+w1<=x2||x1>=x2+w2||y1+h1<=y2||y1>=y2+h2); }
function aabb(a,b){ return rectOverlap(a.x,a.y,a.w,a.h,b.x,b.y,b.w,b.h); }
function circleRectOverlap(cx,cy,cr, rx,ry,rw,rh){
  const nx=Math.max(rx,Math.min(cx,rx+rw)), ny=Math.max(ry,Math.min(cy,ry+rh));
  const dx=cx-nx, dy=cy-ny; return dx*dx+dy*dy<=cr*cr;
}

// Move with tile collisions; y uses consistent (ty-1)*TILE mapping
function moveWithCollisions(ent, dx, dy, isEnemy=false){
  let collidedX=false;
  if (dx!==0){
    ent.x += dx;
    const from = Math.floor((Math.min(ent.left, ent.left-dx))/TILE);
    const to   = Math.floor((Math.max(ent.right, ent.right-dx))/TILE);
    const top  = Math.floor(ent.top/TILE)+1;
    const bot  = Math.floor((ent.bottom-1)/TILE)+1;
    for (let tx=from; tx<=to; tx++){
      for (let ty=top; ty<=bot; ty++){
        const c = tileAt(tx,ty);
        if (!isSolid(c)) continue;
        const tileRect = {x:tx*TILE, y:(ty-1)*TILE, w:TILE, h:TILE};
        if (rectOverlap(ent.x,ent.y,ent.w,ent.h,tileRect.x,tileRect.y,tileRect.w,tileRect.h)){
          if (dx>0) ent.x = tileRect.x - ent.w;
          else ent.x = tileRect.x + tileRect.w;
          ent.vx = isEnemy ? -ent.vx : 0;
          collidedX = true;
        }
      }
    }
  }
  if (dy!==0){
    ent.y += dy;
    const left = Math.floor(ent.left/TILE);
    const right= Math.floor((ent.right-1)/TILE);
    const from = Math.floor((Math.min(ent.top, ent.top-dy))/TILE)+1;
    const to   = Math.floor((Math.max(ent.bottom, ent.bottom-dy))/TILE)+1;
    let onGround=false;
    for (let ty=from; ty<=to; ty++){
      for (let tx=left; tx<=right; tx++){
        const c = tileAt(tx,ty);
        if (!isSolid(c)) continue;
        const tileRect = {x:tx*TILE, y:(ty-1)*TILE, w:TILE, h:TILE};
        if (rectOverlap(ent.x,ent.y,ent.w,ent.h,tileRect.x,tileRect.y,tileRect.w,tileRect.h)){
          if (dy>0) ent.y = tileRect.y - ent.h - 0.01;
          else ent.y = tileRect.y + tileRect.h;
          ent.vy = 0;
          onGround=true;
        }
      }
    }
    ent.grounded = onGround;
  }
  return collidedX;
}

// Snap to ground to eliminate sub-pixel hover/jitter
function trySnapToGround(ent){
  if (ent.vy < -0.01) return false;
  const left = Math.floor((ent.left+2)/TILE);
  const right= Math.floor((ent.right-2)/TILE);
  const belowTy = Math.floor(ent.bottom/TILE)+1;
  for (let tx=left; tx<=right; tx++){
    const c = tileAt(tx, belowTy);
    if (!isSolid(c)) continue;
    const tileTop = (belowTy-1)*TILE;
    const gap = tileTop - ent.bottom;
    if (gap>=-0.25 && gap<=EPSY){
      ent.y = tileTop - ent.h;
      ent.vy = 0;
      ent.grounded = true;
      return true;
    }
  }
  return false;
}

// Player size/health helpers ----------------------------------------------
function growPlayer(p, HUD){
  if (p.big){
    p.coins += 5; HUD.coins.textContent = p.coins; playCoin();
    return;
  }
  const oldH = p.h;
  p.big = true;
  p.h = 40; p.w = 26;
  p.y -= (p.h - oldH);
}
function activateMushroom(p){
  const oldH = p.h;
  p.big = true;
  p.h = 56; p.w = 36;
  p.y -= (p.h - oldH);
  p.mega = 7.5; // Reduced from 15 to 7.5 seconds
  p.rainbow = 7.5; // Reduced from 15 to 7.5 seconds
}
function shrinkPlayer(p){
  if (!p.big) return;
  const oldH = p.h;
  p.big = false;
  p.h = 28; p.w = 20;
  p.y += (oldH - p.h);
}
function damagePlayer(p, world, HUD){
  if (p.rainbow>0) return;
  if (p.invuln>0) return;
  if (p.big){
    shrinkPlayer(p);
    p.invuln = 1;
  } else {
    p.lives--; HUD.lives.textContent = p.lives;
    if (p.lives<=0){
      HUD.msg.textContent="Game Over — press R or Jump to restart";
      world.state='gameover';
      playBeep(220,0.2,0.12);
      return;
    }
    p.respawn();
    respawnAllEnemies(world);
  }
}

function handleSpecialCollision(p,e,specialMoves){
  const ability = specialMoves[p.charId];
  if (ability && ability.onEnemyCollide){
    return ability.onEnemyCollide(p,e);
  }
  return false;
}

// Main physics update -----------------------------------------------------
export function update(world, keys, HUD, dt, resetGame, specialMoves){
  const p = world.player;
  const ability = specialMoves[p.charId];
  if (ability && ability.update) ability.update(p, dt, world, keys);
  for (const b of world.blocks){ if (b.bounce>0) b.bounce = Math.max(0, b.bounce - dt*4); }
  if (world.state === 'pause') return;
  if (world.state !== 'win' && world.state !== 'gameover') world.time += dt;
  if (p.rainbow>0) p.rainbow = Math.max(0, p.rainbow - dt);
  if (p.mega>0){
    p.mega = Math.max(0, p.mega - dt);
    if (p.mega===0) shrinkPlayer(p);
  }
  for (const m of world.platforms){
    m.x += m.dir*m.speed*dt;
    if (m.x < m.baseX - m.range || m.x > m.baseX + m.range){ m.dir *= -1; m.x += m.dir*m.speed*dt; }
  }
  if (world.state === 'win'){
    world.winT += dt;
    p.vx = 0; p.vy = 0;
    trySnapToGround(p);
    p.facing = (Math.sin(world.winT*8) > 0) ? 1 : -1;
    return;
  }
  if (world.state === 'gameover'){
    if (consumeRestart() || keys.jump){ keys.jump=false; resetGame(); }
    return;
  }
  if (p.invuln>0) p.invuln = Math.max(0, p.invuln - dt);

  const acc = MOVE_ACC * (keys.dash ? 1.5 : 1);
  const max = MOVE_MAX * (keys.dash ? 1.5 : 1);
  if (!p.lockControls){
    if (keys.left) p.vx = Math.max(-max, p.vx - acc*dt);
    if (keys.right) p.vx = Math.min( max, p.vx + acc*dt);
    if (!keys.left && !keys.right){
      if (p.vx>0) p.vx = Math.max(0, p.vx - FRICTION*dt);
      if (p.vx<0) p.vx = Math.min(0, p.vx + FRICTION*dt);
    }
    if (Math.abs(p.vx)<1) p.vx = 0;
    if (keys.left && !keys.right) p.facing = -1; else if (keys.right && !keys.left) p.facing = 1;
  }

  const centerTx = Math.floor((p.x + p.w/2)/TILE);
  const centerTy = Math.floor((p.y + p.h/2)/TILE);
  p.onLadder = tileAt(centerTx, centerTy)==='L';
  if (p.onLadder && !p.lockControls){
    p.vy = 0;
    if (keys.up) p.vy = -MOVE_MAX;
    else if (keys.down) p.vy = MOVE_MAX;
    if (keys.jump && p.mega<=0){ p.onLadder=false; p.vy = -JUMP_VEL; }
  } else {
    p.vy += GRAVITY*dt;
    if (p.vy>1200) p.vy=1200;
    if (p.grounded) p.coyote = COYOTE_TIME; else p.coyote = Math.max(0, p.coyote - dt);
    if (p.jumpBuffer>0) p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (!p.lockControls && p.jumpBuffer>0 && (p.grounded || p.coyote>0) && p.mega<=0){
      const jv = (p.charId==='leo' ? JUMP_VEL*0.5 : JUMP_VEL) * (keys.dash ? 1.25 : 1);
      p.vy = -jv;
      p.grounded = false;
      p.jumpBuffer = 0;
      playBeep(700,0.05,0.07);
    }
  }

  moveWithCollisions(p, p.vx*dt, 0);
  const prevVy = p.vy;
  const prevBottom = p.bottom;
  moveWithCollisions(p, 0, p.vy*dt);
  const belowTy = Math.floor((p.bottom+1)/TILE);
  const centerTx2 = Math.floor((p.x + p.w/2)/TILE);
  if (tileAt(centerTx2, belowTy)==='T'){
    const row = LEVEL[belowTy];
    LEVEL[belowTy] = row.substring(0, centerTx2) + '_' + row.substring(centerTx2+1);
  }
  for (const m of world.platforms){
    if (prevBottom <= m.y && p.bottom >= m.y && p.right > m.x && p.left < m.x + m.w && p.vy>=0){
      p.y = m.y - p.h;
      p.vy = 0;
      p.grounded = true;
      p.x += m.dir*m.speed*dt;
    }
  }

  if (!p.grounded && !p.onLadder) trySnapToGround(p);
  
  // Enhanced spike detection - check entire player hitbox
  let hitSpikes = false;
  const playerLeft = Math.floor(p.left/TILE);
  const playerRight = Math.floor((p.right-1)/TILE);
  const playerTop = Math.floor(p.top/TILE) + 1; // Convert to level coordinates
  const playerBottom = Math.floor((p.bottom-1)/TILE) + 1;
  
  // Check all tiles the player is overlapping
  for (let tx = playerLeft; tx <= playerRight; tx++) {
    for (let ty = playerTop; ty <= playerBottom; ty++) {
      if (tileAt(tx, ty) === '^') {
        hitSpikes = true;
        break;
      }
    }
    if (hitSpikes) break;
  }
  
  if (hitSpikes) {
    console.log('Player hit spikes!');
    
    // Leo's special ability: immunity to spikes
    if (p.charId === 'leo') {
      console.log('Leo is immune to spikes!');
      // Give Leo a little bounce to indicate he's safe
      p.vy = -150;
      playBeep(700, 0.1, 0.05); // Play immunity sound
      HUD.msg.textContent = 'Leo is safe from spikes!';
    } else {
      // Spikes are deadly for other characters - instant death
      p.lives--; 
      HUD.lives.textContent = p.lives;
      if (p.lives<=0){
        HUD.msg.textContent="Game Over — press R or Jump to restart";
        world.state='gameover';
        playBeep(220,0.2,0.12);
        return;
      }
      p.respawn();
      respawnAllEnemies(world);
      return;
    }
  }

  if (prevVy < 0){
    for (const b of world.blocks){
      if (b.used) continue;
      const hit = p.x < b.x + b.w && p.x + p.w > b.x && prevBottom <= b.y + b.h && p.bottom >= b.y + b.h;
      if (hit){
        b.used = true; b.bounce = 1;
      }
    }
    for (const ch of world.chests){
      const hit = p.x < ch.x + ch.w && p.x + p.w > ch.x && prevBottom <= ch.y + ch.h && p.bottom >= ch.y + ch.h;
      if (hit){
        const coinLoot = Math.random() < 0.5;
        if (coinLoot){
          const count = 2 + Math.floor(Math.random()*3);
          for (let i=0;i<count;i++){
            const ang = Math.random()*Math.PI*2;
            const speed = 200 + Math.random()*80;
            const vx = Math.cos(ang)*speed;
            const vy = Math.sin(ang)*speed - 200;
            world.items.push({x:ch.x + 8, y:ch.y - 8, w:16, h:16, vx, vy, grounded:false, type:'coin', remove:false});
          }
        } else {
          const dir = Math.random() < 0.5 ? -60 : 60;
          world.items.push({x:ch.x + 8, y:ch.y - 16, w:16, h:16, vx:dir, vy:-260, grounded:false, type:'shamrock', remove:false});
        }
        world.chestBursts.push({pieces:[{x:ch.x, y:ch.y, w:12, h:16, vx:-80, vy:-220, color:'#4b2e00'},{x:ch.x+12, y:ch.y, w:12, h:16, vx:80, vy:-220, color:'#4b2e00'}], t:0});
        ch.remove = true;
      }
    }
    world.chests = world.chests.filter(ch=>!ch.remove);
  }

  for (const burst of world.chestBursts){
    burst.t += dt;
    for (const pc of burst.pieces){
      pc.x += pc.vx*dt; pc.y += pc.vy*dt; pc.vy += GRAVITY*dt;
    }
  }
  world.chestBursts = world.chestBursts.filter(b=> b.t < 2);

  for (const it of world.items){
    if (!it.static){
      it.vy += GRAVITY*dt;
      moveWithCollisions(it, it.vx*dt, it.vy*dt);
      if (it.grounded) it.vx *= 0.8;
    }
    if (it.type==='coin') it.vx*=0.98;
    if (rectOverlap(p.x,p.y,p.w,p.h,it.x,it.y,it.w,it.h)){
      if (it.type==='shamrock'){ growPlayer(p, HUD); playShamrock(); it.remove = true; }
      else if (it.type==='rainbow'){ p.rainbow = 15; HUD.msg.textContent='Invincible!'; it.remove = true; } // Reduced from 30 to 15 seconds
      else if (it.type==='mushroom'){ activateMushroom(p); HUD.msg.textContent='Mega!'; playShamrock(); it.remove = true; }
      else if (it.type==='coin'){ p.coins++; HUD.coins.textContent=p.coins; playCoin(); it.remove = true; }
      else if (it.type==='trampoline'){
        const fromAbove = (p.vy>0) && (p.bottom - it.y < 18);
        if (fromAbove){ p.vy = -JUMP_VEL*1.25*3; playBeep(800,0.1,0.1); }
      } else if (it.type==='giantSunflower'){
        const fromAbove = (p.vy>0) && (p.bottom - it.y < 18);
        if (fromAbove){ p.vy = -4.5*JUMP_VEL; playBeep(600,0.1,0.1); }
      }
    }
  }
  world.items = world.items.filter(it => !it.remove);

  for (const c of world.coins){
    if (c.taken) continue;
    if (circleRectOverlap(c.x,c.y,c.r,p.x,p.y,p.w,p.h)){
      c.taken=true; p.coins++; HUD.coins.textContent = p.coins; playCoin();
    }
  }

  if (world.checkpoint && !world.checkpoint.activated && rectOverlap(p.x,p.y,p.w,p.h, world.checkpoint.x, world.checkpoint.y, world.checkpoint.w, world.checkpoint.h)){
    world.checkpoint.activated = true;
    p.spawnX = p.x; p.spawnY = p.y;
    HUD.msg.textContent = 'Checkpoint!';
    playBeep(520,0.07,0.08);
  }

  for (const e of world.enemies){
    if (e.remove) continue;
    if (!(e instanceof Ghost) && !(e instanceof Bird) && !(e instanceof Butterfly)) e.vy += GRAVITY*dt;
    if (e instanceof GiantMonkey){
      if (e.throwCD>0) e.throwCD -= dt;
      const dx = (p.x + p.w/2) - (e.x + e.w/2);
      const dir = Math.sign(dx) || 1;
      e.vx = dir * e.speed;
      const aheadTx = Math.floor(((e.vx>0? e.right+1: e.left-1))/TILE);
      const footTy = Math.floor((e.bottom+1)/TILE)+1;
      if (!isSolid(tileAt(aheadTx, footTy)) && e.grounded){ e.vy = e.jump; }
      moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      if (e.throwCD<=0 && Math.abs(dx)<200){
        const banana = new Banana(e.x + e.w/2, e.y+8);
        banana.vx = dir * 140;
        banana.vy = -120;
        world.enemies.push(banana);
        e.throwCD = 2.5;
      }
      if (!e.remove && aabb(p,e)){
        if (p.rainbow>0){ e.remove=true; p.vy=-0.55*JUMP_VEL; continue; }
        if (handleSpecialCollision(p,e,specialMoves)) continue;
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){
          p.vy = -0.6*JUMP_VEL;
          if (--e.hp<=0) e.remove=true;
        } else damagePlayer(p, world, HUD);
      }
    } else if (e instanceof Banana){
      moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      if (e.grounded) e.remove=true;
      if (!e.remove && aabb(p,e)){
        damagePlayer(p, world, HUD);
        e.remove=true;
      }
    } else if (e instanceof Hellmonk){
      if (e.reactCD>0) e.reactCD -= dt;
      let collidedX = moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      const dx = (p.x + p.w/2) - (e.x + e.w/2);
      const invisible = (p.charId==='joey' && p.invisible>0);
      const dist = invisible ? Infinity : Math.abs(dx);
      const dir = Math.sign(dx) || e.facing;
      e.facing = dir;
      if (e.state==='idle'){
        if (e.vx===0) e.vx = -e.speed;
        const aheadTx = Math.floor(((e.vx>0? e.right+1: e.left-1))/TILE);
        const footTy = Math.floor((e.bottom+1)/TILE)+1;
        if (!isSolid(tileAt(aheadTx, footTy)) && isSolid(tileAt(Math.floor(e.x/TILE), footTy))) e.vx *= -1;
        if (!invisible && dist < 160 && e.grounded && e.reactCD<=0){
          e.vy = e.jump;
          e.state = 'chargePrep';
          e.reactCD = 0.8;
        }
      } else if (e.state==='chargePrep'){
        if (e.vy>0 || !e.grounded){
          e.vx = dir * e.chargeSpeed;
          e.state = 'charge';
        }
      } else if (e.state==='charge'){
        if (collidedX){ e.vx = -e.vx; }
        if (dist > 360){ e.state='idle'; e.vx = dir * e.speed; }
      }
      if (aabb(p,e)){
        if (p.rainbow>0){ e.remove=true; p.vy = -0.55*JUMP_VEL; continue; }
        if (handleSpecialCollision(p,e,specialMoves)) continue;
        
        // Leo's special ability: immunity to enemies
        if (p.charId === 'leo') {
          const dir = p.x < e.x ? 1 : -1; // Direction away from Leo
          e.vx = dir * Math.max(Math.abs(e.vx || e.speed || 100), 150); // Bounce enemy away
          e.vy = -250; // Give enemy a bounce up
          e.state = 'idle'; // Reset enemy state
          playBeep(600, 0.08, 0.05); // Play bounce sound
          continue; // Leo takes no damage
        }
        
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){
          p.vy = -0.6*JUMP_VEL;
          e.vx = -dir * Math.max(e.speed, 120);
          e.state = 'idle';
        } else if (p.invuln<=0){
          if (p.big){ 
            shrinkPlayer(p); 
            p.invuln = 1; 
          } else { 
            p.lives--; 
            HUD.lives.textContent = p.lives; 
            if (p.lives<=0){ 
              HUD.msg.textContent="Game Over — press R or Jump to restart"; 
              world.state='gameover'; 
              playBeep(220,0.2,0.12); 
              return; 
            } 
            p.respawn(); 
            respawnAllEnemies(world);
          }
        }
      }
    } else if (e instanceof Zakko){
      const dx = (p.x + p.w/2) - (e.x + e.w/2);
      const dist = Math.abs(dx);
      e.vx = 0;
      if (dist < 240){
        const dir = Math.sign(dx);
        const aheadTx = Math.floor(((dir>0? e.right+1 : e.left-1))/TILE);
        const footTy = Math.floor((e.bottom+1)/TILE)+1;
        if (isSolid(tileAt(aheadTx, footTy))) e.vx = dir * e.speed;
      }
      moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      if (!e.remove && aabb(p,e)){
        if (p.rainbow>0){ e.remove=true; p.vy = -0.55*JUMP_VEL; continue; }
        if (handleSpecialCollision(p,e,specialMoves)) continue;
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){
          p.vy = -0.55*JUMP_VEL;
          if (!e.knocked){ e.knocked=true; e.h=80; e.y += 80; }
          else e.remove=true;
        } else if (p.invuln<=0){
          if (p.big){ 
            shrinkPlayer(p); 
            p.invuln=1; 
          } else { 
            p.lives--; 
            HUD.lives.textContent = p.lives; 
            if (p.lives<=0){ 
              HUD.msg.textContent="Game Over — press R or Jump to restart"; 
              world.state='gameover'; 
              playBeep(220,0.2,0.12); 
              return; 
            } 
            p.respawn(); 
            respawnAllEnemies(world);
          }
        }
      }
    } else if (e instanceof Ghost){
      moveWithCollisions(e, e.vx*dt, 0, true);
      e.y += Math.sin(world.time*2 + e.phase)*20*dt;
      if (!e.remove && aabb(p,e)){
        if (p.rainbow>0){ e.remove=true; p.vy=-0.55*JUMP_VEL; continue; }
        
        // Leo's special ability: immunity to enemies
        if (p.charId === 'leo') {
          const dir = p.x < e.x ? 1 : -1; // Direction away from Leo
          e.vx = dir * Math.max(Math.abs(e.vx || 100), 120); // Bounce enemy away
          playBeep(600, 0.08, 0.05); // Play bounce sound
          continue; // Leo takes no damage
        }
        
        if (p.invuln<=0){
          if (p.big){ 
            shrinkPlayer(p); 
            p.invuln=1; 
          } else { 
            p.lives--; 
            HUD.lives.textContent = p.lives; 
            if (p.lives<=0){ 
              HUD.msg.textContent="Game Over — press R or Jump to restart"; 
              world.state='gameover'; 
              playBeep(220,0.2,0.12); 
              return; 
            } 
            p.respawn(); 
            respawnAllEnemies(world);
          }
        }
      }
    } else if (e instanceof FireEnemy){
      moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      const aheadTx = Math.floor(((e.vx>0? e.right+1: e.left-1))/TILE);
      const footTy = Math.floor((e.bottom+1)/TILE)+1;
      if (!isSolid(tileAt(aheadTx, footTy)) && isSolid(tileAt(Math.floor(e.x/TILE), footTy))) e.vx *= -1;
      if (!e.remove && aabb(p,e)){
        if (p.rainbow>0){ e.remove=true; p.vy=-0.55*JUMP_VEL; continue; }
        if (handleSpecialCollision(p,e,specialMoves)) continue;
        
        // Leo's special ability: immunity to enemies
        if (p.charId === 'leo') {
          const dir = p.x < e.x ? 1 : -1; // Direction away from Leo
          e.vx = dir * Math.max(Math.abs(e.vx || 100), 120); // Bounce enemy away
          e.vy = -200; // Give enemy a small bounce up
          playBeep(600, 0.08, 0.05); // Play bounce sound
          continue; // Leo takes no damage
        }
        
        damagePlayer(p, world, HUD);
      }
    } else if (e instanceof Bird || e instanceof Butterfly){
      e.vy += (Math.sin(world.time*2) * e.range - (e.y - e.baseY)) * 2 * dt;
      e.x += e.vx*dt; e.y += e.vy*dt;
      if (e.baseX !== undefined && (e.x < e.baseX - 80 || e.x > e.baseX + 80)) e.vx *= -1;
      if (!e.remove && aabb(p,e)){
        if (p.rainbow>0){ e.remove=true; p.vy=-0.55*JUMP_VEL; continue; }
        if (handleSpecialCollision(p,e,specialMoves)) continue;
        
        // Leo's special ability: immunity to enemies
        if (p.charId === 'leo') {
          const dir = p.x < e.x ? 1 : -1; // Direction away from Leo
          e.vx = dir * Math.max(Math.abs(e.vx || 100), 120); // Bounce enemy away
          playBeep(600, 0.08, 0.05); // Play bounce sound
          continue; // Leo takes no damage
        }
        
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){ p.vy = -0.55*JUMP_VEL; e.remove=true; }
        else damagePlayer(p, world, HUD);
      }
    } else if (e instanceof Skeleton){
      if (e.state==='crumbled'){
        e.reformT += dt;
        if (e.reformT>3){ e.state='walk'; e.h=e.baseH; e.reformT=0; }
        continue;
      }
      moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      const aheadTx = Math.floor(((e.vx>0? e.right+1: e.left-1))/TILE);
      const footTy = Math.floor((e.bottom+1)/TILE)+1;
      if (!isSolid(tileAt(aheadTx, footTy)) && isSolid(tileAt(Math.floor(e.x/TILE), footTy))) e.vx *= -1;
      if (!e.remove && aabb(p,e)){
        if (p.rainbow>0){ e.state='crumbled'; e.h=6; e.reformT=0; p.vy=-0.55*JUMP_VEL; continue; }
        if (handleSpecialCollision(p,e,specialMoves)) continue;
        
        // Leo's special ability: immunity to enemies
        if (p.charId === 'leo') {
          const dir = p.x < e.x ? 1 : -1; // Direction away from Leo
          e.vx = dir * Math.max(Math.abs(e.vx || 100), 120); // Bounce enemy away
          e.vy = -200; // Give enemy a small bounce up
          playBeep(600, 0.08, 0.05); // Play bounce sound
          continue; // Leo takes no damage
        }
        
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){ p.vy = -0.55*JUMP_VEL; e.state='crumbled'; e.h=6; e.reformT=0; }
        else damagePlayer(p, world, HUD);
      }
    } else if (e instanceof Kangaroo){
      e.jumpT = (e.jumpT || 0) - dt;
      if (e.grounded && e.jumpT<=0){
        const dir = p.x < e.x ? -1 : 1;
        e.vx = dir * e.speed;
        e.vy = -0.9*JUMP_VEL;
        e.jumpT = 1;
      }
      moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      const aheadTx = Math.floor(((e.vx>0? e.right+1: e.left-1))/TILE);
      const footTy = Math.floor((e.bottom+1)/TILE)+1;
      if (!isSolid(tileAt(aheadTx, footTy)) && isSolid(tileAt(Math.floor(e.x/TILE), footTy))) e.vx *= -1;
      if (!e.remove && aabb(p,e)){
        if (p.rainbow>0){ e.remove=true; p.vy=-0.55*JUMP_VEL; continue; }
        if (handleSpecialCollision(p,e,specialMoves)) continue;
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){
          e.hp--; p.vy=-0.55*JUMP_VEL;
          if (e.hp<=0) e.remove=true;
        } else damagePlayer(p, world, HUD);
      }
    } else if (e instanceof Sunflower){
      moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      const aheadTx = Math.floor(((e.vx>0? e.right+1: e.left-1))/TILE);
      const footTy = Math.floor((e.bottom+1)/TILE)+1;
      if (!isSolid(tileAt(aheadTx, footTy)) && isSolid(tileAt(Math.floor(e.x/TILE), footTy))) e.vx *= -1;
      if (!e.remove && aabb(p,e)){
        if (p.rainbow>0){ p.vy=-0.55*JUMP_VEL; continue; }
        if (handleSpecialCollision(p,e,specialMoves)) continue;

        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){ p.vy = -4.5*JUMP_VEL; playBeep(600,0.08,0.05); }
        else damagePlayer(p, world, HUD);
      }
    } else {
      // Default enemy handling (Goombas, Snakes, and other basic enemies)
      moveWithCollisions(e, e.vx*dt, 0, true);
      moveWithCollisions(e, 0, e.vy*dt, true);
      
      // Update snake wiggling animation
      if (e.constructor.name === 'Snake') {
        e.update(dt, world);
      }
      
      // Basic AI: turn around at edges and walls (except for snakes which stay still)
      if (e.constructor.name !== 'Snake') {
        const aheadTx = Math.floor(((e.vx>0? e.right+1: e.left-1))/TILE);
        const footTy = Math.floor((e.bottom+1)/TILE)+1;
        if (!isSolid(tileAt(aheadTx, footTy)) && isSolid(tileAt(Math.floor(e.x/TILE), footTy))) {
          e.vx *= -1; // Turn around at edges
        }
      }
      
      // Player collision
      if (!e.remove && aabb(p,e)){
        if (p.rainbow>0){ 
          e.remove=true; 
          p.vy = -0.55*JUMP_VEL; 
          continue; 
        }
        if (handleSpecialCollision(p,e,specialMoves)) continue;
        
        // Leo's special ability: immunity to enemies
        if (p.charId === 'leo') {
          // Enemies bounce back from Leo
          const dir = p.x < e.x ? 1 : -1; // Direction away from Leo
          e.vx = dir * Math.abs(e.vx || 100); // Bounce enemy away
          e.vy = -200; // Give enemy a small bounce up
          playBeep(600, 0.08, 0.05); // Play bounce sound
          continue; // Leo takes no damage
        }
        
        // Snake collision - snakes are always deadly (cannot be stomped)
        if (e.constructor.name === 'Snake') {
          if (p.invuln <= 0) {
            damagePlayer(p, world, HUD);
          }
          continue;
        }
        
        const fromAbove = (p.vy>0) && (p.bottom - e.top < 18);
        if (fromAbove){
          // Player stomps on Goomba
          p.vy = -0.6*JUMP_VEL; // Bounce player up
          e.remove = true; // Remove the Goomba
          playBeep(440, 0.1, 0.05); // Play stomp sound
        } else if (p.invuln<=0){
          // Player gets hurt
          damagePlayer(p, world, HUD);
        }
      }
    }
  }
  world.enemies = world.enemies.filter(e=>!e.remove);

  for (const pc of world.popCoins){
    pc.y -= 60*dt; pc.life-=dt; if (pc.life<=0) pc.remove=true;
  }
  world.popCoins = world.popCoins.filter(pc=>!pc.remove);

  if (world.goal && rectOverlap(p.x,p.y,p.w,p.h, world.goal.x, world.goal.y, world.goal.w, world.goal.h)){
    if (world.state !== 'win'){
      const bonus = Math.max(1, Math.min(10, Math.floor((world.goal.y + world.goal.poleH - p.y)/TILE)));
      p.coins += bonus; HUD.coins.textContent=p.coins;
      HUD.msg.textContent = 'Nice! Bonus coins: '+bonus;
      playBeep(660,0.08,0.08);
      world.state = 'win'; world.winT=0;
    }
  }

  if (p.y > (H+2)*TILE){
    console.log('Player fell into pit! Player Y:', p.y, 'Threshold:', (H+2)*TILE);
    if (ability && ability.onPit){
      ability.onPit(p, world);
    } else if (p.charId === 'leo') {
      // Leo's special ability: float out of pits
      console.log('Leo floating out of pit');
      
      // Find a safe spot to teleport Leo to (search for solid ground ahead)
      let safeX = p.x + 200; // Try 200 pixels ahead first
      let foundSafe = false;
      
      // Search for the next solid ground platform within reasonable distance
      for (let searchX = p.x + 100; searchX < p.x + 500; searchX += TILE) {
        const tileX = Math.floor(searchX / TILE);
        // Look for solid ground from top to bottom
        for (let tileY = 0; tileY < H - 1; tileY++) {
          const currentTile = tileAt(tileX, tileY);
          const belowTile = tileAt(tileX, tileY + 1);
          // Found air above solid ground - this is a good landing spot
          if (currentTile === '_' && isSolid(belowTile)) {
            safeX = tileX * TILE;
            foundSafe = true;
            break;
          }
        }
        if (foundSafe) break;
      }
      
      // If no safe spot found, just move Leo forward and up
      if (!foundSafe) {
        safeX = p.x + 300;
      }
      
      // Teleport Leo to safety with floating animation
      p.x = safeX;
      p.y = 100; // High up in the air
      p.vy = -100; // Gentle downward float
      p.vx = 0; // Stop horizontal movement
      
      playBeep(800, 0.15, 0.1); // Play magical float sound
      HUD.msg.textContent = 'Leo floats to safety!';
    } else {
      p.lives--; HUD.lives.textContent = p.lives;
      if (p.lives<=0){ HUD.msg.textContent="Game Over — press R or Jump to restart"; world.state='gameover'; playBeep(220,0.2,0.12); return; }
      p.respawn();
      respawnAllEnemies(world);
    }
  }

  const targetCam = Math.max(0, p.x - CAM_MARGIN_X);
  world.camX += (targetCam - world.camX)*Math.min(1, 8*dt);
}
