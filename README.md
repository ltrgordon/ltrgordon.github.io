# ltrgordon.github.io

This repository contains the source for a static personal site featuring several classic-inspired mini-games:

- Jump Kids — dash, jump, and clear the level.
- Beamer — a pong-style battle with light refraction through a lens.
- Jump Abe — race Abe's monster truck.
- Peg Solitaire+ — triangle, English, and European boards with hints, color selection, and high-score tracking.
- Peg Game — the classic triangular peg-jumping puzzle with named high scores.
- Snake — a classic grid-based snake game with keyboard and touch controls.

## Development

The `beamer` and `snake` games use small utility modules (`beamer/utils.js` and `snake/logic.js`) so core game logic can be reused by both the browser runtime and automated tests.

### Running Tests

Tests are implemented using Node's built-in `assert` module. To run them:

```bash
npm test
```

The test suite exercises core game logic, including lens material/handicap calculations and Snake movement/collision behavior.

## Archived Authentication Code

The previous client-side homepage login gate has been moved to `auth/` for future reuse.

