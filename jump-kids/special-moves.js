import { JUMP_VEL } from './config.js';

// Special moves for each character
export const SPECIAL_MOVES = {
  lucy: {
    s1(p) {
      if (!p.grounded) return;
      p.vy = -JUMP_VEL * 1.5;
      p.grounded = false;
      p.action = 'flip';
      p.flip = 0;
    },
    s2(p) {
      if (p.action) return;
      p.action = 'cartwheel';
      p.lockControls = true;
      p.vx = 300 * p.facing;
      p.cartTime = 0.4;
    },
    update(p, dt) {
      if (p.action === 'flip') {
        p.flip += dt * Math.PI * 2;
        if (p.grounded) p.action = null;
      } else if (p.action === 'cartwheel') {
        p.cartTime -= dt;
        if (p.cartTime <= 0) {
          p.action = null;
          p.lockControls = false;
        }
      }
    },
    onEnemyCollide(p, e) {
      if (p.action === 'cartwheel') {
        e.x += p.facing * 40;
        e.vx = p.facing * 200;
        return true;
      }
      return false;
    },
  },
  joey: {
    s1(p) {
      p.invisible = 10;
    },
    s2(p) {
      if (p.action) return;
      p.action = 'spin';
      p.lockControls = true;
      p.vx = 320 * p.facing;
      p.spinTime = 0.35;
    },
    update(p, dt) {
      if (p.invisible > 0) p.invisible = Math.max(0, p.invisible - dt);
      if (p.action === 'spin') {
        p.spinTime -= dt;
        if (p.spinTime <= 0) {
          p.action = null;
          p.lockControls = false;
        }
      }
    },
    onEnemyCollide(p, e) {
      if (p.action === 'spin') {
        e.remove = true;
        return true;
      }
      return false;
    },
  },
  abe: {
    s1(p) {
      if (!p.grounded) return;
      p.vy = -JUMP_VEL;
      p.grounded = false;
      p.action = 'smash';
      p.lockControls = true;
      p.smashDown = false;
    },
    s2(p) {
      if (p.action) return;
      p.action = 'punch';
      p.lockControls = true;
      p.vx = 260 * p.facing;
      p.punchTime = 0.3;
    },
    update(p, dt, world) {
      if (p.action === 'smash') {
        if (p.vy > 0) p.smashDown = true;
        if (p.smashDown && p.grounded) {
          for (const e of world.enemies ?? []) {
            const ex = e.x + e.w / 2;
            const px = p.x + p.w / 2;
            const dist = Math.abs(ex - px);
            if (dist < 120) {
              e.x += Math.sign(ex - px) * 40;
              e.vx = Math.sign(ex - px) * 200;
            }
          }
          p.action = null;
          p.lockControls = false;
        }
      } else if (p.action === 'punch') {
        p.punchTime -= dt;
        if (p.punchTime <= 0) {
          p.action = null;
          p.lockControls = false;
        }
      }
    },
    onEnemyCollide(p, e) {
      if (p.action === 'punch') {
        e.remove = true;
        return true;
      }
      return false;
    },
  },
  leo: {
    update() {},
    onEnemyCollide(p, e) {
      e.remove = true;
      e.vx = Math.sign(e.x - p.x) * 200;
      e.vy = -200;
      return true;
    },
  },
};
