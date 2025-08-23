import { Player } from './entities.js';
import { setupInput, keys } from './input.js';
import { applyPhysics } from './physics.js';
import { render } from './rendering.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const player = new Player(50, 500);
setupInput();

let last = performance.now();
function loop(ts) {
  const dt = (ts - last) / 1000;
  last = ts;
  applyPhysics(player, keys, dt);
  render(ctx, player);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
