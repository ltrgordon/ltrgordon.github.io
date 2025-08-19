import { applyPhysics } from './physics.js';

export class Entity {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  update() {}

  render() {}
}

export class Player extends Entity {
  constructor(x, y) {
    super(x, y, 20, 28);
    this.vx = 0;
    this.vy = 0;
  }

  update(dt, keys) {
    applyPhysics(this, keys, dt);
  }

  render(ctx) {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(this.x, this.y - this.h, this.w, this.h);
  }
}
