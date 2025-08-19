import { TILE, COL } from './config.js';

export function render(ctx, entities) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = COL.ground;
  ctx.fillRect(0, ctx.canvas.height - TILE, ctx.canvas.width, TILE);
  for (const e of entities) {
    e.render(ctx);
  }
}
