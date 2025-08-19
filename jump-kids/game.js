import { Player } from './entities.js';
import { setupInput, keys } from './input.js';
import { render } from './rendering.js';
import { initMenu } from './menu.js';
import { SPECIAL_MOVES } from './special-moves.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

setupInput();

let last = 0;
const entities = [];

function loop(ts) {
  const dt = (ts - last) / 1000;
  last = ts;
  for (const e of entities) {
    e.update(dt, keys);
  }
  render(ctx, entities);
  requestAnimationFrame(loop);
}

initMenu().then(({ character }) => {
  const player = new Player(50, 500);
  player.specialMoves = SPECIAL_MOVES[character];
  entities.push(player);
  requestAnimationFrame(loop);
});
