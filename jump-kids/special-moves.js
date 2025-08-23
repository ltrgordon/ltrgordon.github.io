import { JUMP_VEL, TILE } from './config.js';

// Build the special moves object given core helpers.
// `utils` should provide tileAt/isSolid/groundTopAt along with level dimensions.
export function createSpecialMoves(utils){
  const { W, H, tileAt, isSolid, groundTopAt } = utils;
  return {
  lucy: {
    s1(p){
      if(!p.grounded) return;
      p.vy = -JUMP_VEL*1.5;
      p.grounded = false;
      p.action = 'flip';
      p.flip = 0;
    },
    s2(p){
      if(p.action) return;
      p.action = 'cartwheel';
      p.lockControls = true;
      p.vx = 300 * p.facing;
      p.cartTime = 0.4;
    },
    update(p,dt){
      if(p.action==='flip'){
        p.flip += dt * Math.PI * 2;
        if(p.grounded) p.action=null;
      } else if(p.action==='cartwheel'){
        p.cartTime -= dt;
        if(p.cartTime<=0){ p.action=null; p.lockControls=false; }
      }
    },
    onEnemyCollide(p,e){
      if(p.action==='cartwheel'){
        e.x += p.facing*40;
        e.vx = p.facing*200;
        return true;
      }
      return false;
    }
  },
  joey: {
    s1(p){
      p.invisible = 10;
    },
    s2(p){
      if(p.action) return;
      p.action = 'spin';
      p.lockControls = true;
      p.vx = 320 * p.facing;
      p.spinTime = 0.35;
    },
    update(p,dt){
      if(p.invisible>0) p.invisible = Math.max(0, p.invisible - dt);
      if(p.action==='spin'){
        p.spinTime -= dt;
        if(p.spinTime<=0){ p.action=null; p.lockControls=false; }
      }
    },
    onEnemyCollide(p,e){
      if(p.action==='spin'){
        e.remove = true;
        return true;
      }
      return false;
    }
  },
  abe: {
    s1(p,world){
      if(!p.grounded) return;
      console.log('Abe S1 triggered - starting smash');
      p.vy = -JUMP_VEL * 1.3; // Higher jump for dramatic effect
      p.grounded = false;
      p.action = 'smash';
      p.lockControls = true;
      p.smashDown = false;
    },
    s2(p){
      if(p.action) return;
      p.action = 'rush';
      p.lockControls = true;
      p.vx = 400 * p.facing; // Fast forward charge
      p.rushTime = 0.5; // Duration of rush
    },
    update(p,dt,world){
      if(p.action==='smash'){
        // When Abe reaches peak of jump, make him slam down fast
        if(p.vy > 0 && !p.smashDown) {
          console.log('Abe starting slam down');
          p.smashDown = true;
          p.vy = 400; // Force fast downward velocity for dramatic slam
        }
        
        // When he hits the ground, create shockwave effect
        if(p.smashDown && p.grounded){
          console.log('Abe smash impact!');
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
      } else if(p.action==='rush'){
        p.rushTime -= dt;
        if(p.rushTime<=0){ 
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
      if(p.action==='rush'){
        // Rush attack knocks enemies back and defeats them
        e.remove = true;
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
    update(p,dt){},
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
