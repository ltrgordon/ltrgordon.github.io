# Jump Kids

A small, modular browser platformer inspired by classic side‑scrollers.
This build uses modern ES modules with explicit imports/exports and a base entity system with update/render hooks.
The UI (HTML/CSS) and gameplay (JS) are separated for easier iteration and reuse.

## Overview

- Canvas‑based runner/platformer with tile collisions and simple entities.
- Single level that is programmatically extended to ~2× length with a tougher, higher second half.
- Checkpoint and end‑goal flags; victory overlay shows stats.
- Keyboard and mobile button controls.
- Start menu with character preview and level selection.

## How to Play

- Open `index.html` in any modern browser.
- Keyboard: Left/Right to move, Space or Z to jump, D to dash, Up/Down (or W/Arrow keys) to climb ladders, S for S1 and F for S2.
- P to pause/resume. After Game Over, press R or Jump to restart.
- Mobile: Use the on‑screen buttons.

## Key Features

- Movement: acceleration, friction, gravity, jump; Dash boosts run speed and jump height.
- Jump feel: coyote time and jump buffering for more forgiving mobile/keyboard input.
- Stable collisions: consistent tile mapping + ground snapping to eliminate jitter and sinking.
- Camera: follows the player with horizontal lead for better visibility.
- Collectibles: coins float and bob; count shown in the HUD.
- Shamrock power‑ups: scattered through the level, they make the player bigger and able to take one extra hit; grabbing another while already big awards 5 coins.
- Rainbow power‑ups: rare pickups that grant 30 seconds of invincibility.
- Enemies:
  - Goomba: walks back and forth, turns at edges; stomp to defeat.
  - Hellmonk: monkey with a bright yellow helmet. If you stomp it, you bounce (it doesn’t die). When close, it jumps in surprise, then rushes the player.
  - Ghost: drifts through the lower spooky path.
  - Fireball: rolling flame enemy that patrols the underground.
  - Skeleton: collapses into bones when stomped, then reassembles.
- Swooping bird: guards the high moving platforms and dives at nearby players.
- Flags:
  - Checkpoint (black‑and‑white checkered): touching it updates the respawn point.
  - End goal (Irish flag): anchored on a pole that rises from the platform. Touching the pole awards 1–10 bonus coins based on hit height, ends the level, and shows the victory overlay.
- Victory overlay: centered splash with Coins and Time plus a simple victory dance.
- Pause: press P to pause/resume; shows a minimal overlay.
- SFX: simple beeps and a coin pickup sound (unlocked on first input).
- Moving platforms and high‑altitude coins with swooping bird enemies.
- Trapdoors leading to multi‑floor underground routes.
- Spike pits bridged by small moving platforms.
- Ladders connecting upper and lower paths.
- Rolling hills span the background for the entire level.
- DPI aware canvas sizing; mobile controls; no tile culling to simplify rendering.

## Characters & Special Moves

- **Lucy** – S1 high back‑flip jump reaching 1.5× normal height; S2 cartwheel that pushes enemies backward.
- **Joey** – S1 invisibility for 10 seconds so sight‑based enemies ignore him; S2 ninja spin dash that knocks down foes.
- **Abe** – S1 ground smash that sends a shockwave staggering nearby enemies; S2 running punch that knocks down anything in his path.
- **Leo** – No special moves. Jumps half as high, is invincible to enemies, and floats out of pits instead of falling.

## Tile/Map Encoding

The level is an ASCII grid split across two arrays in `game.js`:

- `BASE`: starting section.
- `EXT`: second half appended to the right.

Alternatively, levels can be loaded from `level1.json` (auto‑loaded at startup). If loading the JSON fails (e.g., due to `file://` restrictions), the built‑in level is used.

Legend (selected):

- `#`: solid ground
- `=`: brick/platform
- `C`: coin
- `E`: Goomba enemy
- `H`: Hellmonk enemy
- `K`: checkpoint flag
- `G`: goal flag (the rightmost `G` becomes the end goal)
- `P`: player spawn (column)
- `R`: shamrock power‑up
- `N`: rainbow power‑up (invincibility)
- `O`: ghost enemy
- `F`: fire enemy
- `S`: bird enemy
- `M`: moving platform (two tiles wide)
- `X`: skeleton enemy that crumbles and reforms
- `T`: trapdoor
- `L`: ladder
- `^`: spike hazard

Tiles are 32×32 px. World Y↔tile mapping uses a consistent “(ty-1)\*TILE” convention for collision and rendering.

## Code Structure

- `index.html` – Layout, HUD, menu and canvas; loads the `game.js` module.
- `styles.css` – Responsive UI and controls styling.
- `config.js` – Core constants and character definitions.
- `entities.js` – Base `Entity` class and `Player` implementation with update/render hooks.
- `menu.js` – Character and level selection; resolves when the player starts the game.
- `levels.js` – Level metadata for the menu.
- `special-moves.js` – Character abilities exported as an ES module.
- `game.js` – Entry point tying input, entities, rendering and the start menu together.

## Customization Tips

- Level layout: edit the `BASE`/`EXT` strings in `game.js`, or modify `level1.json`. Keep arrays the same height.
- Add enemies: place `E` or `H` where you want; logic auto‑spawns them.
- Move flags: `K` sets the checkpoint; the rightmost `G` becomes the goal.
- Tuning: adjust movement/gravity constants at the top of `game.js`.

## Troubleshooting

- JSON not loading: opening via `file://` may block `fetch`. Host via a simple server (e.g., `python -m http.server`) or rely on the built‑in level.
- Overlay off‑screen: the overlay uses canvas CSS pixels (canvas size divided by `devicePixelRatio`); ensure the canvas is visible and not constrained by the page.
- Floating flags: poles are anchored using `surfaceTopAt`/`groundTopAt`. If you place a flag above a hollow area, ensure there is solid ground somewhere in that column.
- Blank canvas: this build avoids tile culling and uses simple shapes for broad browser support. Reload or check console if issues persist.

## License

Personal/educational use. Replace or adapt as needed for your project.
