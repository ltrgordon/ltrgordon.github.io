(function () {
  "use strict";

  const canvas = document.getElementById("bench");
  const ctx = canvas.getContext("2d");

  const TAU = Math.PI * 2;
  const EPS = 0.0001;
  const MAX_BOUNCES = 18;
  const WORLD = { width: 1280, height: 760 };

  const state = {
    source: {
      x: 96,
      y: 380,
      angle: 0,
      wavelength: 532,
      beamDiameter: 150,
      divergence: 0.3,
      rayCount: 45
    },
    elements: [],
    selectedId: null,
    paths: [],
    livePreview: true,
    dragging: null
  };

  const typeMeta = {
    lens: "Lens",
    mirror: "Mirror",
    beamsplitter: "Beam splitter",
    aperture: "Aperture",
    slab: "Glass slab",
    prism: "Prism"
  };

  const examples = {
    converging: {
      source: { x: 90, y: 380, angle: 0, wavelength: 532, beamDiameter: 180, divergence: 0.05, rayCount: 61 },
      elements: [
        lens({ x: 560, y: 380, height: 330, width: 72, c1: 0.018, c2: -0.018, n: 1.52, name: "Bi-convex lens" }),
        aperture({ x: 435, y: 380, height: 260, opening: 210, name: "Field aperture" })
      ]
    },
    diverging: {
      source: { x: 90, y: 380, angle: 0, wavelength: 488, beamDiameter: 160, divergence: 0.05, rayCount: 57 },
      elements: [
        lens({ x: 520, y: 380, height: 330, width: 72, c1: -0.018, c2: 0.018, n: 1.52, name: "Bi-concave lens" })
      ]
    },
    expander: {
      source: { x: 80, y: 380, angle: 0, wavelength: 635, beamDiameter: 58, divergence: 0.03, rayCount: 55 },
      elements: [
        lens({ x: 365, y: 380, height: 180, width: 48, c1: -0.032, c2: 0.032, n: 1.61, name: "Diverging lens" }),
        lens({ x: 665, y: 380, height: 360, width: 82, c1: 0.016, c2: -0.016, n: 1.52, name: "Collimating lens" }),
        aperture({ x: 830, y: 380, height: 390, opening: 320, name: "Output aperture" })
      ]
    },
    mirror: {
      source: { x: 160, y: 340, angle: -4, wavelength: 589, beamDiameter: 135, divergence: 0.1, rayCount: 51 },
      elements: [
        mirror({ x: 760, y: 360, height: 340, width: 34, angle: 0, c1: -0.009, reflectivity: 1, name: "Concave mirror" }),
        beamsplitter({ x: 430, y: 395, height: 320, angle: 28, reflectivity: 0.35, name: "Partial splitter" })
      ]
    }
  };

  const controls = {
    startBtn: document.getElementById("startBtn"),
    clearBtn: document.getElementById("clearBtn"),
    deleteBtn: document.getElementById("deleteBtn"),
    sourceX: document.getElementById("sourceX"),
    sourceY: document.getElementById("sourceY"),
    sourceAngle: document.getElementById("sourceAngle"),
    wavelength: document.getElementById("wavelength"),
    beamDiameter: document.getElementById("beamDiameter"),
    divergence: document.getElementById("divergence"),
    rayCount: document.getElementById("rayCount"),
    sourceReadout: document.getElementById("sourceReadout"),
    emptyInspector: document.getElementById("emptyInspector"),
    inspectorControls: document.getElementById("inspectorControls"),
    elName: document.getElementById("elName"),
    elType: document.getElementById("elType"),
    elX: document.getElementById("elX"),
    elY: document.getElementById("elY"),
    elAngle: document.getElementById("elAngle"),
    elHeight: document.getElementById("elHeight"),
    elWidth: document.getElementById("elWidth"),
    elCurv1: document.getElementById("elCurv1"),
    elCurv2: document.getElementById("elCurv2"),
    elIndex: document.getElementById("elIndex"),
    elReflect: document.getElementById("elReflect"),
    elOpening: document.getElementById("elOpening"),
    elementReadout: document.getElementById("elementReadout")
  };

  Object.entries(typeMeta).forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    controls.elType.appendChild(option);
  });

  function id() {
    return "el-" + Math.random().toString(36).slice(2, 9);
  }

  function lens(opts) {
    return {
      id: id(),
      type: "lens",
      name: opts.name || "Lens",
      x: opts.x || 500,
      y: opts.y || 380,
      angle: opts.angle || 0,
      height: opts.height || 280,
      width: opts.width || 64,
      c1: opts.c1 ?? 0.018,
      c2: opts.c2 ?? -0.018,
      n: opts.n || 1.52,
      reflectivity: 0,
      opening: 120
    };
  }

  function mirror(opts) {
    return {
      id: id(),
      type: "mirror",
      name: opts.name || "Mirror",
      x: opts.x || 720,
      y: opts.y || 380,
      angle: opts.angle || 0,
      height: opts.height || 260,
      width: opts.width || 30,
      c1: opts.c1 ?? -0.008,
      c2: 0,
      n: 1,
      reflectivity: opts.reflectivity ?? 1,
      opening: 100
    };
  }

  function beamsplitter(opts) {
    return {
      id: id(),
      type: "beamsplitter",
      name: opts.name || "Beam splitter",
      x: opts.x || 620,
      y: opts.y || 380,
      angle: opts.angle ?? 35,
      height: opts.height || 280,
      width: opts.width || 18,
      c1: 0,
      c2: 0,
      n: 1.46,
      reflectivity: opts.reflectivity ?? 0.5,
      opening: 100
    };
  }

  function aperture(opts) {
    return {
      id: id(),
      type: "aperture",
      name: opts.name || "Aperture",
      x: opts.x || 450,
      y: opts.y || 380,
      angle: opts.angle || 0,
      height: opts.height || 300,
      width: 18,
      c1: 0,
      c2: 0,
      n: 1,
      reflectivity: 0,
      opening: opts.opening || 120
    };
  }

  function slab(opts) {
    return {
      id: id(),
      type: "slab",
      name: opts.name || "Glass slab",
      x: opts.x || 610,
      y: opts.y || 380,
      angle: opts.angle || 0,
      height: opts.height || 260,
      width: opts.width || 95,
      c1: 0,
      c2: 0,
      n: opts.n || 1.52,
      reflectivity: 0,
      opening: 100
    };
  }

  function prism(opts) {
    return {
      id: id(),
      type: "prism",
      name: opts.name || "Prism",
      x: opts.x || 620,
      y: opts.y || 380,
      angle: opts.angle || 0,
      height: opts.height || 250,
      width: opts.width || 145,
      c1: 0.006,
      c2: 0,
      n: opts.n || 1.55,
      reflectivity: 0,
      opening: 100
    };
  }

  function setExample(name) {
    const preset = examples[name];
    state.source = { ...preset.source };
    state.elements = preset.elements.map((item) => ({ ...item, id: id() }));
    state.selectedId = state.elements[0]?.id || null;
    syncControls();
    trace();
    draw();
  }

  function selectedElement() {
    return state.elements.find((item) => item.id === state.selectedId) || null;
  }

  function degToRad(value) {
    return value * Math.PI / 180;
  }

  function radToDeg(value) {
    return value * 180 / Math.PI;
  }

  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  function mul(a, scale) {
    return { x: a.x * scale, y: a.y * scale };
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  function len(a) {
    return Math.hypot(a.x, a.y);
  }

  function norm(a) {
    const l = len(a) || 1;
    return { x: a.x / l, y: a.y / l };
  }

  function dirFromAngle(angle) {
    return { x: Math.cos(degToRad(angle)), y: Math.sin(degToRad(angle)) };
  }

  function angleFromDir(d) {
    return radToDeg(Math.atan2(d.y, d.x));
  }

  function normalFor(element) {
    return dirFromAngle(element.angle);
  }

  function tangentFor(element) {
    const n = normalFor(element);
    return { x: -n.y, y: n.x };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function wavelengthToColor(wavelength) {
    const w = Number(wavelength);
    let r = 0;
    let g = 0;
    let b = 0;

    if (w >= 380 && w < 440) {
      r = -(w - 440) / 60;
      b = 1;
    } else if (w < 490) {
      g = (w - 440) / 50;
      b = 1;
    } else if (w < 510) {
      g = 1;
      b = -(w - 510) / 20;
    } else if (w < 580) {
      r = (w - 510) / 70;
      g = 1;
    } else if (w < 645) {
      r = 1;
      g = -(w - 645) / 65;
    } else {
      r = 1;
    }

    const factor = w < 420 ? 0.45 + 0.55 * (w - 380) / 40 : w > 645 ? 0.45 + 0.55 * (700 - w) / 55 : 1;
    const gamma = 0.8;
    const toByte = (v) => Math.round(255 * Math.pow(clamp(v * factor, 0, 1), gamma));
    return `rgb(${toByte(r)}, ${toByte(g)}, ${toByte(b)})`;
  }

  function focalLength(element) {
    if (element.type !== "lens") {
      return Infinity;
    }
    const power = (element.n - 1) * (element.c1 - element.c2);
    if (Math.abs(power) < EPS) {
      return Infinity;
    }
    return 1 / power;
  }

  function mirrorFocalLength(element) {
    if (Math.abs(element.c1) < EPS) {
      return Infinity;
    }
    return 1 / (2 * element.c1);
  }

  function generateRays() {
    const rays = [];
    const count = state.source.rayCount;
    const base = dirFromAngle(state.source.angle);
    const tangent = { x: -base.y, y: base.x };
    const divergence = state.source.divergence;
    const color = wavelengthToColor(state.source.wavelength);

    for (let i = 0; i < count; i += 1) {
      const ratio = count === 1 ? 0 : i / (count - 1) - 0.5;
      const offset = ratio * state.source.beamDiameter;
      const spread = ratio * divergence;
      const dir = dirFromAngle(state.source.angle + spread);
      rays.push({
        origin: add(state.source, mul(tangent, offset)),
        dir,
        intensity: 1,
        color,
        depth: 0
      });
    }
    return rays;
  }

  function rayToBounds(origin, dir) {
    const candidates = [];
    if (Math.abs(dir.x) > EPS) {
      candidates.push((0 - origin.x) / dir.x, (WORLD.width - origin.x) / dir.x);
    }
    if (Math.abs(dir.y) > EPS) {
      candidates.push((0 - origin.y) / dir.y, (WORLD.height - origin.y) / dir.y);
    }
    const positive = candidates.filter((t) => t > EPS);
    const t = Math.min(...positive, 1600);
    return add(origin, mul(dir, t));
  }

  function elementIntersection(ray, element) {
    const n = normalFor(element);
    const tvec = tangentFor(element);
    const denom = dot(ray.dir, n);
    if (Math.abs(denom) < EPS) {
      return null;
    }
    const rel = sub({ x: element.x, y: element.y }, ray.origin);
    const distance = dot(rel, n) / denom;
    if (distance <= 1.5) {
      return null;
    }
    const point = add(ray.origin, mul(ray.dir, distance));
    const offset = dot(sub(point, element), tvec);
    if (Math.abs(offset) > element.height / 2) {
      return null;
    }
    return { element, point, offset, distance, n, tvec };
  }

  function findNextHit(ray) {
    let best = null;
    state.elements.forEach((element) => {
      const hit = elementIntersection(ray, element);
      if (hit && (!best || hit.distance < best.distance)) {
        best = hit;
      }
    });
    return best;
  }

  function bendThroughLens(ray, hit) {
    const f = focalLength(hit.element);
    if (!Number.isFinite(f)) {
      return ray.dir;
    }
    let n = hit.n;
    let dn = dot(ray.dir, n);
    if (dn < 0) {
      n = mul(n, -1);
      dn = -dn;
    }
    const tv = { x: -n.y, y: n.x };
    const slope = dot(ray.dir, tv) / Math.max(EPS, dn);
    const signedF = f * (dot(n, hit.n) > 0 ? 1 : -1);
    const newSlope = slope - hit.offset / signedF;
    return norm(add(n, mul(tv, newSlope)));
  }

  function bendThroughSlab(ray, hit) {
    const n = hit.n;
    const prismBias = hit.element.type === "prism" ? hit.element.c1 * 240 * (hit.element.n - 1) : 0;
    const normalSign = dot(ray.dir, n) >= 0 ? 1 : -1;
    const shift = (hit.element.n - 1) * hit.element.width * 0.0018;
    const nextAngle = angleFromDir(ray.dir) + radToDeg(prismBias * normalSign + shift * Math.sin(degToRad(hit.element.angle)));
    return norm(dirFromAngle(nextAngle));
  }

  function reflect(ray, hit) {
    let n = hit.n;
    if (dot(ray.dir, n) > 0) {
      n = mul(n, -1);
    }
    const f = mirrorFocalLength(hit.element);
    if (Number.isFinite(f)) {
      const focus = add(hit.element, mul(hit.n, -f));
      return norm(sub(focus, hit.point));
    }
    return norm(sub(ray.dir, mul(n, 2 * dot(ray.dir, n))));
  }

  function handleInteraction(ray, hit) {
    const element = hit.element;
    if (element.type === "aperture") {
      const pass = Math.abs(hit.offset) <= element.opening / 2;
      return pass ? [{ ...ray, origin: add(hit.point, mul(ray.dir, 1.4)) }] : [];
    }
    if (element.type === "mirror") {
      const dir = reflect(ray, hit);
      return [{ ...ray, origin: add(hit.point, mul(dir, 1.4)), dir, intensity: ray.intensity * element.reflectivity }];
    }
    if (element.type === "beamsplitter") {
      const reflected = reflect(ray, { ...hit, element: { ...element, c1: 0 } });
      const transmitted = { ...ray, origin: add(hit.point, mul(ray.dir, 1.4)), intensity: ray.intensity * (1 - element.reflectivity) };
      const reflectedRay = { ...ray, origin: add(hit.point, mul(reflected, 1.4)), dir: reflected, intensity: ray.intensity * element.reflectivity };
      return [transmitted, reflectedRay].filter((item) => item.intensity > 0.035);
    }
    if (element.type === "lens") {
      const dir = bendThroughLens(ray, hit);
      return [{ ...ray, origin: add(hit.point, mul(dir, 1.4)), dir, intensity: ray.intensity * 0.985 }];
    }
    if (element.type === "slab" || element.type === "prism") {
      const dir = bendThroughSlab(ray, hit);
      return [{ ...ray, origin: add(hit.point, mul(dir, 1.4)), dir, intensity: ray.intensity * 0.96 }];
    }
    return [{ ...ray, origin: add(hit.point, mul(ray.dir, 1.4)) }];
  }

  function trace() {
    const queue = generateRays();
    const paths = [];
    while (queue.length) {
      const ray = queue.shift();
      if (ray.depth > MAX_BOUNCES || ray.intensity < 0.02) {
        continue;
      }
      const hit = findNextHit(ray);
      const end = hit ? hit.point : rayToBounds(ray.origin, ray.dir);
      paths.push({
        start: ray.origin,
        end,
        color: ray.color,
        intensity: ray.intensity
      });
      if (hit) {
        handleInteraction({ ...ray, depth: ray.depth + 1 }, hit).forEach((next) => queue.push(next));
      }
    }
    state.paths = paths;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio * rect.width / WORLD.width, 0, 0, ratio * rect.height / WORLD.height, 0, 0);
    draw();
  }

  function screenToWorld(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * WORLD.width,
      y: (event.clientY - rect.top) / rect.height * WORLD.height
    };
  }

  function draw() {
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    drawGrid();
    drawSource();
    drawRays();
    state.elements.forEach(drawElement);
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.07)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD.height);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD.height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSource() {
    const s = state.source;
    const d = dirFromAngle(s.angle);
    const t = { x: -d.y, y: d.x };
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(degToRad(s.angle));
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = wavelengthToColor(s.wavelength);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-34, -22, 58, 44, 8);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(-22, -8, 25, 16);
    ctx.fillStyle = wavelengthToColor(s.wavelength);
    ctx.fillRect(4, -12, 20, 24);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = wavelengthToColor(s.wavelength);
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x + t.x * s.beamDiameter / 2, s.y + t.y * s.beamDiameter / 2);
    ctx.lineTo(s.x + t.x * s.beamDiameter / 2 + d.x * 86, s.y + t.y * s.beamDiameter / 2 + d.y * 86);
    ctx.moveTo(s.x - t.x * s.beamDiameter / 2, s.y - t.y * s.beamDiameter / 2);
    ctx.lineTo(s.x - t.x * s.beamDiameter / 2 + d.x * 86, s.y - t.y * s.beamDiameter / 2 + d.y * 86);
    ctx.stroke();
    ctx.restore();
  }

  function drawRays() {
    ctx.save();
    ctx.lineCap = "round";
    state.paths.forEach((segment) => {
      ctx.strokeStyle = segment.color;
      ctx.globalAlpha = clamp(0.18 + segment.intensity * 0.68, 0.08, 0.92);
      ctx.lineWidth = clamp(0.65 + segment.intensity * 1.25, 0.5, 2.2);
      ctx.beginPath();
      ctx.moveTo(segment.start.x, segment.start.y);
      ctx.lineTo(segment.end.x, segment.end.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawElement(element) {
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate(degToRad(element.angle));
    const selected = element.id === state.selectedId;
    if (element.type === "lens") {
      drawLens(element, selected);
    } else if (element.type === "mirror") {
      drawMirror(element, selected);
    } else if (element.type === "beamsplitter") {
      drawSplitter(element, selected);
    } else if (element.type === "aperture") {
      drawAperture(element, selected);
    } else if (element.type === "slab") {
      drawSlab(element, selected);
    } else if (element.type === "prism") {
      drawPrism(element, selected);
    }
    if (selected) {
      drawSelection(element);
    }
    ctx.restore();
  }

  function drawLens(element) {
    const h = element.height;
    const w = element.width;
    const sign = Math.sign(element.c1 - element.c2) || 1;
    const waist = sign > 0 ? w / 2 : w * 0.12;
    const edge = sign > 0 ? w * 0.08 : w / 2;
    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, "rgba(103, 232, 249, 0.28)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 0.72)");
    grad.addColorStop(1, "rgba(8, 145, 178, 0.28)");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#0e7490";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-edge, -h / 2);
    ctx.quadraticCurveTo(-waist, 0, -edge, h / 2);
    ctx.lineTo(edge, h / 2);
    ctx.quadraticCurveTo(waist, 0, edge, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawMirror(element) {
    const h = element.height;
    const curve = clamp(element.c1 * 1800, -24, 24);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = element.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(curve, -h / 2);
    ctx.quadraticCurveTo(-curve, 0, curve, h / 2);
    ctx.stroke();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawSplitter(element) {
    ctx.fillStyle = "rgba(14, 165, 233, 0.22)";
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-element.width / 2, -element.height / 2, element.width, element.height, 5);
    ctx.fill();
    ctx.stroke();
  }

  function drawAperture(element) {
    const h = element.height;
    const open = element.opening;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-10, -h / 2, 20, (h - open) / 2);
    ctx.fillRect(-10, open / 2, 20, (h - open) / 2);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -h / 2, 20, h);
  }

  function drawSlab(element) {
    ctx.fillStyle = "rgba(125, 211, 252, 0.24)";
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-element.width / 2, -element.height / 2, element.width, element.height, 6);
    ctx.fill();
    ctx.stroke();
  }

  function drawPrism(element) {
    ctx.fillStyle = "rgba(45, 212, 191, 0.25)";
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-element.width / 2, element.height / 2);
    ctx.lineTo(0, -element.height / 2);
    ctx.lineTo(element.width / 2, element.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawSelection(element) {
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.strokeRect(-element.width / 2 - 10, -element.height / 2 - 10, element.width + 20, element.height + 20);
    ctx.setLineDash([]);
    ctx.fillStyle = "#f97316";
    getLocalHandles(element).forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, TAU);
      ctx.fill();
    });
  }

  function getLocalHandles(element) {
    return [
      { x: 0, y: -element.height / 2 - 10, kind: "top" },
      { x: 0, y: element.height / 2 + 10, kind: "bottom" },
      { x: element.width / 2 + 10, y: 0, kind: "width" }
    ];
  }

  function worldToLocal(point, element) {
    const rel = sub(point, element);
    const a = -degToRad(element.angle);
    return {
      x: rel.x * Math.cos(a) - rel.y * Math.sin(a),
      y: rel.x * Math.sin(a) + rel.y * Math.cos(a)
    };
  }

  function localToWorld(point, element) {
    const a = degToRad(element.angle);
    return {
      x: element.x + point.x * Math.cos(a) - point.y * Math.sin(a),
      y: element.y + point.x * Math.sin(a) + point.y * Math.cos(a)
    };
  }

  function hitTest(point) {
    for (let i = state.elements.length - 1; i >= 0; i -= 1) {
      const element = state.elements[i];
      const local = worldToLocal(point, element);
      if (element.id === state.selectedId) {
        const handle = getLocalHandles(element).find((h) => len(sub(local, h)) < 13);
        if (handle) {
          return { element, mode: "resize", handle: handle.kind };
        }
      }
      if (Math.abs(local.x) <= element.width / 2 + 18 && Math.abs(local.y) <= element.height / 2 + 18) {
        return { element, mode: "move" };
      }
    }
    const d = len(sub(point, state.source));
    if (d < 42) {
      return { mode: "source" };
    }
    return null;
  }

  function syncControls() {
    controls.sourceX.value = state.source.x;
    controls.sourceY.value = state.source.y;
    controls.sourceAngle.value = state.source.angle;
    controls.wavelength.value = state.source.wavelength;
    controls.beamDiameter.value = state.source.beamDiameter;
    controls.divergence.value = state.source.divergence;
    controls.rayCount.value = state.source.rayCount;
    syncInspector();
    updateReadouts();
  }

  function syncInspector() {
    const element = selectedElement();
    controls.emptyInspector.classList.toggle("hidden", !!element);
    controls.inspectorControls.classList.toggle("hidden", !element);
    if (!element) {
      return;
    }
    controls.elName.value = element.name;
    controls.elType.value = element.type;
    controls.elX.value = element.x;
    controls.elY.value = element.y;
    controls.elAngle.value = element.angle;
    controls.elHeight.value = element.height;
    controls.elWidth.value = element.width;
    controls.elCurv1.value = element.c1;
    controls.elCurv2.value = element.c2;
    controls.elIndex.value = element.n;
    controls.elReflect.value = element.reflectivity;
    controls.elOpening.value = element.opening;
  }

  function updateReadouts() {
    const s = state.source;
    controls.sourceReadout.innerHTML = [
      `x ${Math.round(s.x)} px, y ${Math.round(s.y)} px`,
      `direction ${Number(s.angle).toFixed(1)} deg`,
      `${Math.round(s.wavelength)} nm, diameter ${Math.round(s.beamDiameter)} px`,
      `${Number(s.divergence).toFixed(2)} deg divergence, ${s.rayCount} rays`
    ].join("<br>");

    const element = selectedElement();
    if (!element) {
      return;
    }
    const f = focalLength(element);
    const focalText = Number.isFinite(f) ? `${f.toFixed(1)} px` : "infinite";
    controls.elementReadout.innerHTML = [
      `${typeMeta[element.type]} at x ${Math.round(element.x)}, y ${Math.round(element.y)}`,
      `aperture ${Math.round(element.height)} px, width ${Math.round(element.width)} px`,
      `n ${Number(element.n).toFixed(2)}, angle ${Number(element.angle).toFixed(1)} deg`,
      element.type === "lens" ? `thin-lens focal length ${focalText}` : `reflectivity ${Math.round(element.reflectivity * 100)}%`
    ].join("<br>");
  }

  function updateAndMaybeTrace() {
    updateReadouts();
    if (state.livePreview) {
      trace();
    }
    draw();
  }

  function bindControls() {
    [
      ["sourceX", "x"],
      ["sourceY", "y"],
      ["sourceAngle", "angle"],
      ["wavelength", "wavelength"],
      ["beamDiameter", "beamDiameter"],
      ["divergence", "divergence"],
      ["rayCount", "rayCount"]
    ].forEach(([control, prop]) => {
      controls[control].addEventListener("input", () => {
        state.source[prop] = prop === "rayCount" ? Number(controls[control].value) | 1 : Number(controls[control].value);
        updateAndMaybeTrace();
      });
    });

    [
      ["elX", "x"],
      ["elY", "y"],
      ["elAngle", "angle"],
      ["elHeight", "height"],
      ["elWidth", "width"],
      ["elCurv1", "c1"],
      ["elCurv2", "c2"],
      ["elIndex", "n"],
      ["elReflect", "reflectivity"],
      ["elOpening", "opening"]
    ].forEach(([control, prop]) => {
      controls[control].addEventListener("input", () => {
        const element = selectedElement();
        if (!element) {
          return;
        }
        element[prop] = Number(controls[control].value);
        updateAndMaybeTrace();
      });
    });

    controls.elName.addEventListener("input", () => {
      const element = selectedElement();
      if (element) {
        element.name = controls.elName.value;
        draw();
      }
    });

    controls.elType.addEventListener("change", () => {
      const element = selectedElement();
      if (!element) {
        return;
      }
      element.type = controls.elType.value;
      element.name = typeMeta[element.type];
      syncInspector();
      updateAndMaybeTrace();
    });

    controls.startBtn.addEventListener("click", () => {
      trace();
      draw();
    });

    controls.clearBtn.addEventListener("click", () => {
      state.elements = [];
      state.selectedId = null;
      state.paths = [];
      syncControls();
      draw();
    });

    controls.deleteBtn.addEventListener("click", () => {
      state.elements = state.elements.filter((item) => item.id !== state.selectedId);
      state.selectedId = state.elements[0]?.id || null;
      syncControls();
      trace();
      draw();
    });

    document.querySelectorAll("[data-example]").forEach((button) => {
      button.addEventListener("click", () => setExample(button.dataset.example));
    });

    document.querySelectorAll("[data-add]").forEach((button) => {
      button.addEventListener("click", () => addElement(button.dataset.add));
    });
  }

  function addElement(kind) {
    const center = 620 + state.elements.length * 24;
    const factories = {
      "lens-convex": () => lens({ x: center, y: 380, c1: 0.018, c2: -0.018, name: "Convex lens" }),
      "lens-concave": () => lens({ x: center, y: 380, c1: -0.018, c2: 0.018, name: "Concave lens" }),
      mirror: () => mirror({ x: center, y: 380 }),
      beamsplitter: () => beamsplitter({ x: center, y: 380 }),
      aperture: () => aperture({ x: center, y: 380 }),
      slab: () => slab({ x: center, y: 380 }),
      prism: () => prism({ x: center, y: 380 })
    };
    const element = factories[kind]();
    state.elements.push(element);
    state.selectedId = element.id;
    syncControls();
    trace();
    draw();
  }

  function bindCanvas() {
    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      const point = screenToWorld(event);
      const hit = hitTest(point);
      if (!hit) {
        state.selectedId = null;
        state.dragging = null;
        syncInspector();
        draw();
        return;
      }
      if (hit.element) {
        state.selectedId = hit.element.id;
      }
      state.dragging = {
        ...hit,
        start: point,
        origin: hit.element ? { x: hit.element.x, y: hit.element.y, height: hit.element.height, width: hit.element.width } : { x: state.source.x, y: state.source.y }
      };
      syncInspector();
      draw();
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!state.dragging) {
        return;
      }
      const point = screenToWorld(event);
      const drag = state.dragging;
      if (drag.mode === "source") {
        state.source.x = clamp(point.x, 40, WORLD.width - 80);
        state.source.y = clamp(point.y, 60, WORLD.height - 60);
      } else if (drag.mode === "move") {
        drag.element.x = clamp(drag.origin.x + point.x - drag.start.x, 40, WORLD.width - 40);
        drag.element.y = clamp(drag.origin.y + point.y - drag.start.y, 40, WORLD.height - 40);
      } else if (drag.mode === "resize") {
        const local = worldToLocal(point, drag.element);
        if (drag.handle === "width") {
          drag.element.width = clamp(Math.abs(local.x) * 2, 8, 180);
        } else {
          drag.element.height = clamp(Math.abs(local.y) * 2, 50, 560);
        }
      }
      syncControls();
      updateAndMaybeTrace();
    });

    canvas.addEventListener("pointerup", () => {
      state.dragging = null;
    });
  }

  function init() {
    bindControls();
    bindCanvas();
    window.addEventListener("resize", resizeCanvas);
    setExample("converging");
    resizeCanvas();
  }

  init();
}());
