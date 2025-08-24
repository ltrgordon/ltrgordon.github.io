# Jump Kids

A small, modular browser platformer inspired by classic side‑scrollers. This version factors the UI (HTML/CSS) and gameplay (JS) into separate files for easier iteration and reuse.  Gameplay code now uses ES modules for clearer dependencies and easier maintenance. The core logic is further split into focused modules (`entities.js`, `input.js`, `physics.js`, `rendering.js`) that keep features identical while making future upgrades simpler.  Assets such as levels and enemy parameters live under `assets/` so art and sound can be swapped without touching logic.

## Overview
- Canvas‑based runner/platformer with tile collisions and simple entities.
- Single level that is programmatically extended to ~2× length with a tougher, higher second half. Additional levels can be listed in `assets/levels/levels.json` and loaded without code changes.
- Checkpoint and end‑goal flags; victory overlay shows stats.
- Keyboard and mobile button controls.
- Built‑in level editor accessible from the start menu for creating or modifying stages.

## How to Play
- Open `index.html` in any modern browser.
- Keyboard: Left/Right to move, Space or Z to jump, D to dash, Up/Down (or W/Arrow keys) to climb ladders, S for S1, F for S2 and E for S3.
- P to pause/resume. After Game Over, press R or Jump to restart.
- Mobile: Use the on‑screen buttons.

## Key Features
- Movement: acceleration, friction, gravity, jump; Dash boosts run speed and jump height.
- Jump feel: coyote time and jump buffering for more forgiving mobile/keyboard input.
- Stable collisions: consistent tile mapping + ground snapping to eliminate jitter and sinking.
- Camera: follows the player with horizontal lead for better visibility.
- Collectibles: coins float and bob; count shown in the HUD.
- Refreshed artwork: player characters and enemies feature more detailed, dynamic canvas sprites.
- Shamrock power‑ups: scattered through the level, they make the player bigger and able to take one extra hit; grabbing another while already big awards 5 coins.
- Rainbow power‑ups: rare pickups that grant 30 seconds of invincibility.
- Mega mushroom power‑ups: briefly grow huge and invincible for 15 seconds but disable jumping.
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
- Deep cavern section beneath the underground path filled with extra enemies, moving platforms, and frequent spike pits.
- Spike pits bridged by small moving platforms.
- Ladders connecting upper, underground, and cavern paths.
- Rolling hills span the surface while the lower routes reveal a spooky underground cave backdrop.
- DPI aware canvas sizing; mobile controls; no tile culling to simplify rendering.

## Characters & Special Moves
- **Lucy** – S1 high back‑flip jump reaching 1.5× normal height; S2 spinning cartwheel forward that knocks back enemies in her path; S3 backflip attack defeating foes behind her.
- **Joey** – S1 invisibility for 10 seconds so sight‑based enemies ignore him; S2 ninja spin dash that knocks down foes; S3 forward leg sweep that defeats enemies ahead.
- **Abe** – S1 ground smash that sends a shockwave staggering nearby enemies; S2 running punch that knocks back enemies with gloves held out front; S3 midair double jump for extra height.
- **Leo** – Hold jump for 3 s to form a bubble and float upward until released; jumps half as high, is invincible to enemies, and floats out of pits instead of falling.

## Tile/Map Encoding
The level is an ASCII grid split across two arrays in `game.js`:
- `BASE`: starting section.
- `EXT`: second half appended to the right.

Alternatively, levels can be loaded from `assets/levels/level1.json` (auto‑loaded at startup) or any file listed in `assets/levels/levels.json`. If loading the JSON fails (e.g., due to `file://` restrictions), the built‑in level is used.

Legend (selected):
- `#`: solid ground
- `=`: brick/platform
- `C`: coin
- `E`: Goomba enemy (configurable via `assets/enemies.json`)
- `H`: Hellmonk enemy (configurable via `assets/enemies.json`)
- `K`: checkpoint flag
- `G`: goal flag (the rightmost `G` becomes the end goal)
- `P`: player spawn (column)
- `R`: shamrock power‑up
- `N`: rainbow power‑up (invincibility)
- `U`: mega mushroom power‑up (giant invincible form, no jumping)
- `O`: ghost enemy
- `F`: fire enemy
- `S`: bird enemy
- `M`: moving platform (two tiles wide)
- `X`: skeleton enemy that crumbles and reforms
- `T`: trapdoor
- `L`: ladder
- `^`: spike hazard

Tiles are 32×32 px. World Y↔tile mapping uses a consistent “(ty-1)*TILE” convention for collision and rendering.

## Code Structure

- `config.js` – Centralized constants for physics, controls, and colors.
- `entity.js` – Base `Entity` class with update/render hooks.
- `entities.js` – Level data, tile helpers, enemy configuration support, and concrete entity types plus world builder.
- `input.js` – Keyboard/mobile input listeners and simple audio helpers.
- `physics.js` – Movement, collisions, enemy AI, and game rules.
- `rendering.js` – Canvas drawing utilities and DPI‑aware canvas fitting.
- `special-moves.js` – Character abilities built via a factory and imported by the main game.
- `game.js` – Small orchestrator that ties the modules together, handles menus, and runs the loop.
- `index.html` – Layout, HUD, canvas, on‑screen buttons; loads `game.js` and `styles.css`.
- `styles.css` – Light, responsive UI and controls styling.
- `assets/` – Level files, enemy parameters, and placeholders for images and audio.

See `developers.md` for a deeper tour of the loop, level format, and common extension points.

## Customization Tips
- Use the start‑menu level editor to create new stages or tweak existing ones. Pick a backdrop, then click tiles to place ground (`#`), platforms (`=`), moving platforms (`M`), power‑ups (`R`, `N`, `U`), enemies (`E`, `H`, `F`, `X`), checkpoints (`K`), goal flags (`G`), and coins (`C`). Save downloads a JSON file compatible with `assets/levels/levels.json`.
- Level layout: edit the `BASE`/`EXT` strings in `entities.js`, or modify `assets/levels/level1.json`. Keep arrays the same height and update `assets/levels/levels.json` to list new level files.
- Add enemies: place `E`, `H`, etc. where you want; tweak behaviors in `assets/enemies.json` or add new symbols there.
- Move flags: `K` sets the checkpoint; the rightmost `G` becomes the goal.
- Tuning: adjust movement/gravity constants at the top of `game.js`.

## Troubleshooting
- JSON not loading: opening via `file://` may block `fetch`. Host via a simple server (e.g., `python -m http.server`) or rely on the built‑in level.
- Overlay off‑screen: the overlay uses canvas CSS pixels (canvas size divided by `devicePixelRatio`); ensure the canvas is visible and not constrained by the page.
- Floating flags: poles are anchored using `surfaceTopAt`/`groundTopAt`. If you place a flag above a hollow area, ensure there is solid ground somewhere in that column.
- Blank canvas: this build avoids tile culling and uses simple shapes for broad browser support. Reload or check console if issues persist.

## License
Personal/educational use. Replace or adapt as needed for your project.
