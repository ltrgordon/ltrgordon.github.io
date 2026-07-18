(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const jumpButton = document.getElementById("jumpButton");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const speedEl = document.getElementById("speed");
  const toastEl = document.getElementById("toast");

  const W = canvas.width;
  const H = canvas.height;
  const groundY = 574;
  const gravity = 2450;
  const jumpVelocity = -805;
  const obstacleKinds = ["spike", "block", "gate", "ceiling", "ring", "platformRun", "staircase", "spikeLane"];
  const player = { x: 210, y: 0, size: 50, vy: 0, rot: 0, grounded: false, alive: true };
  const state = {
    time: 0,
    distance: 0,
    speed: 420,
    nextSpawn: 760,
    flash: 0,
    score: 0,
    best: Number(localStorage.getItem("prismDashBest") || 0),
    deaths: 0,
    shake: 0,
    started: false,
    invincible: 0
  };

  let obstacles = [];
  let particles = [];
  let sparks = [];
  let lastTime = performance.now();
  let pressLock = false;

  bestEl.textContent = String(state.best);

  function reset(first = false) {
    player.y = groundY - player.size;
    player.vy = 0;
    player.rot = 0;
    player.grounded = true;
    player.alive = true;
    state.time = 0;
    state.distance = 0;
    state.speed = 420;
    state.nextSpawn = 430;
    state.score = 0;
    state.shake = 0;
    state.invincible = first ? 0 : 0.65;
    obstacles = [];
    particles = [];
    sparks = [];
    for (let i = 0; i < 22; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1 + Math.random() * 3,
        hue: 180 + Math.random() * 160,
        speed: 18 + Math.random() * 50
      });
    }
  }

  function jump() {
    state.started = true;
    toastEl.classList.add("is-hidden");
    if (player.grounded && player.alive) {
      player.vy = jumpVelocity;
      player.grounded = false;
      burst(player.x + player.size * 0.5, player.y + player.size, 10, "#21d4fd");
    }
  }

  function burst(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      sparks.push({
        x,
        y,
        vx: -220 + Math.random() * 260,
        vy: -260 + Math.random() * 180,
        life: 0.35 + Math.random() * 0.28,
        max: 0.63,
        size: 4 + Math.random() * 8,
        color
      });
    }
  }

  function addGroundSpike(x, count = 1) {
    obstacles.push({ type: "spike", x, y: groundY, w: count * 46, h: 54, count, hitPad: 3, hue: 330 });
  }

  function addPlatform(x, y, w, spikes = []) {
    obstacles.push({ type: "platform", x, y, w, h: 28, solid: true, hue: 188 });
    spikes.forEach((slot) => {
      obstacles.push({
        type: "platformSpike",
        x: x + slot,
        y,
        w: 42,
        h: 44,
        count: 1,
        hitPad: 3,
        hue: 326
      });
    });
  }

  function spawnPattern(x) {
    const kind = obstacleKinds[Math.floor(Math.random() * obstacleKinds.length)];
    const gapBoost = Math.min(120, state.distance * 0.005);

    if (kind === "spike") {
      addGroundSpike(x, Math.random() < 0.52 ? 2 : 1);
      return 92;
    } else if (kind === "block") {
      obstacles.push({ type: "block", x, y: groundY - 62, w: 58 + Math.random() * 24, h: 62, hitPad: 4, hue: 42 });
      return 112;
    } else if (kind === "gate") {
      obstacles.push({ type: "gate", x, y: groundY - 172 - Math.random() * 70, w: 48, h: 118, phase: Math.random() * 10, hitPad: 4, hue: 195 });
      if (Math.random() < 0.45) addGroundSpike(x + 116, 1);
      return 190;
    } else if (kind === "ceiling") {
      obstacles.push({ type: "ceiling", x, y: groundY - 228, w: 120 + gapBoost, h: 42, hitPad: 4, hue: 265 });
      if (Math.random() < 0.5) addGroundSpike(x + 148, 1);
      return 230 + gapBoost;
    } else if (kind === "ring") {
      obstacles.push({ type: "ring", x, y: groundY - 164 - Math.random() * 82, w: 58, h: 58, hitPad: 12, hue: 112, scored: false });
      addGroundSpike(x + 110, 1);
      return 180;
    } else if (kind === "platformRun") {
      addGroundSpike(x + 34, 1);
      addPlatform(x + 118, groundY - 84, 176, [92]);
      if (Math.random() < 0.55) addGroundSpike(x + 330, 2);
      return 430;
    } else if (kind === "staircase") {
      addPlatform(x, groundY - 62, 112, []);
      addPlatform(x + 158, groundY - 118, 126, [76]);
      addPlatform(x + 342, groundY - 164, 140, []);
      obstacles.push({ type: "ring", x: x + 388, y: groundY - 250, w: 58, h: 58, hitPad: 12, hue: 112, scored: false });
      return 520;
    } else if (kind === "spikeLane") {
      addGroundSpike(x, 1);
      addGroundSpike(x + 92, 2);
      addPlatform(x + 238, groundY - 98, 160, []);
      obstacles.push({ type: "gate", x: x + 456, y: groundY - 214, w: 46, h: 118, phase: Math.random() * 10, hitPad: 4, hue: 195 });
      return 550;
    }
    return 160;
  }

  function spawn(dt) {
    state.nextSpawn -= state.speed * dt;
    if (state.nextSpawn <= 0) {
      const patternWidth = spawnPattern(W + 90);
      const minGap = Math.max(150, 255 - state.distance * 0.008);
      const maxGap = Math.max(240, 370 - state.distance * 0.004);
      state.nextSpawn = patternWidth + minGap + Math.random() * (maxGap - minGap);
    }
  }

  function hit(a, o) {
    return rectsOverlap(playerRect(a), hazardRect(o));
  }

  function playerRect(a) {
    return { x: a.x + 6, y: a.y + 6, w: a.size - 12, h: a.size - 12 };
  }

  function hazardRect(o) {
    const p = o.hitPad || 0;
    if (o.type === "spike") return { x: o.x + p, y: o.y - o.h + p, w: o.w - p * 2, h: o.h - p };
    if (o.type === "platformSpike") return { x: o.x + p, y: o.y - o.h + p, w: o.w - p * 2, h: o.h - p };
    return { x: o.x + p, y: o.y + p, w: o.w - p * 2, h: o.h - p * 2 };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function resolvePlatforms(previousY) {
    player.grounded = false;
    if (player.y + player.size >= groundY) {
      player.y = groundY - player.size;
      player.vy = 0;
      player.grounded = true;
      return;
    }

    if (player.vy < 0) return;
    const previousBottom = previousY + player.size;
    const currentBottom = player.y + player.size;
    for (const o of obstacles) {
      if (!o.solid) continue;
      const horizontalOverlap = player.x + player.size - 8 > o.x && player.x + 8 < o.x + o.w;
      const crossedTop = previousBottom <= o.y + 10 && currentBottom >= o.y;
      if (horizontalOverlap && crossedTop) {
        player.y = o.y - player.size;
        player.vy = 0;
        player.grounded = true;
        burst(player.x + player.size * 0.5, player.y + player.size, 5, "#b8ff4d");
        return;
      }
    }
  }

  function die() {
    if (!player.alive || state.invincible > 0) return;
    player.alive = false;
    state.deaths += 1;
    state.flash = 1;
    state.shake = 18;
    burst(player.x + 25, player.y + 25, 28, "#ff4ecd");
    setTimeout(() => reset(false), 430);
  }

  function update(dt) {
    state.time += dt;
    state.invincible = Math.max(0, state.invincible - dt);
    state.flash = Math.max(0, state.flash - dt * 2.8);
    state.shake = Math.max(0, state.shake - dt * 40);

    if (state.started && player.alive) {
      state.speed = Math.min(830, state.speed + dt * 15);
      state.distance += state.speed * dt;
      state.score = Math.floor(state.distance / 10);
      if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem("prismDashBest", String(state.best));
      }
      spawn(dt);
    }

    const previousY = player.y;
    player.vy += gravity * dt;
    player.y += player.vy * dt;
    resolvePlatforms(previousY);
    player.rot += (player.grounded ? -player.rot * 8 : 8.2) * dt;

    obstacles.forEach((o) => {
      o.x -= state.speed * dt;
      if (o.type === "gate") o.y += Math.sin(state.time * 5 + o.phase) * 42 * dt;
      if (o.type === "ring" && hit(player, o) && !o.scored) {
        o.scored = true;
        state.score += 30;
        burst(o.x + o.w / 2, o.y + o.h / 2, 16, "#b8ff4d");
      } else if (!o.solid && o.type !== "ring" && hit(player, o)) {
        die();
      }
    });
    obstacles = obstacles.filter((o) => o.x + o.w > -80);

    particles.forEach((p) => {
      p.x -= (p.speed + state.speed * 0.08) * dt;
      if (p.x < -10) {
        p.x = W + Math.random() * 80;
        p.y = Math.random() * H;
      }
    });

    sparks.forEach((s) => {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 820 * dt;
    });
    sparks = sparks.filter((s) => s.life > 0);

    scoreEl.textContent = String(state.score);
    bestEl.textContent = String(state.best);
    speedEl.textContent = `${(state.speed / 420).toFixed(1)}x`;
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#15133c");
    sky.addColorStop(0.42, "#38236d");
    sky.addColorStop(0.78, "#f2698d");
    sky.addColorStop(1, "#ffd166");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => {
      ctx.fillStyle = `hsla(${p.hue}, 95%, 72%, 0.72)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let layer = 0; layer < 3; layer++) {
      const y = 262 + layer * 64;
      const speed = 0.18 + layer * 0.12;
      const offset = -(state.distance * speed) % 260;
      ctx.fillStyle = [`#272263`, "#1c6286", "#0f9a9c"][layer];
      ctx.globalAlpha = 0.42 + layer * 0.14;
      ctx.beginPath();
      ctx.moveTo(offset - 260, groundY);
      for (let x = offset - 260; x < W + 300; x += 130) {
        ctx.lineTo(x + 65, y - Math.sin((x + state.time * 80) * 0.012) * 18);
        ctx.lineTo(x + 130, groundY);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    const offset = -state.distance % 64;
    ctx.fillStyle = "#161528";
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = "#0d1020";
    ctx.fillRect(0, groundY + 36, W, H - groundY - 36);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    for (let x = offset; x < W + 64; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 46, H);
      ctx.stroke();
    }
    const glow = ctx.createLinearGradient(0, groundY - 18, 0, groundY + 6);
    glow.addColorStop(0, "rgba(33,212,253,0)");
    glow.addColorStop(1, "rgba(33,212,253,0.95)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, groundY - 18, W, 24);
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
    ctx.rotate(player.rot);
    const pulse = 1 + Math.sin(state.time * 12) * 0.025;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#21d4fd";
    ctx.shadowBlur = 24;
    ctx.fillStyle = state.invincible > 0 && Math.floor(state.time * 18) % 2 ? "#ffffff" : "#21d4fd";
    roundRect(-25, -25, 50, 50, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-9, -10, 7, 7);
    ctx.fillRect(8, -10, 7, 7);
    ctx.fillStyle = "#101527";
    ctx.fillRect(-10, 9, 25, 5);
    ctx.restore();
  }

  function drawObstacle(o) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = `hsl(${o.hue}, 95%, 62%)`;
    ctx.fillStyle = `hsl(${o.hue}, 92%, 58%)`;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 3;

    if (o.type === "spike" || o.type === "platformSpike") {
      for (let i = 0; i < o.count; i++) {
        const x = o.x + i * 46;
        ctx.beginPath();
        ctx.moveTo(x, o.y);
        ctx.lineTo(x + 23, o.y - o.h);
        ctx.lineTo(x + 46, o.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (o.type === "platform") {
      ctx.shadowColor = "#21d4fd";
      ctx.fillStyle = "#18243d";
      roundRect(o.x, o.y, o.w, o.h, 7);
      ctx.fill();
      ctx.stroke();
      const shine = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
      shine.addColorStop(0, "rgba(33,212,253,0.92)");
      shine.addColorStop(0.24, "rgba(184,255,77,0.58)");
      shine.addColorStop(1, "rgba(255,255,255,0.05)");
      ctx.fillStyle = shine;
      roundRect(o.x + 5, o.y + 5, o.w - 10, 9, 4);
      ctx.fill();
    } else if (o.type === "block") {
      roundRect(o.x, o.y, o.w, o.h, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(o.x + 10, o.y + 10, o.w - 20, 8);
    } else if (o.type === "gate") {
      roundRect(o.x, o.y, o.w, o.h, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#15133c";
      ctx.fillRect(o.x + 14, o.y + 12, o.w - 28, o.h - 24);
    } else if (o.type === "ceiling") {
      roundRect(o.x, o.y, o.w, o.h, 7);
      ctx.fill();
      ctx.stroke();
      for (let x = o.x + 20; x < o.x + o.w; x += 34) {
        ctx.beginPath();
        ctx.moveTo(x, o.y + o.h);
        ctx.lineTo(x + 12, o.y + o.h + 32);
        ctx.lineTo(x + 24, o.y + o.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (o.type === "ring") {
      ctx.lineWidth = 8;
      ctx.strokeStyle = o.scored ? "rgba(184,255,77,0.22)" : "#b8ff4d";
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 25, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSparks() {
    sparks.forEach((s) => {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      roundRect(s.x, s.y, s.size, s.size, 3);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function render() {
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground();
    obstacles.forEach(drawObstacle);
    drawGround();
    drawPlayer();
    drawSparks();
    ctx.restore();

    if (!state.started) {
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.font = "900 76px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Prism Dash", W / 2, 230);
      ctx.font = "800 24px system-ui, sans-serif";
      ctx.fillText("One button. Clean jumps. Instant restarts.", W / 2, 275);
    }

    if (state.flash > 0) {
      ctx.globalAlpha = state.flash;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function pressStart(event) {
    event.preventDefault();
    if (pressLock) return;
    pressLock = true;
    jumpButton.classList.add("is-pressed");
    jump();
  }

  function pressEnd() {
    pressLock = false;
    jumpButton.classList.remove("is-pressed");
  }

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      if (!event.repeat) pressStart(event);
    }
  });
  window.addEventListener("keyup", pressEnd);
  canvas.addEventListener("pointerdown", pressStart);
  canvas.addEventListener("pointerup", pressEnd);
  canvas.addEventListener("pointercancel", pressEnd);
  jumpButton.addEventListener("pointerdown", pressStart);
  jumpButton.addEventListener("pointerup", pressEnd);
  jumpButton.addEventListener("pointercancel", pressEnd);
  jumpButton.addEventListener("click", (event) => event.preventDefault());

  reset(true);
  requestAnimationFrame(loop);
})();
