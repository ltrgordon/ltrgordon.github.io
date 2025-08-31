# ltrgordon.github.io

This repository contains the source for a static personal site featuring several classic-inspired mini-games:

- Jump Kids — dash, jump, and clear the level.
- Beamer — a pong-style battle with light refraction through a lens.
- Jump Abe — race Abe's monster truck.
- Peg Solitaire+ — triangle, English, and European boards with hints, color selection, and high-score tracking.
- Peg Game — the classic triangular peg-jumping puzzle with named high scores.

## Development

The `beamer` game uses a small set of utility functions for lens physics and paddle handicaps. These functions are defined in `beamer/utils.js` so they can be reused both by the game and by automated tests.

### Running Tests

Tests are implemented using Node's built-in `assert` module. To run them:

```bash
npm test
```

The test suite exercises the utility functions to ensure lens materials and handicap calculations behave as expected.
