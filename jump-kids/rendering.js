import { TILE, COL } from './config.js';

export function render(ctx, player) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = COL.ground;
  ctx.fillRect(0, ctx.canvas.height - TILE, ctx.canvas.width, TILE);
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(player.x, player.y - player.h, player.w, player.h);
}
