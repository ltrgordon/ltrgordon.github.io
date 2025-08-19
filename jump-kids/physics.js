import { GRAVITY, MOVE_ACC, MOVE_MAX, FRICTION } from './config.js';

export function applyPhysics(entity, keys, dt) {
  const acc = MOVE_ACC * (keys.dash ? 1.5 : 1);
  const max = MOVE_MAX * (keys.dash ? 1.5 : 1);
  if (keys.left) entity.vx = Math.max(-max, entity.vx - acc * dt);
  if (keys.right) entity.vx = Math.min(max, entity.vx + acc * dt);
  if (!keys.left && !keys.right) {
    if (entity.vx > 0) entity.vx = Math.max(0, entity.vx - FRICTION * dt);
    if (entity.vx < 0) entity.vx = Math.min(0, entity.vx + FRICTION * dt);
  }
  entity.vy += GRAVITY * dt;
  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;
  if (entity.y > 500) {
    entity.y = 500;
    entity.vy = 0;
  }
}
