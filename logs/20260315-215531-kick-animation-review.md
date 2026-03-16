# Robo-Fight kick animation evaluation and implementation plan

Timestamp: 2026-03-15 21:55:31
Repository: `/workspace/ltrgordon.github.io`
Target file reviewed: `robo-fight/index.html`

## 1) How kicks are currently animated (detailed)

### A. Kick state lifecycle
- Kicks are started in `Fighter.attack(kind)`. The kick branch sets:
  - longer kick cooldown (`this.kickCooldown = 1.18`),
  - a longer animation window (`phaseDur = 0.54`),
  - attack phase progression (windup → extend → retract),
  - a hit packet (`this.activeHit`) with `reach`, `height`, `stun`, etc.
- The per-frame phase timer in `Fighter.update()` moves `attackPhase` from 1 to 2 to 3 using fixed fractions of `attackPhaseMax`.

### B. Pose math in drawRobot()
- Kick rendering is driven by two local joint angles:
  - `kickThighAngle`: rotation at hip.
  - `kickShinAngle`: rotation at knee (relative to thigh).
- The code computes a speed-based factor:
  - `kickSpeedFactor = clamp((robot.speed - 140)/(420 - 140), 0, 1)`.
- The strongest extension pose uses:
  - `kickExtendThigh = -PI * (0.82 + kickSpeedFactor * 0.22)`.
- Phase-specific motion:
  - **Phase 1 (windup):** thigh lifts, shin folds.
  - **Phase 2 (strike):** shin is set to `-kickThighAngle` to cancel parent rotation and make the full leg straight.
  - **Phase 3 (retract):** both joints partially fold back.
- The front leg is drawn as a two-segment chain:
  - hip pivot at `(hipX = w*0.08, hipY = -h*0.26)`,
  - thigh length `0.28h`, shin length `0.24h`,
  - plus a boot shape at shin tip.

### C. Hit registration is not tied to boot tip
- `tryHit()` uses an abstract hit point:
  - `hitY = attacker.y - attacker.h * hit.height` (scalar height value from attack data),
  - defender comparison point `defY = defender.y - defender.h * 0.52`,
  - hit if `abs(defY - hitY) < 120` and horizontal reach passes.
- For standard kicks, `hit.height` is set by speed to `0.72 .. 0.92`.

## 2) Why kicks never rise above heads

There are **two limiting factors**:

### A. Geometric limit of current leg rig
- The striking leg starts at hip y `-0.26h`.
- Total leg length is `0.28h + 0.24h = 0.52h`.
- Even if leg points nearly straight upward, max vertical rise from hip is at most ~`0.52h`.
- So the boot tip can only reach roughly `-0.78h` from fighter base (`-0.26h - 0.52h`).
- The head top is drawn around `-1.08h` (torso at `-0.88h`, head extends another `~0.20h` upward), so the boot remains well below head level.

### B. Gameplay hit logic decouples from real foot position
- Collision uses an abstract `hit.height` and fixed defender sample point (`defY = y - 0.52h`), not the actual boot-tip world coordinate.
- This allows "mid/high" hits numerically while visuals remain below the head.
- Result: you cannot reliably produce true head-height contact visuals.

## 3) Alternative approach that supports true head kicks

Use **target-based two-bone IK + foot-tip collision** for kicks.

### Core idea
1. Define a **world-space foot target trajectory** (windup, strike, retract) instead of hard-coded joint angles.
2. Solve hip/knee angles each frame with 2-bone IK so the boot tip reaches that target.
3. Compute hitboxes from actual boot tip + shin segment instead of `hit.height` scalar.

This keeps style while making high kicks physically plausible and consistent with collisions.

## 4) Step-by-step implementation instructions for an AI agent

### Step 1 — Add kick rig helpers (pure math)
1. In `robo-fight/index.html`, add utility functions near other helpers:
   - `getKickRig(fighter)` returning `{hipX, hipY, thighLen, shinLen}` in local robot space.
   - `solveTwoBoneIK(hip, target, len1, len2, bendDir=1)` returning `{thighAngle, kneeAngle, effector}`.
   - `toWorldPoint(fighter, localX, localY)` and `toLocalPoint(fighter, worldX, worldY)` respecting `facing`.
2. Clamp IK target distance to `[abs(len1-len2)+epsilon, len1+len2-epsilon]` to avoid NaNs.

### Step 2 — Replace angle-only kick with target trajectory
1. In `drawRobot()`, for kicking states, compute `phaseT` (0..1 in each phase).
2. Build foot target positions:
   - **Windup:** pull foot back/up near attacker chest.
   - **Strike:** move target toward enemy head zone in world space (approx `enemy.y - enemy.h*0.95`).
   - **Retract:** return target near idle foot position.
3. Convert world target to local coordinates and solve IK.
4. Draw thigh/shin using solved angles instead of current hardcoded `kickThighAngle` / `kickShinAngle`.

### Step 3 — Pass opponent context into renderer
1. Extend draw call path:
   - in `Fighter.draw()`, pass `enemy` or precomputed `opponentHeadY` to `drawRobot()`.
2. Keep fallback behavior (current angle logic) if no enemy context exists.

### Step 4 — Store real kick contact geometry
1. During phase 2, compute and store world coordinates for:
   - `kickHipWorld`, `kickKneeWorld`, `kickFootWorld`.
2. Add these into attacker state, e.g. `this.kickContact = {hip, knee, foot, radius}` each frame.

### Step 5 — Update hit detection for kicks
1. In `tryHit()`, for non-kick attacks retain current logic.
2. For kick attacks:
   - test defender against a capsule from knee→foot (or hip→foot) + boot circle at foot.
   - compute defender head center as `defender.y - defender.h*0.95` and torso center `defender.y - defender.h*0.58`.
   - if boot circle overlaps head center region, apply head-kick effects (extra stun/knock, optional VFX).
3. Remove or ignore `hit.height` for kick branch; keep `reach` as guard rail only if needed.

### Step 6 — Improve animation readability
1. Add per-phase easing functions:
   - windup `easeInCubic`, strike `easeOutExpo`, retract `easeInOutQuad`.
2. Add subtle pelvis/root lift during strike (`rootYOffset`) so silhouette reads as a committed high kick.
3. Optionally tilt torso opposite leg raise, but ensure leg anchor follows pelvis transform.

### Step 7 — Regression checks
1. Verify all robot bodies (`tank`, `slim`, `heavy`, default) can still kick without limb inversion.
2. Check both facings and edge-of-stage positions.
3. Confirm combo moves (`doublekick`) still trigger and now use foot-based contact.
4. Ensure block behavior still works with new kick collision source.

### Step 8 — Tuning values to start with
- Strike target y: `enemy.y - enemy.h * 0.98` (head) for fast robots.
- For slower robots, blend target between `0.78h` and `0.98h` based on speed factor.
- Boot hit radius: `max(16, attacker.w*0.11)`.
- Head-kick bonus: +12% knockback, +0.03s stun (small and readable).

## 5) Notes on migration strategy
- Keep old angle path under a feature flag (`USE_IK_KICKS`) for safe A/B testing.
- First land visual IK without collision changes.
- Then switch collision source to boot geometry once visuals are stable.
- Finally tune per-robot target heights and timings.

