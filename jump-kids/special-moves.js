import { JUMP_VEL, TILE } from './config.js';

// Build the special moves object given core helpers.
// `utils` should provide tileAt/isSolid/groundTopAt along with level dimensions.
export function createSpecialMoves(utils){
  const { W, H, tileAt, isSolid, groundTopAt } = utils;
  return {
  lucy: {
    s1(p){
      if(!p.grounded) return false;
      p.vy = -JUMP_VEL*1.5;
      p.grounded = false;
      p.action = 'flip';
      p.flip = 0;
      return true;
    },
    s2(p){
      if(p.action) return false;
      p.action = 'cartwheel';
      p.lockControls = true;
      p.vx = 300 * p.facing;
      p.cartTime = 0.4;
      p.cartRot = 0;
      return true;
    },
    s3(p){
      if(p.action) return false;
      p.action = 'backflip';
      p.lockControls = true;
      p.vy = -JUMP_VEL;
      p.vx = -200 * p.facing;
      p.grounded = false;
      p.flip = 0;
      return true;
    },
    s4(p,world){
      const proj={x:p.x+p.w/2 + p.facing*10, y:p.y+p.h/2, w:8,h:8, vx:p.facing*300, vy:0, gravity:false, type:'heart', grounded:false};
      world.projectiles.push(proj);
      return true;
    },
    update(p,dt){
      if(p.action==='flip'){
        p.flip += dt * Math.PI * 2;
        if(p.grounded) p.action=null;
      } else if(p.action==='cartwheel'){
        p.cartTime -= dt;
        p.cartRot += dt * Math.PI * 4;
        if(p.cartTime<=0){ p.action=null; p.lockControls=false; p.cartRot=0; }
      } else if(p.action==='backflip'){
        p.flip += dt * Math.PI * 2;
        if(p.grounded){ p.action=null; p.lockControls=false; }
      }
    },
    onEnemyCollide(p,e){
      if(p.action==='cartwheel'){
        e.x += p.facing*40;
        e.vx = p.facing*200;
        return true;
      }
      if(p.action==='backflip'){
        const dir = Math.sign((e.x+e.w/2) - (p.x+p.w/2));
        if(dir === -p.facing){
          e.remove = true;
          return true;
        }
      }
      return false;
    }
  },
  joey: {
    s1(p){
      p.invisible = 5; // Reduced from 10 to 5 seconds
      return true;
    },
    s2(p){
      if(!p.grounded) return false; // Must be grounded to start high jump
      p.vy = -JUMP_VEL * 1.5; // Same height as Lucy's S1
      p.grounded = false;
      p.action = 'spinJump';
      p.lockControls = true;
      p.spinRotation = 0;
      return true;
    },
    s3(p){
      if(p.action) return false;
      p.action = 'spinDash';
      p.lockControls = true;
      p.vx = 400 * p.facing;
      p.spinRotation = 0;
      p.spinTime = 0.5;
      return true;
    },
    s4(p,world){
      const proj={x:p.x+p.w/2 + p.facing*10, y:p.y+p.h/2, w:8,h:8, vx:p.facing*320, vy:0, gravity:false, type:'shuriken', grounded:false};
      world.projectiles.push(proj);
      return true;
    },
    update(p,dt){
      if(p.invisible>0) p.invisible = Math.max(0, p.invisible - dt);
      if(p.action==='spinJump'){
        p.spinRotation += dt * Math.PI * 4; // Fast spinning
        if(p.grounded) {
          p.action=null;
          p.lockControls=false;
          p.spinRotation = 0;
        }
      } else if(p.action==='spinDash'){
        p.spinTime -= dt;
        p.spinRotation += dt * Math.PI * 8;
        if(p.spinTime<=0){ p.action=null; p.lockControls=false; p.spinRotation=0; p.vx*=0.3; }
      }
    },
    onEnemyCollide(p,e){
      if(p.action==='spinJump' || p.action==='spinDash'){
        e.remove = true;
        return true;
      }
      return false;
    }
  },
  abe: {
    s1(p,world){
      if(!p.grounded) return false;
      p.vy = -JUMP_VEL * 1.3; // Higher jump for dramatic effect
      p.grounded = false;
      p.action = 'smash';
      p.lockControls = true;
      p.smashDown = false;
      return true;
    },
    s2(p){
      if(p.action) return false;
      p.action = 'punchRun';
      p.lockControls = true;
      p.vx = 400 * p.facing; // Fast forward charge
      p.punchTime = 0.5; // Duration of run
      return true;
    },
    s3(p){
      p.berserk = 5;
      return true;
    },
    s4(p,world){
      const proj={x:p.x+p.w/2 + p.facing*10, y:p.y+p.h/2, w:8,h:8, vx:p.facing*200, vy:-200, gravity:true, type:'balloon', grounded:false};
      world.projectiles.push(proj);
      return true;
    },
    update(p,dt,world){
      if(p.grounded) p.doubleJumped = false;
      if(p.berserk>0) p.berserk = Math.max(0, p.berserk - dt);
      if(p.action==='smash'){
        // When Abe reaches peak of jump, make him slam down fast
        if(p.vy > 0 && !p.smashDown) {
          p.smashDown = true;
          p.vy = 400; // Force fast downward velocity for dramatic slam
        }
        
        // When he hits the ground, create shockwave effect
        if(p.smashDown && p.grounded){
          // Create screen shake effect
          p.smashImpact = 0.3; // Duration of impact effect
          
          // Powerful shockwave that defeats nearby enemies
          for(const e of world.enemies){
            if(e.remove) continue;
            const ex = e.x + e.w/2;
            const px = p.x + p.w/2;
            const dist = Math.abs(ex - px);
            if(dist < 140){ // Larger range for smash
              e.remove = true; // Just mark for removal, don't modify position/velocity
            }
          }
          p.action = null;
          p.lockControls = false;
          p.smashDown = false;
        }
      } else if(p.action==='punchRun'){
        p.punchTime -= dt;
        if(p.punchTime<=0){
          p.action=null;
          p.lockControls=false;
          p.vx *= 0.3; // Slow down after rush
        }
      }
      
      // Handle smash impact animation
      if(p.smashImpact > 0) {
        p.smashImpact -= dt;
        if(p.smashImpact <= 0) {
          p.smashImpact = 0;
        }
      }
    },
    onEnemyCollide(p,e){
      if(p.berserk>0){
        const direction = Math.sign(e.x - p.x) || p.facing;
        e.x += direction * 80;
        e.vx = direction * 300;
        e.vy = -120;
        e.dazed = 1.5;
        return true;
      }
      if(p.action==='punchRun'){
        const direction = Math.sign(e.x - p.x) || p.facing;
        e.x += direction * 80; // Strong knockback
        e.vx = direction * 350;
        e.vy = -100; // Launch slightly upward
        return true; // Abe takes no damage
      }
      return false;
    }
  },
  leo: {
    s4(p,world){
      const proj={x:p.x+p.w/2 + p.facing*10, y:p.y+p.h/2, w:8,h:8, vx:p.facing*200, vy:-200, gravity:true, type:'diaper', grounded:false};
      world.projectiles.push(proj);
      return true;
    },
    update(p,dt,world,keys){
      if(p.action==='bubble'){
        p.vx = 0;
        p.vy = -80;
        if(!keys.jump || keys.left || keys.right || keys.dash || keys.up || keys.down){
          p.action=null;
          p.lockControls=false;
          p.bubbleHold = 0;
        }
        return;
      }
      if(keys.jump){
        p.bubbleHold = (p.bubbleHold||0) + dt;
        if(p.bubbleHold>=3){
          p.action='bubble';
          p.lockControls=true;
          p.vx=0;
          p.vy=-80;
        }
      } else {
        p.bubbleHold = 0;
      }
    },
    onEnemyCollide(p,e){
      e.remove = true;
      e.vx = Math.sign(e.x - p.x) * 200;
      e.vy = -200;
      return true;
    },
    onPit(p,world){
      let tx = Math.floor(p.x / TILE) + 1;
      while(tx < W && !isSolid(tileAt(tx, H-1))) tx++;
      p.x = tx * TILE;
      p.y = groundTopAt(tx,0) - p.h;
      p.vx = 0; p.vy = 0; p.grounded = true;
    }
  }
  };
}
