(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayCopy = document.getElementById("overlay-copy");
  const startBtn = document.getElementById("start");
  const scoreEl = document.getElementById("score");
  const waveEl = document.getElementById("wave");
  const robotsEl = document.getElementById("robots");

  const W = canvas.width;
  const H = canvas.height;
  const keys = new Set();
  const stars = Array.from({ length: 150 }, (_, i) => ({
    x: (i * 137.19) % W,
    y: (i * 91.73) % H,
    r: 0.5 + (i % 4) * 0.35,
    s: 8 + (i % 5) * 7
  }));

  let state = "menu";
  let last = 0;
  let score = 0;
  let wave = 1;
  let robots = [];
  let playerShots = [];
  let robotShots = [];
  let sparks = [];
  let optics = [];
  let marchDir = 1;
  let marchTick = 0;
  let robotFireClock = 1.2;
  let opticClock = 8;
  let shake = 0;

  const player = {
    x: W / 2,
    y: H - 54,
    angle: -Math.PI / 2,
    cooldown: 0,
    alive: true
  };

  function reset() {
    score = 0;
    wave = 1;
    player.x = W / 2;
    player.angle = -Math.PI / 2;
    player.cooldown = 0;
    player.alive = true;
    playerShots = [];
    robotShots = [];
    sparks = [];
    optics = [];
    marchDir = 1;
    robotFireClock = 1.3;
    opticClock = 7;
    spawnWave();
    state = "play";
    overlay.classList.add("hidden");
    updateHud();
  }

  function spawnWave() {
    robots = [];
    const cols = Math.min(11, 7 + wave);
    const rows = Math.min(6, 4 + Math.floor(wave / 2));
    const gapX = 62;
    const startX = W / 2 - ((cols - 1) * gapX) / 2;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const depth = 1 - row / Math.max(1, rows - 1);
        const size = 34 - depth * 10;
        robots.push({
          x: startX + col * gapX,
          y: 74 + row * 48,
          baseX: startX + col * gapX,
          row,
          col,
          size,
          hp: row < 2 ? 1 : 2,
          speed: 17 + depth * 28 + wave * 2.4,
          phase: Math.random() * Math.PI * 2,
          flash: 0
        });
      }
    }
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = score;
    waveEl.textContent = wave;
    robotsEl.textContent = robots.length;
  }

  function shoot() {
    if (state !== "play" || player.cooldown > 0) return;
    player.cooldown = 0.22;
    const muzzle = muzzlePoint();
    playerShots.push({
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(player.angle) * 760,
      vy: Math.sin(player.angle) * 760,
      ttl: 1.45,
      bounces: 4,
      radius: 4,
      boosted: false,
      trail: []
    });
    addSparks(muzzle.x, muzzle.y, "#4dff8a", 8);
  }

  function robotShoot(dt) {
    robotFireClock -= dt;
    if (robotFireClock > 0 || !robots.length) return;
    robotFireClock = Math.max(0.35, 1.45 - wave * 0.06) + Math.random() * 0.65;
    const frontByCol = new Map();
    robots.forEach((bot) => {
      const current = frontByCol.get(bot.col);
      if (!current || bot.y > current.y) frontByCol.set(bot.col, bot);
    });
    const candidates = [...frontByCol.values()];
    const bot = candidates[Math.floor(Math.random() * candidates.length)];
    const dx = player.x - bot.x;
    const dy = player.y - bot.y;
    const len = Math.hypot(dx, dy) || 1;
    const drift = (Math.random() - 0.5) * 0.18;
    robotShots.push({
      x: bot.x,
      y: bot.y + bot.size * 0.5,
      vx: (dx / len + drift) * 270,
      vy: (dy / len) * 270,
      ttl: 3.2,
      radius: 5,
      trail: []
    });
    bot.flash = 0.12;
  }

  function spawnOptic() {
    const type = ["lens", "prism", "splitter"][Math.floor(Math.random() * 3)];
    optics = [{
      type,
      x: W / 2 + (Math.random() - 0.5) * 260,
      y: 305 + (Math.random() - 0.5) * 90,
      r: 32,
      ttl: 30,
      spin: 0
    }];
  }

  function update(dt) {
    if (state !== "play") return;
    if (keys.has("ArrowLeft")) player.x -= 330 * dt;
    if (keys.has("ArrowRight")) player.x += 330 * dt;
    if (keys.has("ArrowUp")) player.angle -= 1.9 * dt;
    if (keys.has("ArrowDown")) player.angle += 1.9 * dt;
    if (keys.has("Space")) shoot();
    player.x = clamp(player.x, 56, W - 56);
    player.angle = clamp(player.angle, -Math.PI + 0.24, -0.24);
    player.cooldown = Math.max(0, player.cooldown - dt);

    marchTick += dt;
    const bottom = robots.reduce((m, bot) => Math.max(m, bot.y), 0);
    const sideHit = robots.some((bot) => bot.x + marchDir * bot.speed * dt < 52 || bot.x + marchDir * bot.speed * dt > W - 52);
    if (sideHit) {
      marchDir *= -1;
      robots.forEach((bot) => {
        bot.y += 18 + wave * 2;
      });
    }
    robots.forEach((bot) => {
      bot.x += marchDir * bot.speed * dt;
      bot.y += (3 + wave * 0.55) * dt;
      bot.flash = Math.max(0, bot.flash - dt);
      bot.phase += dt * 7;
    });
    if (bottom > H - 112) end(false);

    robotShoot(dt);
    updateShots(playerShots, dt, true);
    updateShots(robotShots, dt, false);
    updateOptics(dt);
    updateSparks(dt);
    shake = Math.max(0, shake - dt * 10);

    if (!robots.length) {
      wave += 1;
      playerShots = [];
      robotShots = [];
      spawnWave();
    }
    updateHud();
  }

  function updateShots(shots, dt, friendly) {
    for (let i = shots.length - 1; i >= 0; i -= 1) {
      const s = shots[i];
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 10) s.trail.shift();
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.ttl -= dt;

      if (s.x < 24 || s.x > W - 24) {
        if (s.bounces > 0 || !friendly) {
          s.x = clamp(s.x, 24, W - 24);
          s.vx *= -1;
          s.bounces = (s.bounces || 2) - 1;
          addSparks(s.x, s.y, friendly ? "#4dff8a" : "#ff4f68", 7);
        } else {
          s.ttl = 0;
        }
      }
      if (s.y < 0 || s.y > H + 40) s.ttl = 0;

      if (friendly) {
        applyOptic(s);
        const hitIndex = robots.findIndex((bot) => dist(s.x, s.y, bot.x, bot.y) < bot.size * 0.64 + s.radius);
        if (hitIndex >= 0) {
          const bot = robots[hitIndex];
          bot.hp -= s.boosted ? 2 : 1;
          bot.flash = 0.14;
          addSparks(bot.x, bot.y, s.boosted ? "#ffd166" : "#4dff8a", 16);
          s.ttl = 0;
          if (bot.hp <= 0) {
            score += 100 + (bot.row + 1) * 20;
            addSparks(bot.x, bot.y, "#46d9ff", 24);
            robots.splice(hitIndex, 1);
          }
        }
      } else if (player.alive && dist(s.x, s.y, player.x, player.y - 4) < 26 + s.radius) {
        addSparks(player.x, player.y, "#ff4f68", 34);
        end(false);
      }

      if (s.ttl <= 0) shots.splice(i, 1);
    }
  }

  function applyOptic(shot) {
    for (const optic of optics) {
      if (shot.lastOptic === optic || dist(shot.x, shot.y, optic.x, optic.y) > optic.r + shot.radius) continue;
      shot.lastOptic = optic;
      addSparks(optic.x, optic.y, "#9bfff6", 12);
      if (optic.type === "lens") {
        const target = nearestRobot() || { x: W / 2, y: 70 };
        const a = Math.atan2(target.y - shot.y, target.x - shot.x);
        const speed = Math.hypot(shot.vx, shot.vy) * 1.18;
        shot.vx = Math.cos(a) * speed;
        shot.vy = Math.sin(a) * speed;
        shot.boosted = true;
      } else if (optic.type === "prism") {
        const a = Math.atan2(shot.vy, shot.vx) + (Math.random() > 0.5 ? 0.55 : -0.55);
        const speed = Math.hypot(shot.vx, shot.vy) * 1.08;
        shot.vx = Math.cos(a) * speed;
        shot.vy = Math.sin(a) * speed;
        shot.boosted = true;
      } else {
        const a = Math.atan2(shot.vy, shot.vx) - 0.34;
        const b = Math.atan2(shot.vy, shot.vx) + 0.34;
        const speed = Math.hypot(shot.vx, shot.vy) * 0.92;
        playerShots.push({ ...shot, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, ttl: 0.8, trail: [], boosted: true });
        shot.vx = Math.cos(b) * speed;
        shot.vy = Math.sin(b) * speed;
        shot.boosted = true;
      }
      break;
    }
  }

  function updateOptics(dt) {
    opticClock -= dt;
    if (opticClock <= 0 && optics.length === 0) {
      spawnOptic();
      opticClock = 38 + Math.random() * 8;
    }
    optics.forEach((optic) => {
      optic.ttl -= dt;
      optic.spin += dt;
    });
    optics = optics.filter((optic) => optic.ttl > 0);
  }

  function updateSparks(dt) {
    sparks.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    sparks = sparks.filter((p) => p.life > 0);
  }

  function end(won) {
    player.alive = false;
    state = "over";
    shake = 1;
    overlayTitle.textContent = won ? "Sector Clear" : "Ray Gun Down";
    overlayCopy.textContent = won
      ? `Score ${score}. The robots never saw the mirror shot coming.`
      : `Score ${score}. One red laser is all it takes.`;
    startBtn.textContent = "Play Again";
    overlay.classList.remove("hidden");
  }

  function render(time) {
    const dt = Math.min(0.033, (time - last) / 1000 || 0);
    last = time;
    update(dt);
    draw(dt);
    requestAnimationFrame(render);
  }

  function draw(dt) {
    const sx = (Math.random() - 0.5) * shake * 7;
    const sy = (Math.random() - 0.5) * shake * 7;
    ctx.save();
    ctx.translate(sx, sy);
    drawBackground(dt);
    drawMirrors();
    drawOptics();
    robots.slice().sort((a, b) => a.row - b.row).forEach(drawRobot);
    playerShots.forEach((shot) => drawShot(shot, "#4dff8a", "#d7ffe1"));
    robotShots.forEach((shot) => drawShot(shot, "#ff4f68", "#ffd4dc"));
    drawPlayer();
    drawSparks();
    ctx.restore();
  }

  function drawBackground(dt) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#081a31");
    g.addColorStop(0.56, "#10162d");
    g.addColorStop(1, "#050810");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.beginPath();
    ctx.rect(28, 18, W - 56, H - 38);
    ctx.clip();
    stars.forEach((star) => {
      star.y += star.s * dt;
      if (star.y > H) star.y -= H;
      ctx.globalAlpha = 0.45 + (star.r % 1) * 0.3;
      ctx.fillStyle = "#dff7ff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#58e6ff";
    ctx.lineWidth = 1;
    for (let y = 76; y < H; y += 48) {
      ctx.beginPath();
      ctx.moveTo(42, y);
      ctx.lineTo(W - 42, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawMirrors() {
    for (const x of [18, W - 18]) {
      const grad = ctx.createLinearGradient(x - 8, 0, x + 8, 0);
      grad.addColorStop(0, "rgba(92, 226, 255, 0.12)");
      grad.addColorStop(0.5, "rgba(239, 254, 255, 0.82)");
      grad.addColorStop(1, "rgba(92, 226, 255, 0.12)");
      ctx.fillStyle = grad;
      ctx.fillRect(x - 5, 22, 10, H - 64);
      ctx.strokeStyle = "rgba(141, 243, 255, 0.72)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 5, 22, 10, H - 64);
    }
  }

  function drawRobot(bot) {
    const s = bot.size;
    const x = bot.x;
    const y = bot.y + Math.sin(bot.phase) * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = bot.flash > 0 ? "#fff6b6" : "#80b6cf";
    ctx.strokeStyle = "#0a1725";
    ctx.lineWidth = 3;
    roundRect(-s * 0.46, -s * 0.34, s * 0.92, s * 0.74, 6, true, true);
    ctx.fillStyle = "#b7eaff";
    roundRect(-s * 0.34, -s * 0.82, s * 0.68, s * 0.42, 5, true, true);
    ctx.fillStyle = "#092033";
    ctx.fillRect(-s * 0.22, -s * 0.66, s * 0.44, s * 0.1);
    ctx.fillStyle = bot.row < 2 ? "#4dff8a" : "#ffd166";
    ctx.fillRect(-s * 0.17, -s * 0.64, s * 0.1, s * 0.06);
    ctx.fillRect(s * 0.07, -s * 0.64, s * 0.1, s * 0.06);
    ctx.strokeStyle = "#80b6cf";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.48, -s * 0.08);
    ctx.lineTo(-s * 0.72, s * 0.25);
    ctx.moveTo(s * 0.48, -s * 0.08);
    ctx.lineTo(s * 0.72, s * 0.25);
    ctx.moveTo(-s * 0.22, s * 0.38);
    ctx.lineTo(-s * 0.32, s * 0.74);
    ctx.moveTo(s * 0.22, s * 0.38);
    ctx.lineTo(s * 0.32, s * 0.74);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    const baseY = player.y + 18;
    ctx.save();
    ctx.translate(player.x, baseY);
    ctx.fillStyle = "rgba(78, 255, 138, 0.13)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 50, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#173047";
    roundRect(-42, -18, 84, 24, 8, true, false);
    ctx.fillStyle = "#58e6ff";
    roundRect(-18, -35, 36, 20, 8, true, false);
    ctx.rotate(player.angle + Math.PI / 2);
    ctx.fillStyle = "#d7f8ff";
    roundRect(-8, -66, 16, 54, 7, true, false);
    ctx.fillStyle = "#4dff8a";
    ctx.beginPath();
    ctx.arc(0, -68, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShot(shot, color, core) {
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 1; i < shot.trail.length; i += 1) {
      const a = i / shot.trail.length;
      ctx.globalAlpha = a * 0.45;
      ctx.strokeStyle = color;
      ctx.lineWidth = shot.boosted ? 8 : 5;
      ctx.beginPath();
      ctx.moveTo(shot.trail[i - 1].x, shot.trail[i - 1].y);
      ctx.lineTo(shot.trail[i].x, shot.trail[i].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = core;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.boosted ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawOptics() {
    optics.forEach((optic) => {
      ctx.save();
      ctx.translate(optic.x, optic.y);
      ctx.rotate(optic.spin);
      ctx.globalAlpha = Math.min(1, optic.ttl / 2);
      ctx.shadowColor = "#77fff0";
      ctx.shadowBlur = 22;
      if (optic.type === "lens") {
        const grad = ctx.createLinearGradient(-optic.r, 0, optic.r, 0);
        grad.addColorStop(0, "rgba(79, 216, 255, 0.24)");
        grad.addColorStop(0.5, "rgba(255, 255, 255, 0.78)");
        grad.addColorStop(1, "rgba(79, 216, 255, 0.24)");
        ctx.fillStyle = grad;
        ctx.strokeStyle = "#9bfff6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 17, optic.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (optic.type === "prism") {
        ctx.fillStyle = "rgba(151, 219, 255, 0.36)";
        ctx.strokeStyle = "#9bfff6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -optic.r);
        ctx.lineTo(optic.r * 0.9, optic.r * 0.58);
        ctx.lineTo(-optic.r * 0.9, optic.r * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#9bfff6";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-optic.r, 0);
        ctx.lineTo(optic.r, 0);
        ctx.moveTo(0, -optic.r);
        ctx.lineTo(0, optic.r);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 209, 102, 0.28)";
        ctx.beginPath();
        ctx.arc(0, 0, optic.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = "rgba(234, 246, 255, 0.86)";
      ctx.font = "700 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(Math.ceil(optic.ttl), optic.x, optic.y + optic.r + 20);
    });
  }

  function drawSparks() {
    sparks.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function addSparks(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 50 + Math.random() * 190;
      const life = 0.22 + Math.random() * 0.38;
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 1.5 + Math.random() * 2.5,
        color,
        life,
        max: life
      });
    }
  }

  function muzzlePoint() {
    return {
      x: player.x + Math.cos(player.angle) * 45,
      y: player.y + 18 + Math.sin(player.angle) * 45
    };
  }

  function nearestRobot() {
    let best = null;
    let bestD = Infinity;
    robots.forEach((bot) => {
      const d = dist(player.x, player.y, bot.x, bot.y);
      if (d < bestD) {
        best = bot;
        bestD = d;
      }
    });
    return best;
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  window.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
    if (event.code === "KeyP" && state === "play") {
      state = "paused";
      overlayTitle.textContent = "Paused";
      overlayCopy.textContent = "Take a breath. The robots will wait, briefly.";
      startBtn.textContent = "Resume";
      overlay.classList.remove("hidden");
    } else if (event.code === "KeyP" && state === "paused") {
      state = "play";
      overlay.classList.add("hidden");
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  startBtn.addEventListener("click", () => {
    if (state === "paused") {
      state = "play";
      overlay.classList.add("hidden");
    } else {
      startBtn.textContent = "Start Game";
      reset();
    }
  });

  document.querySelectorAll("[data-hold]").forEach((btn) => {
    const code = btn.dataset.hold === "left" ? "ArrowLeft" : "ArrowRight";
    const down = (event) => {
      event.preventDefault();
      keys.add(code);
    };
    const up = () => keys.delete(code);
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointerleave", up);
    btn.addEventListener("pointercancel", up);
  });

  document.querySelectorAll("[data-tap]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tap === "shoot") shoot();
      if (btn.dataset.tap === "aimUp") player.angle = clamp(player.angle - 0.12, -Math.PI + 0.24, -0.24);
      if (btn.dataset.tap === "aimDown") player.angle = clamp(player.angle + 0.12, -Math.PI + 0.24, -0.24);
    });
  });

  spawnWave();
  updateHud();
  requestAnimationFrame(render);
})();
