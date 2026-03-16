(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SnakeLogic = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  function isOppositeDirection(a, b) {
    return (
      (a === 'up' && b === 'down') ||
      (a === 'down' && b === 'up') ||
      (a === 'left' && b === 'right') ||
      (a === 'right' && b === 'left')
    );
  }

  function toCellKey(cell) {
    return cell.x + ',' + cell.y;
  }

  function randomIndex(length, randomFn) {
    if (length <= 1) {
      return 0;
    }
    const n = randomFn();
    if (n >= 1) {
      return length - 1;
    }
    if (n <= 0) {
      return 0;
    }
    return Math.floor(n * length);
  }

  function spawnFood(cols, rows, snake, randomFn) {
    const occupied = new Set(snake.map(toCellKey));
    const open = [];

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (!occupied.has(x + ',' + y)) {
          open.push({ x: x, y: y });
        }
      }
    }

    if (open.length === 0) {
      return null;
    }

    const rng = randomFn || Math.random;
    return open[randomIndex(open.length, rng)];
  }

  function createInitialState(config) {
    const settings = Object.assign({ cols: 16, rows: 16, randomFn: Math.random }, config || {});
    const startX = Math.floor(settings.cols / 2);
    const startY = Math.floor(settings.rows / 2);
    const snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];

    return {
      cols: settings.cols,
      rows: settings.rows,
      snake: snake,
      direction: 'right',
      queuedDirection: 'right',
      food: spawnFood(settings.cols, settings.rows, snake, settings.randomFn),
      score: 0,
      status: 'running'
    };
  }

  function queueDirection(state, requestedDirection) {
    if (!DIRECTIONS[requestedDirection]) {
      return state;
    }

    if (state.status !== 'running') {
      return state;
    }

    if (isOppositeDirection(state.direction, requestedDirection)) {
      return state;
    }

    return Object.assign({}, state, { queuedDirection: requestedDirection });
  }

  function togglePause(state) {
    if (state.status === 'running') {
      return Object.assign({}, state, { status: 'paused' });
    }
    if (state.status === 'paused') {
      return Object.assign({}, state, { status: 'running' });
    }
    return state;
  }

  function isOutOfBounds(cell, cols, rows) {
    return cell.x < 0 || cell.y < 0 || cell.x >= cols || cell.y >= rows;
  }

  function hitsBody(newHead, snakeBody) {
    for (let i = 0; i < snakeBody.length; i += 1) {
      if (snakeBody[i].x === newHead.x && snakeBody[i].y === newHead.y) {
        return true;
      }
    }
    return false;
  }

  function stepGame(state, randomFn) {
    if (state.status !== 'running') {
      return state;
    }

    const nextDirection = state.queuedDirection || state.direction;
    const velocity = DIRECTIONS[nextDirection];
    const currentHead = state.snake[0];
    const nextHead = {
      x: currentHead.x + velocity.x,
      y: currentHead.y + velocity.y
    };

    if (isOutOfBounds(nextHead, state.cols, state.rows)) {
      return Object.assign({}, state, {
        direction: nextDirection,
        status: 'game_over'
      });
    }

    const eating = Boolean(state.food && nextHead.x === state.food.x && nextHead.y === state.food.y);
    const collisionBody = eating ? state.snake : state.snake.slice(0, state.snake.length - 1);
    if (hitsBody(nextHead, collisionBody)) {
      return Object.assign({}, state, {
        direction: nextDirection,
        status: 'game_over'
      });
    }

    const nextSnake = [nextHead].concat(state.snake);
    if (!eating) {
      nextSnake.pop();
    }

    const rng = randomFn || Math.random;
    const nextFood = eating ? spawnFood(state.cols, state.rows, nextSnake, rng) : state.food;

    return Object.assign({}, state, {
      snake: nextSnake,
      direction: nextDirection,
      queuedDirection: nextDirection,
      food: nextFood,
      score: state.score + (eating ? 1 : 0)
    });
  }

  function restartGame(state, randomFn) {
    return createInitialState({ cols: state.cols, rows: state.rows, randomFn: randomFn || Math.random });
  }

  return {
    createInitialState: createInitialState,
    queueDirection: queueDirection,
    stepGame: stepGame,
    togglePause: togglePause,
    restartGame: restartGame,
    spawnFood: spawnFood,
    isOppositeDirection: isOppositeDirection
  };
}));
