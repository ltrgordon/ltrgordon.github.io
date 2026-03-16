const assert = require('assert');
const {
  createInitialState,
  queueDirection,
  stepGame,
  spawnFood
} = require('../snake/logic.js');

function makeRng(value) {
  return function () {
    return value;
  };
}

// Movement advances head by one cell and keeps length when not eating.
{
  const state = createInitialState({ cols: 8, rows: 8, randomFn: makeRng(0) });
  const next = stepGame(state, makeRng(0));

  assert.strictEqual(next.snake[0].x, state.snake[0].x + 1);
  assert.strictEqual(next.snake[0].y, state.snake[0].y);
  assert.strictEqual(next.snake.length, state.snake.length);
}

// Opposite direction changes are ignored.
{
  const state = createInitialState({ cols: 8, rows: 8, randomFn: makeRng(0) });
  const queued = queueDirection(state, 'left');
  assert.strictEqual(queued.direction, 'right');
  assert.strictEqual(queued.queuedDirection, 'right');
}

// Eating food grows snake and increments score.
{
  const state = {
    cols: 8,
    rows: 8,
    snake: [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }],
    direction: 'right',
    queuedDirection: 'right',
    food: { x: 4, y: 3 },
    score: 0,
    status: 'running'
  };

  const next = stepGame(state, makeRng(0));
  assert.strictEqual(next.score, 1);
  assert.strictEqual(next.snake.length, 4);
  assert.deepStrictEqual(next.snake[0], { x: 4, y: 3 });
}

// Wall collision ends the game.
{
  const state = {
    cols: 5,
    rows: 5,
    snake: [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }],
    direction: 'right',
    queuedDirection: 'right',
    food: { x: 0, y: 0 },
    score: 0,
    status: 'running'
  };

  const next = stepGame(state, makeRng(0));
  assert.strictEqual(next.status, 'game_over');
}

// Self collision ends the game.
{
  const state = {
    cols: 6,
    rows: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 2 },
      { x: 3, y: 1 },
      { x: 2, y: 1 }
    ],
    direction: 'down',
    queuedDirection: 'right',
    food: { x: 0, y: 0 },
    score: 0,
    status: 'running'
  };

  const next = stepGame(state, makeRng(0));
  assert.strictEqual(next.status, 'game_over');
}

// Food placement avoids occupied cells.
{
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 }
  ];
  const food = spawnFood(2, 2, snake, makeRng(0));
  assert.deepStrictEqual(food, { x: 1, y: 1 });
}

console.log('All snake tests passed.');
