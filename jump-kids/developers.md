# Jump Kids Developer Guide

This document summarizes how the Jump Kids demo is structured so you can extend it.

## Game Loop
The main loop lives in `game.js` and runs `update` then `draw` every frame via `requestAnimationFrame`. The heavy lifting is split into modules:
- `input.js` maintains key state and unlocks simple audio effects.
- `physics.js` advances the world, resolves collisions and enemy AI, and updates the camera.
- `rendering.js` draws the level, entities, HUD overlays and handles canvas DPI fitting.
`game.js` only coordinates these modules and manages menus and level loading.

## Level Format
Levels are ASCII grids defined by `BASE` and `EXT` arrays in `entities.js`. Each row represents tiles from left to right; `EXT` is appended to the right of `BASE` at load time. External level files live in `assets/levels/` and are listed in `assets/levels/levels.json` so new levels can be plugged in without modifying code. A sample tile legend:
- `#` ground block
- `=` brick/platform
- `C` coin
- `E` Goomba enemy
- `H` Hellmonk enemy
- `K` checkpoint flag
- `G` goal flag (rightmost becomes the end goal)
- `P` player spawn column
- `T` trapdoor, `L` ladder, `^` spikes
`assets/levels/level1.json` uses the same format and can be swapped in from the menu.

When the player descends beyond roughly 12 tiles, the renderer automatically replaces the hills with a dark cave backdrop.

## Extension Points
- **Add enemies or items**: place new characters in the level grid and create corresponding classes in `entities.js` plus behavior in `physics.js` and drawing in `rendering.js`. Enemy parameters (speed, jump power, etc.) can be tweaked or extended in `assets/enemies.json` without touching code.
- **New special moves**: implement abilities in `special-moves.js` and map them to character IDs.
- **Custom levels**: provide another JSON file with `base` and `ext` arrays, add it to `assets/levels/levels.json`, and the menu will pick it up.
- **Rendering tweaks**: `rendering.js` exposes helpers such as `ellipsePath` if you need to draw new shapes.

Each module is intentionally small and focused; feel free to duplicate the pattern when adding new systems.
