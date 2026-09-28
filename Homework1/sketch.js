const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Constraint = Matter.Constraint;
const Events = Matter.Events;

const CONFIG = {
  COLOR: {
    PAGE: "#1b1b1b",
    PAPER: "#F1ECE1",
    INK: "#141414",
    RED: "#D7261E",
    BLUE: "#1D4E9E",
    YELLOW: "#F2C12E",
    GRAY: "#B9B4A8",
  },
  ART: {
    WIDTH: 800,
    HEIGHT: 1000,
    SCREEN_MARGIN: 0.05,
    FLOOR_Y_RATIO: 0.9,
  },
  PHYSICS: {
    STEP_MS: 1000 / 60,
    MAX_FRAME_MS: 100,
    SUBSTEPS: 8,
    GRAVITY_Y: 1,
    GRAVITY_SCALE: 0.001,
    POSITION_ITERATIONS: 6,
    VELOCITY_ITERATIONS: 4,
    CONSTRAINT_ITERATIONS: 3,
    MAX_SPEED_PER_STEP: 15,
    WALL_THICKNESS: 400,
    WALL_INSET_RATIO: 0.02,
    CEILING_GAP: 400,
  },
  BAR: {
    THICKNESS_RATIO: 0.02,
    DENSITY: 0.014,
    FRICTION: 0.9,
    FRICTION_STATIC: 1,
    RESTITUTION: 0.05,
    FRICTION_AIR: 0.02,
    PIVOT_OFFSET_MIN: 0.035,
    PIVOT_OFFSET_MAX: 0.06,
    KEEL_RATIO: 0.5,
    KEEL_MASS_RATIO: 2,
    MASS_REF_LENGTH_RATIO: 0.4,
    KEEL_SIZE: 4,
    INERTIA_SCALE: 2,
    LAYOUT: [
      { PIVOT_X: 0.22, PIVOT_Y: 0.15, LENGTH: 0.18 },
      { PIVOT_X: 0.78, PIVOT_Y: 0.16, LENGTH: 0.2 },
      { PIVOT_X: 0.5, PIVOT_Y: 0.32, LENGTH: 0.36 },
      { PIVOT_X: 0.25, PIVOT_Y: 0.5, LENGTH: 0.24 },
      { PIVOT_X: 0.75, PIVOT_Y: 0.5, LENGTH: 0.24 },
      { PIVOT_X: 0.5, PIVOT_Y: 0.72, LENGTH: 0.4 },
    ],
    MIRROR: true,
    JITTER_X_RATIO: 0.02,
    JITTER_Y_RATIO: 0.01,
    JITTER_LENGTH_RATIO: 0.05,
    EDGE_MARGIN_RATIO: 0.08,
    MIN_VERTICAL_GAP_RATIO: 0.2,
  },
  WEIGHT: {
    SPAWN_MARGIN: 40,
    MODULE: { BASE: 2.2, XS: 0.618, S: 1, M: 1.618, L: 2.618, XL: 4.236 },
    MASS_EXPONENT: 1.6,
    SIZE_MIX: ["XL", "L", "L", "M", "M", "M", "M", "S", "S", "S", "S", "S", "S", "XS", "XS", "XS", "XS", "XS", "XS", "XS"],
    TIER_MAX: { XL: 1, L: 3 },
    FIT: { CIRCLE: 1, SQUARE: 0.88, TRIANGLE: 1.35 },
    CIRCLE: {
      COUNT: 9,
      DENSITY: 0.0007,
      RESTITUTION: 0.78,
      FRICTION: 0.05,
      FRICTION_STATIC: 0.1,
      FRICTION_AIR: 0.025,
    },
    SQUARE: {
      COUNT: 9,
      DENSITY: 0.0026,
      RESTITUTION: 0.16,
      FRICTION: 1.2,
      FRICTION_STATIC: 1.4,
      FRICTION_AIR: 0.008,
    },
    TRIANGLE: {
      COUNT: 9,
      DENSITY: 0.0014,
      RESTITUTION: 0.48,
      FRICTION: 0.7,
      FRICTION_STATIC: 0.9,
      FRICTION_AIR: 0.011,
    },
    WAVES: {
      SHARES: [0.42, 0.38, 0.2],
      SPREAD: 0.9,
      FIRST_DELAY: 0.4,
      GAP: 3,
      SIZE_JITTER: 0.15,
      START_JITTER: 0.3,
    },
    SPAWN_TILT_MAX: Math.PI / 4,
    DROP_SPIN_MAX: 0.03,
    DROP_DRIFT_MAX: 0.4,
    DROP: {
      EDGE_MARGIN: 10,
      PIVOT_KEEPOUT: 6,
      SEPARATION: 8,
      SIZE_NOISE: 0.35,
      MAX_WIDTH_OF_BAR: 0.8,
      WALL_FIT_MARGIN: 10,
    },
  },
  WALL: {
    FRICTION: 1,
    RESTITUTION: 0.05,
  },
  TIMELINE: {
    STILL_END: 4,
    ARRIVAL_END: 14,
    WIND_END: 19,
    SETTLE_END: 25,
    FINAL_HOLD: 3,
    FADE_IN: 3,
    FADE_OUT: 2,
    ARRIVAL_TAIL: 2.5,
    GAP_JITTER: 0.45,
    CASCADE_DELAY: 1.1,
    WIND_RAMP: 3,
    SETTLE_WIND_FADE: 5,
  },
  WIND: {
    AMPLITUDE: 0.18,
    BREEZE_RATIO: 0.3,
    BREEZE_START: 6,
    BREEZE_RAMP: 6,
    PERIOD_A: 5.2,
    PERIOD_B: 8.9,
    MIX_B: 0.35,
  },
  SETTLE: {
    BAR_AIR: 0.5,
    WEIGHT_AIR: 0.8,
    MAX_EXTRA_WAIT: 8,
    CALM_SPEED: 0.12,
    CALM_ANGULAR_SPEED: 0.0008,
  },
  RENDER: {
    OUTLINE_RATIO: 0.004,
    FLOOR_RATIO: 0.0145,
    HALO_RATIO: 0.006,
    HANGER_RATIO: 0.0022,
    PIVOT_RADIUS_RATIO: 0.0085,
    PIVOT_LINE_RATIO: 0.004,
    GRAIN_TILE: 256,
    GRAIN_STRENGTH: 0.1,
    GRAIN_SEED: 20240926,
    DEBUG_COLOR: "#e0245e",
  },
  GRID: {
    LINE_RATIOS: [0.35, 0.45],
    CLEARANCE: 4,
    HANGER_GAP: 44,
    MIN_GAP_MULT: 6,
    TRIES: 80,
    EXTRA_V: 1,
    EXTRA_H: 1,
    TOP_LEFT: { X: [0.18, 0.36], Y: [0.12, 0.28], COLOR: "YELLOW" },
    BOTTOM_RIGHT: { X: [0.7, 0.86], Y: [0.64, 0.8], COLOR: "BLUE" },
  },
  PREP: {
    MAX_ATTEMPTS: 28,
    STEPS_PER_FRAME: 70,
    START_AT: 2,
    SWEEP_STEP_DEG: 2,
    SWEEP_MARGIN_DEG: 3,
    STUCK_CHECK: true,
    MAX_FINAL_TILT_DEG: 55,
    BALANCE_LIMIT: 0.6,
    COLOR_AREA_LIMIT: 0.2,
    COLOR_WEIGHT: { RED: 1, BLUE: 0.85, YELLOW: 0.6 },
  },
  TYPE: {
    FAMILY: '"Jost", "Futura", "Century Gothic", "Avenir Next", sans-serif',
    TITLE: "THE HOUR WEIGHT ARRIVES",
    SIZE_RATIO: 0.0165,
    TRACKING_EM: 0.3,
    SIDE_RATIO: 0.06,
    BASELINE_RATIO: 0.962,
  },
  CATEGORY: {
    WALL: 0x0001,
    BAR: 0x0002,
    WEIGHT: 0x0004,
  },
};

function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    sign: () => (next() < 0.5 ? -1 : 1),
    pick2: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

function deriveSeed(seed, salt) {
  let h = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function nextSeed(seed) {
  return deriveSeed(seed, 0xfeed);
}

const SEED_SALT = { LAYOUT: 1, DROP: 2, SCHEDULE: 3, GRID: 4 };

const Calc = {
  mix: (a, b, t) => a + (b - a) * t,
  progress: (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a))),
};

const Ease = {
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  smooth: (t) => t * t * (3 - 2 * t),
};

function captureLocalVerts(part, body) {
  const cos = Math.cos(-body.angle);
  const sin = Math.sin(-body.angle);
  const out = [];
  for (let i = 0; i < part.vertices.length; i++) {
    const dx = part.vertices[i].x - body.position.x;
    const dy = part.vertices[i].y - body.position.y;
    out.push({ x: dx * cos - dy * sin, y: dx * sin + dy * cos });
  }
  return out;
}

function buildWorld(seed, attempt = 0) {
  const P = CONFIG.PHYSICS;
  const W = CONFIG.ART.WIDTH;
  const H = CONFIG.ART.HEIGHT;
  const floorY = H * CONFIG.ART.FLOOR_Y_RATIO;
  Matter.Common._nextId = 0;
  Matter.Common._seed = 0;
  const engine = Engine.create({
    positionIterations: P.POSITION_ITERATIONS,
    velocityIterations: P.VELOCITY_ITERATIONS,
    constraintIterations: P.CONSTRAINT_ITERATIONS,
  });
  engine.gravity.x = 0;
  engine.gravity.y = P.GRAVITY_Y;
  engine.gravity.scale = P.GRAVITY_SCALE;
  const walls = buildWalls(W, H, floorY);
  Composite.add(engine.world, walls);
  const bars = buildBars(engine, W, H, createRng(deriveSeed(seed, SEED_SALT.LAYOUT)));
  const weights = buildWeights(engine, W, createRng(deriveSeed(seed, SEED_SALT.DROP + attempt * 16)), bars);
  return { engine, walls, bars, weights, floorY, seed, attempt };
}

function buildWalls(W, H, floorY) {
  const P = CONFIG.PHYSICS;
  const T = P.WALL_THICKNESS;
  const inset = W * P.WALL_INSET_RATIO;
  const opt = {
    isStatic: true,
    friction: CONFIG.WALL.FRICTION,
    restitution: CONFIG.WALL.RESTITUTION,
    collisionFilter: { category: CONFIG.CATEGORY.WALL },
    label: "wall",
  };
  const tall = H * 4;
  return [
    Bodies.rectangle(W / 2, floorY + T / 2, W + T * 2, T, opt),
    Bodies.rectangle(inset - T / 2, H / 2, T, tall, opt),
    Bodies.rectangle(W - inset + T / 2, H / 2, T, tall, opt),
    Bodies.rectangle(W / 2, -P.CEILING_GAP - T / 2, W + T * 2, T, opt),
  ];
}

function layoutBars(W, H, rng, mirror, thickness) {
  const B = CONFIG.BAR;
  const edge = W * B.EDGE_MARGIN_RATIO;
  const minGap = H * B.MIN_VERTICAL_GAP_RATIO;
  const draw = (jitter) =>
    B.LAYOUT.map((spec) => {
      const length = W * spec.LENGTH * (jitter ? 1 + rng.range(-B.JITTER_LENGTH_RATIO, B.JITTER_LENGTH_RATIO) : 1);
      const px = W * (mirror ? 1 - spec.PIVOT_X : spec.PIVOT_X) + (jitter ? rng.range(-B.JITTER_X_RATIO, B.JITTER_X_RATIO) * W : 0);
      const py = H * (spec.PIVOT_Y + (jitter ? rng.range(-B.JITTER_Y_RATIO, B.JITTER_Y_RATIO) : 0));
      const offset = length * rng.range(B.PIVOT_OFFSET_MIN, B.PIVOT_OFFSET_MAX) * rng.sign();
      const cx = px - offset;
      return { length, pivot: { x: px, y: py }, offset, center: { x: cx, y: py }, lo: cx - length / 2, hi: cx + length / 2, thickness };
    });
  const valid = (items) => {
    for (let j = 0; j < items.length; j++) {
      if (items[j].lo < edge || items[j].hi > W - edge) return false;
      for (let i = 0; i < j; i++) {
        const overlap = items[i].lo < items[j].hi && items[j].lo < items[i].hi;
        if (overlap && Math.abs(items[i].pivot.y - items[j].pivot.y) < minGap) return false;
      }
    }
    return true;
  };
  for (let attempt = 0; attempt < 40; attempt++) {
    const items = draw(true);
    if (valid(items)) return items;
  }
  return draw(false);
}

function buildBars(engine, W, H, rng) {
  const B = CONFIG.BAR;
  const thickness = W * B.THICKNESS_RATIO;
  const mirror = B.MIRROR && rng.next() < 0.5;
  const layout = layoutBars(W, H, rng, mirror, thickness);
  const bars = [];
  for (let i = 0; i < layout.length; i++) {
    const { length, pivot, offset, center, lo, hi } = layout[i];
    const rect = Bodies.rectangle(center.x, center.y, length, thickness, {
      density: B.DENSITY * Math.max(1, (W * B.MASS_REF_LENGTH_RATIO) / length),
      label: "barRect",
    });
    const keelDepth = length * B.KEEL_RATIO;
    const keelDistance = (keelDepth * (1 + B.KEEL_MASS_RATIO)) / B.KEEL_MASS_RATIO;
    const keel = Bodies.rectangle(center.x, center.y + keelDistance, B.KEEL_SIZE, B.KEEL_SIZE, {
      isSensor: true,
      label: "barKeel",
    });
    Body.setMass(keel, rect.mass * B.KEEL_MASS_RATIO);
    const body = Body.create({
      parts: [rect, keel],
      label: "bar",
      friction: B.FRICTION,
      frictionStatic: B.FRICTION_STATIC,
      restitution: B.RESTITUTION,
      frictionAir: B.FRICTION_AIR,
      collisionFilter: { category: CONFIG.CATEGORY.BAR, mask: CONFIG.CATEGORY.WEIGHT | CONFIG.CATEGORY.WALL },
    });
    Body.setInertia(body, body.inertia * B.INERTIA_SCALE);
    const bearing = Constraint.create({
      pointA: pivot,
      bodyB: body,
      pointB: { x: pivot.x - body.position.x, y: pivot.y - body.position.y },
      length: 0,
      stiffness: 1,
      damping: 0,
      label: "bearing",
    });
    Composite.add(engine.world, [body, bearing]);
    Body.setStatic(body, true);
    bars.push({
      index: i,
      body,
      bearing,
      pivot,
      length,
      thickness,
      offset,
      lo,
      hi,
      localVerts: captureLocalVerts(rect, body),
      released: false,
    });
  }
  return bars;
}

const SQRT3 = Math.sqrt(3);

function barCapacity(bar, W) {
  const D = CONFIG.WEIGHT.DROP;
  const inset = W * CONFIG.PHYSICS.WALL_INSET_RATIO;
  return Math.min(Math.min(bar.lo - inset, W - inset - bar.hi) - D.WALL_FIT_MARGIN, D.MAX_WIDTH_OF_BAR * bar.length);
}

const TIER_ORDER = ["XL", "L", "M", "S", "XS"];
function pickSizes(n, rng, maxWidth, unit) {
  const C = CONFIG.WEIGHT;
  const widest = Math.max(C.FIT.CIRCLE, C.FIT.SQUARE, C.FIT.TRIANGLE);
  const count = {};
  const tiers = [];
  for (let i = 0; i < n; i++) {
    let k = TIER_ORDER.indexOf(C.SIZE_MIX[i % C.SIZE_MIX.length]);
    const tooWide = (t) => unit * C.MODULE[t] * widest > maxWidth;
    while (
      k < TIER_ORDER.length - 1 &&
      (tooWide(TIER_ORDER[k]) || (C.TIER_MAX[TIER_ORDER[k]] !== undefined && (count[TIER_ORDER[k]] || 0) >= C.TIER_MAX[TIER_ORDER[k]]))
    )
      k++;
    count[TIER_ORDER[k]] = (count[TIER_ORDER[k]] || 0) + 1;
    tiers.push(TIER_ORDER[k]);
  }
  return rng.shuffle(tiers);
}

function buildWeights(engine, W, rng, bars) {
  const C = CONFIG.WEIGHT;
  const kinds = [];
  for (const [shape, spec] of [
    ["circle", C.CIRCLE],
    ["square", C.SQUARE],
    ["triangle", C.TRIANGLE],
  ]) {
    for (let i = 0; i < spec.COUNT; i++) kinds.push(shape);
  }
  const order = rng.shuffle(kinds);
  const unit = W * CONFIG.BAR.THICKNESS_RATIO * C.MODULE.BASE;
  const maxWidth = Math.max(...bars.map((b) => barCapacity(b, W)));
  const tiers = pickSizes(order.length, rng, maxWidth, unit);
  const weights = [];
  for (let i = 0; i < order.length; i++) {
    const shape = order[i];
    const size = C.MODULE[tiers[i]];
    const spawn = { x: W / 2, y: 0 };
    const tilt = rng.range(-C.SPAWN_TILT_MAX, C.SPAWN_TILT_MAX);
    let spec, body, radius = 0, color, halfWidth, bound;
    if (shape === "circle") {
      spec = C.CIRCLE;
      radius = (unit * size * C.FIT.CIRCLE) / 2;
      halfWidth = bound = radius;
      color = CONFIG.COLOR.BLUE;
      spawn.y = -(radius + C.SPAWN_MARGIN);
      body = Bodies.circle(spawn.x, spawn.y, radius, weightOptions(spec, size), 32);
    } else if (shape === "square") {
      spec = C.SQUARE;
      const side = unit * size * C.FIT.SQUARE;
      halfWidth = side / 2;
      bound = (side * Math.SQRT2) / 2;
      color = CONFIG.COLOR.RED;
      spawn.y = -(bound + C.SPAWN_MARGIN);
      body = Bodies.rectangle(spawn.x, spawn.y, side, side, weightOptions(spec, size));
    } else {
      spec = C.TRIANGLE;
      const side = unit * size * C.FIT.TRIANGLE;
      halfWidth = side / 2;
      bound = side / SQRT3;
      color = CONFIG.COLOR.YELLOW;
      spawn.y = -(bound + C.SPAWN_MARGIN);
      body = Bodies.polygon(spawn.x, spawn.y, 3, bound, weightOptions(spec, size));
      Body.setAngle(body, -Math.PI / 2);
    }
    Body.setAngle(body, body.angle + tilt);
    Composite.add(engine.world, body);
    Body.setStatic(body, true);
    body.collisionFilter.mask = 0;
    weights.push({
      index: i,
      shape,
      tier: tiers[i],
      size,
      color,
      body,
      radius,
      halfWidth,
      bound,
      spec,
      localVerts: shape === "circle" ? null : captureLocalVerts(body, body),
      dropAt: 0,
      dropped: false,
      contacts: 0,
      x: 0,
      targetBar: -1,
    });
  }
  return weights;
}

function weightOptions(spec, size) {
  return {
    density: spec.DENSITY * Math.pow(size, CONFIG.WEIGHT.MASS_EXPONENT),
    restitution: spec.RESTITUTION,
    friction: spec.FRICTION,
    frictionStatic: spec.FRICTION_STATIC,
    frictionAir: spec.FRICTION_AIR,
    label: "weight",
    collisionFilter: { category: CONFIG.CATEGORY.WEIGHT },
  };
}

class Timeline {
  constructor(onEnter) {
    const T = CONFIG.TIMELINE;
    this.phases = [
      { name: "still", start: 0, end: T.STILL_END },
      { name: "arrival", start: T.STILL_END, end: T.ARRIVAL_END },
      { name: "wind", start: T.ARRIVAL_END, end: T.WIND_END },
      { name: "settle", start: T.WIND_END, end: T.SETTLE_END },
      { name: "final", start: T.SETTLE_END, end: T.SETTLE_END + T.FINAL_HOLD + T.FADE_OUT },
    ];
    this.endTime = this.phases[this.phases.length - 1].end;
    this.onEnter = onEnter;
    this.index = 0;
    this.time = 0;
    this.hold = 0;
  }
  advance(realTime, canLeaveSettle) {
    while (this.index < this.phases.length - 1) {
      const phase = this.phases[this.index];
      if (realTime - this.hold < phase.end) break;
      if (phase.name === "settle" && !canLeaveSettle(this.hold)) {
        this.hold = realTime - phase.end;
        break;
      }
      this.index++;
      this.onEnter(this.phases[this.index].name);
    }
    this.time = realTime - this.hold;
  }
  get phase() {
    return this.phases[this.index];
  }
  get progress() {
    return Calc.progress(this.time, this.phase.start, this.phase.end);
  }
  get finished() {
    return this.time >= this.endTime;
  }
  get visibility() {
    const T = CONFIG.TIMELINE;
    const fadeIn = Ease.inOutSine(Calc.progress(this.time, 0, T.FADE_IN));
    const fadeOutStart = T.SETTLE_END + T.FINAL_HOLD;
    const fadeOut = 1 - Ease.inOutSine(Calc.progress(this.time, fadeOutStart, fadeOutStart + T.FADE_OUT));
    return fadeIn * fadeOut;
  }
}

function subtractIntervals(base, cuts) {
  let out = [base];
  for (const [cl, ch] of cuts) {
    const next = [];
    for (const [l, h] of out) {
      if (ch <= l || cl >= h) next.push([l, h]);
      else {
        if (cl > l) next.push([l, cl]);
        if (ch < h) next.push([ch, h]);
      }
    }
    out = next;
  }
  return out.filter(([l, h]) => h >= l);
}

function dropIntervals(bars, i, half) {
  const D = CONFIG.WEIGHT.DROP;
  const bar = bars[i];
  const pad = half + D.EDGE_MARGIN;
  const cuts = [];
  for (let j = 0; j < i; j++) cuts.push([bars[j].lo - half, bars[j].hi + half]);
  const keep = half + D.PIVOT_KEEPOUT;
  const withPivot = cuts.concat([[bar.pivot.x - keep, bar.pivot.x + keep]]);
  const base = [bar.lo + pad, bar.hi - pad];
  let out = subtractIntervals(base, withPivot);
  if (out.length === 0) out = subtractIntervals(base, cuts);
  if (out.length === 0) out = subtractIntervals([bar.lo + half, bar.hi - half], []);
  if (out.length === 0) out = [[(bar.lo + bar.hi) / 2, (bar.lo + bar.hi) / 2]];
  return out;
}

function planArrival(weights, bars, rng) {
  const T = CONFIG.TIMELINE;
  const C = CONFIG.WEIGHT;
  const W = CONFIG.ART.WIDTH;
  const H = CONFIG.ART.HEIGHT;
  const n = weights.length;
  const WV = C.WAVES;
  const shares = WV.SHARES.map((v) => v * (1 + rng.range(-WV.SIZE_JITTER, WV.SIZE_JITTER)));
  const waveCount = WV.SHARES.length;
  const shareSum = shares.reduce((a, v) => a + v, 0);
  const waveExact = shares.map((v) => (n * v) / shareSum);
  const perWave = waveExact.map((e) => Math.floor(e));
  while (perWave.reduce((a, v) => a + v, 0) < n) {
    let best = 0;
    for (let k = 1; k < waveCount; k++) if (waveExact[k] - perWave[k] > waveExact[best] - perWave[best]) best = k;
    perWave[best]++;
  }
  const firstStart = T.STILL_END + WV.FIRST_DELAY;
  const lastStart = T.ARRIVAL_END - T.ARRIVAL_TAIL - WV.SPREAD;
  let idx = 0;
  for (let k = 0; k < waveCount; k++) {
    const jitter = k > 0 ? rng.range(-WV.START_JITTER, WV.START_JITTER) : 0;
    const start = Math.min(lastStart, firstStart + k * WV.GAP + jitter);
    const offsets = [];
    for (let m = 0; m < perWave[k]; m++) offsets.push(rng.next() * WV.SPREAD);
    offsets.sort((a, b) => a - b);
    for (const off of offsets) weights[idx++].dropAt = start + off;
  }
  const nb = bars.length;
  const totalLen = bars.reduce((a, b) => a + b.length, 0);
  const exact = bars.map((b) => (n * b.length) / totalLen);
  const counts = exact.map((e) => Math.max(1, Math.floor(e)));
  while (counts.reduce((a, c) => a + c, 0) < n) {
    let best = 0;
    for (let k = 1; k < nb; k++) if (exact[k] - counts[k] > exact[best] - counts[best]) best = k;
    counts[best]++;
  }
  while (counts.reduce((a, c) => a + c, 0) > n) {
    let best = 0;
    for (let k = 1; k < nb; k++) if (counts[k] - exact[k] > counts[best] - exact[best]) best = k;
    counts[best]--;
  }
  const slots = [];
  for (let b = nb - 1; b >= 0; b--) for (let k = 0; k < counts[b]; k++) slots.push(b);
  const inset = W * CONFIG.PHYSICS.WALL_INSET_RATIO;
  const fits = (w, bi) => 2 * w.halfWidth <= barCapacity(bars[bi], W);
  const bySize = weights
    .map((w) => ({ w, key: w.size * (1 + rng.range(-C.DROP.SIZE_NOISE, C.DROP.SIZE_NOISE)) }))
    .sort((a, b) => b.key - a.key);
  for (const { w } of bySize) {
    let k = slots.findIndex((bi) => fits(w, bi));
    if (k < 0) k = 0;
    w.targetBar = slots.splice(k, 1)[0];
  }
  const midArea = (spec, cornerW, cornerH) => W * cornerW(spec.X) * H * cornerH(spec.Y);
  const G = CONFIG.GRID;
  let left = visualWeight(midArea(G.TOP_LEFT, (r) => (r[0] + r[1]) / 2, (r) => (r[0] + r[1]) / 2), CONFIG.COLOR[G.TOP_LEFT.COLOR]);
  let right = visualWeight(
    midArea(G.BOTTOM_RIGHT, (r) => 1 - (r[0] + r[1]) / 2, (r) => CONFIG.ART.FLOOR_Y_RATIO - (r[0] + r[1]) / 2),
    CONFIG.COLOR[G.BOTTOM_RIGHT.COLOR],
  );
  const placed = bars.map(() => []);
  const candidates = (w, bi) => {
    const intervals = dropIntervals(bars, bi, w.halfWidth);
    const totalLen = intervals.reduce((a, [l, h]) => a + (h - l), 0);
    const out = [];
    for (let attempt = 0; attempt < 30 && out.length < 8; attempt++) {
      let r = rng.next() * totalLen;
      let x = intervals[0][0];
      for (const [l, h] of intervals) {
        if (r <= h - l || h - l === 0) { x = l + r; break; }
        r -= h - l;
      }
      if (placed[bi].every((o) => Math.abs(o.x - x) >= o.w.halfWidth + w.halfWidth + C.DROP.SEPARATION)) out.push(x);
    }
    return out;
  };
  const byWeight = weights.slice().sort((a, b) => visualWeight(shapeArea(b), b.color) - visualWeight(shapeArea(a), a.color));
  for (const w of byWeight) {
    const vw = visualWeight(shapeArea(w), w.color);
    const order = [w.targetBar].concat(
      bars
        .map((_, k) => k)
        .filter((k) => k !== w.targetBar && fits(w, k))
        .sort((a, b) => placed[a].length - placed[b].length),
    );
    let x = null;
    for (const bi of order) {
      const xs = candidates(w, bi);
      if (xs.length === 0) continue;
      let bestX = xs[0];
      let bestDiff = Infinity;
      for (const cx of xs) {
        const diff = Math.abs(left + (cx < W / 2 ? vw : 0) - (right + (cx < W / 2 ? 0 : vw)));
        if (diff < bestDiff) { bestDiff = diff; bestX = cx; }
      }
      x = bestX;
      w.targetBar = bi;
      break;
    }
    if (x === null) {
      const iv = dropIntervals(bars, w.targetBar, w.halfWidth);
      let bestD = -Infinity;
      for (let t = 0; t < 40; t++) {
        const pick = iv[Math.floor(rng.next() * iv.length)];
        const cx = Calc.mix(pick[0], pick[1], rng.next());
        const d = placed[w.targetBar].reduce((m, o) => Math.min(m, Math.abs(o.x - cx) - o.w.halfWidth - w.halfWidth), Infinity);
        if (d > bestD) {
          bestD = d;
          x = cx;
        }
      }
    }
    if (x < W / 2) left += vw;
    else right += vw;
    w.x = x;
    placed[w.targetBar].push({ x, w });
  }
  for (const w of weights) {
    w.spin = rng.range(-C.DROP_SPIN_MAX, C.DROP_SPIN_MAX);
    w.drift = rng.range(-C.DROP_DRIFT_MAX, C.DROP_DRIFT_MAX);
    Body.setPosition(w.body, { x: w.x, y: w.body.position.y });
  }
}

class Simulation {
  constructor(seed, attempt = 0, grid = null) {
    this.seed = seed;
    this.attempt = attempt;
    this.world = buildWorld(seed, attempt);
    this.grid = grid;
    this.timeline = new Timeline((name) => this.enterPhase(name));
    this.steps = 0;
    this.time = 0;
    this.alpha = 0;
    this.frozen = false;
    this.nextDrop = 0;
    this.releaseQueue = [];
    const rng = createRng(deriveSeed(seed, SEED_SALT.SCHEDULE + attempt * 16));
    planArrival(this.world.weights, this.world.bars, rng);
    this.windPhaseA = rng.range(0, Math.PI * 2);
    this.windPhaseB = rng.range(0, Math.PI * 2);
    this.snapshotPrevious();
    this.barOfBody = {};
    for (const bar of this.world.bars) this.barOfBody[bar.body.id] = bar;
    this.weightOfBody = {};
    for (const w of this.world.weights) this.weightOfBody[w.body.id] = w;
    Events.on(this.world.engine, "collisionStart", (e) => this.onCollisionStart(e));
    Events.on(this.world.engine, "collisionEnd", (e) => this.trackContacts(e, -1));
  }
  step() {
    const P = CONFIG.PHYSICS;
    this.time = this.steps * (P.STEP_MS / 1000);
    this.timeline.advance(this.time, (hold) => this.canLeaveSettle(hold));
    this.steps++;
    if (this.frozen) return;
    this.dropDueWeights();
    this.processReleases();
    this.updateEnvironment();
    this.snapshotPrevious();
    const subStepMs = P.STEP_MS / P.SUBSTEPS;
    for (let i = 0; i < P.SUBSTEPS; i++) Engine.update(this.world.engine, subStepMs);
    this.limitSpeeds();
  }
  snapshotPrevious() {
    for (const bar of this.world.bars) {
      bar.prevX = bar.body.position.x;
      bar.prevY = bar.body.position.y;
      bar.prevAngle = bar.body.angle;
    }
    for (const w of this.world.weights) {
      w.prevX = w.body.position.x;
      w.prevY = w.body.position.y;
      w.prevAngle = w.body.angle;
    }
  }
  get finished() {
    return this.timeline.finished;
  }
  enterPhase(name) {
    if (name === "wind") for (const bar of this.world.bars) this.releaseBar(bar);
    if (name === "final") this.freeze();
  }
  freeze() {
    for (const bar of this.world.bars) Body.setStatic(bar.body, true);
    for (const w of this.world.weights) Body.setStatic(w.body, true);
    this.world.engine.gravity.x = 0;
    this.snapshotPrevious();
    this.frozen = true;
  }
  dropDueWeights() {
    const weights = this.world.weights;
    while (this.nextDrop < weights.length && weights[this.nextDrop].dropAt <= this.time) {
      const w = weights[this.nextDrop++];
      Body.setStatic(w.body, false);
      w.body.collisionFilter.mask = 0xffffffff;
      Body.setAngularVelocity(w.body, w.spin);
      Body.setVelocity(w.body, { x: w.drift, y: 0 });
      w.dropped = true;
    }
  }
  trackContacts(event, delta) {
    for (const pair of event.pairs) {
      if (pair.isSensor) continue;
      this.addContact(pair.bodyA.parent, delta);
      this.addContact(pair.bodyB.parent, delta);
    }
  }
  addContact(body, delta) {
    const w = this.weightOfBody[body.id];
    if (w) w.contacts = Math.max(0, w.contacts + delta);
  }
  canLeaveSettle(hold) {
    const max = CONFIG.SETTLE.MAX_EXTRA_WAIT;
    if (hold >= max * 2) return true;
    if (this.isCalm()) return true;
    return hold >= max && this.world.weights.every((w) => w.contacts > 0);
  }
  isCalm() {
    const S = CONFIG.SETTLE;
    for (const w of this.world.weights) {
      if (w.contacts === 0) return false;
      if (Math.hypot(w.body.velocity.x, w.body.velocity.y) > S.CALM_SPEED) return false;
    }
    for (const bar of this.world.bars) {
      if (Math.abs(bar.body.angularVelocity) > S.CALM_ANGULAR_SPEED) return false;
    }
    return true;
  }
  onCollisionStart(event) {
    this.trackContacts(event, +1);
    for (const pair of event.pairs) {
      if (pair.isSensor) continue;
      const a = pair.bodyA.parent;
      const b = pair.bodyB.parent;
      const bar = a.label === "bar" ? a : b.label === "bar" ? b : null;
      const other = bar === a ? b : a;
      if (bar && other.label === "weight") this.releaseBar(this.barOfBody[bar.id]);
    }
  }
  releaseBar(bar) {
    if (bar.released) return;
    bar.released = true;
    Body.setStatic(bar.body, false);
    const delay = CONFIG.TIMELINE.CASCADE_DELAY;
    for (const j of [bar.index - 1, bar.index + 1]) {
      const neighbor = this.world.bars[j];
      if (neighbor && !neighbor.released) this.releaseQueue.push({ bar: neighbor, at: this.time + delay });
    }
  }
  processReleases() {
    for (let i = this.releaseQueue.length - 1; i >= 0; i--) {
      if (this.releaseQueue[i].at <= this.time) {
        const { bar } = this.releaseQueue[i];
        this.releaseQueue.splice(i, 1);
        this.releaseBar(bar);
      }
    }
  }
  updateEnvironment() {
    const T = CONFIG.TIMELINE;
    const phase = this.timeline.phase.name;
    let wind = 0;
    let damp = 0;
    const Wd0 = CONFIG.WIND;
    const breeze = Wd0.BREEZE_RATIO * Ease.smooth(Calc.progress(this.time, Wd0.BREEZE_START, Wd0.BREEZE_START + Wd0.BREEZE_RAMP));
    if (phase === "arrival") {
      wind = breeze;
    } else if (phase === "wind") {
      wind = Calc.mix(breeze, 1, Ease.smooth(Calc.progress(this.time, T.ARRIVAL_END, T.ARRIVAL_END + T.WIND_RAMP)));
    } else if (phase === "settle") {
      wind = 1 - Ease.inOutSine(Calc.progress(this.time, T.WIND_END, T.WIND_END + T.SETTLE_WIND_FADE));
      damp = Ease.inOutSine(this.timeline.progress);
    }
    const Wd = CONFIG.WIND;
    const s =
      (1 - Wd.MIX_B) * Math.sin((Math.PI * 2 * this.time) / Wd.PERIOD_A + this.windPhaseA) +
      Wd.MIX_B * Math.sin((Math.PI * 2 * this.time) / Wd.PERIOD_B + this.windPhaseB);
    this.world.engine.gravity.x = Wd.AMPLITUDE * wind * s;
    if (damp > 0) {
      const S = CONFIG.SETTLE;
      for (const bar of this.world.bars) bar.body.frictionAir = Calc.mix(CONFIG.BAR.FRICTION_AIR, S.BAR_AIR, damp);
      for (const w of this.world.weights) {
        w.body.frictionAir = w.contacts > 0 ? Calc.mix(w.spec.FRICTION_AIR, S.WEIGHT_AIR, damp) : w.spec.FRICTION_AIR;
      }
    }
  }
  limitSpeeds() {
    const max = CONFIG.PHYSICS.MAX_SPEED_PER_STEP;
    for (const w of this.world.weights) {
      if (!w.dropped) continue;
      const v = w.body.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > max) Body.setVelocity(w.body, { x: (v.x / speed) * max, y: (v.y / speed) * max });
    }
  }
}

function obbHitsAabb(o, x0, y0, x1, y1) {
  const acx = (x0 + x1) / 2;
  const acy = (y0 + y1) / 2;
  const ahw = (x1 - x0) / 2;
  const ahh = (y1 - y0) / 2;
  const dx = o.cx - acx;
  const dy = o.cy - acy;
  const ac = Math.abs(o.c);
  const as = Math.abs(o.s);
  if (Math.abs(dx) > ahw + ac * o.hw + as * o.hh) return false;
  if (Math.abs(dy) > ahh + as * o.hw + ac * o.hh) return false;
  if (Math.abs(dx * o.c + dy * o.s) > o.hw + ahw * ac + ahh * as) return false;
  if (Math.abs(-dx * o.s + dy * o.c) > o.hh + ahw * as + ahh * ac) return false;
  return true;
}

function circleHitsAabb(cx, cy, r, x0, y0, x1, y1) {
  const nx = Math.max(x0, Math.min(cx, x1));
  const ny = Math.max(y0, Math.min(cy, y1));
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
}

function gridRules(relax) {
  const G = CONFIG.GRID;
  if (relax === 0) return G;
  return Object.assign({}, G, {
    HANGER_GAP: G.HANGER_GAP * 0.6,
    MIN_GAP_MULT: 3,
  });
}

function collectObstacles(world, angleMin, angleMax, G) {
  const P = CONFIG.PREP;
  const obbs = [];
  world.bars.forEach((bar, i) => {
    const lo = angleMin[i] - P.SWEEP_MARGIN_DEG;
    const hi = angleMax[i] + P.SWEEP_MARGIN_DEG;
    for (let deg = lo; deg <= hi + 1e-6; deg += P.SWEEP_STEP_DEG) {
      const a = (deg * Math.PI) / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      obbs.push({
        bar: i,
        cx: bar.pivot.x + c * -bar.offset,
        cy: bar.pivot.y + s * -bar.offset,
        c,
        s,
        hw: bar.length / 2 + G.CLEARANCE,
        hh: bar.thickness / 2 + G.CLEARANCE,
      });
    }
  });
  const circles = world.weights.map((w) => ({ x: w.body.position.x, y: w.body.position.y, r: w.bound + G.CLEARANCE }));
  const hangers = world.bars.map((bar) => ({ x: bar.pivot.x, y: bar.pivot.y }));
  return { obbs, circles, hangers };
}

function segRect(seg) {
  return seg.h
    ? [seg.from, seg.a - seg.w / 2, seg.to, seg.a + seg.w / 2]
    : [seg.a - seg.w / 2, seg.from, seg.a + seg.w / 2, seg.to];
}

function crossings(seg, obst) {
  const [x0, y0, x1, y1] = segRect(seg);
  const bars = new Set();
  for (const o of obst.obbs) if (!bars.has(o.bar) && obbHitsAabb(o, x0, y0, x1, y1)) bars.add(o.bar);
  let n = bars.size;
  for (const c of obst.circles) if (circleHitsAabb(c.x, c.y, c.r, x0, y0, x1, y1)) n++;
  return n;
}

function buildGrid(rng, obst, floorY, thickness, G) {
  const W = CONFIG.ART.WIDTH;
  const H = CONFIG.ART.HEIGHT;
  const floorLine = W * CONFIG.RENDER.FLOOR_RATIO;
  const lines = [];
  const allowed = (l, avoidRects) => {
    const gap = G.MIN_GAP_MULT * l.w;
    if (l.h) {
      if (l.a - l.w / 2 < gap) return false;
      if (l.a + l.w / 2 > floorY - G.MIN_GAP_MULT * floorLine) return false;
    } else {
      if (l.a - l.w / 2 < gap || l.a + l.w / 2 > W - gap) return false;
      for (const hg of obst.hangers) if (Math.abs(l.a - hg.x) < G.HANGER_GAP + l.w / 2) return false;
    }
    for (const o of lines) {
      if (o.h !== l.h) continue;
      if (Math.abs(l.a - o.a) - (l.w + o.w) / 2 < G.MIN_GAP_MULT * Math.max(l.w, o.w)) return false;
    }
    if (avoidRects) {
      const [x0, y0, x1, y1] = segRect(l.h ? { h: true, a: l.a, from: 0, to: W, w: l.w } : { h: false, a: l.a, from: 0, to: floorY, w: l.w });
      for (const r of avoidRects) if (x1 > r.x0 - gap && x0 < r.x1 + gap && y1 > r.y0 - gap && y0 < r.y1 + gap) return false;
    }
    return true;
  };
  const asSeg = (l) => (l.h ? { h: true, a: l.a, from: 0, to: W, w: l.w } : { h: false, a: l.a, from: 0, to: floorY, w: l.w });
  const place = (h, range, avoidRects) => {
    let best = null;
    let bestCross = Infinity;
    for (let t = 0; t < G.TRIES; t++) {
      const cand = { h, a: (h ? H : W) * rng.range(range[0], range[1]), w: thickness * rng.pick2(G.LINE_RATIOS) };
      if (!allowed(cand, avoidRects)) continue;
      const c = crossings(asSeg(cand), obst);
      if (c < bestCross) {
        best = cand;
        bestCross = c;
        if (c === 0) break;
      }
    }
    if (best) lines.push(best);
    return best;
  };
  const x1 = place(false, G.TOP_LEFT.X);
  const y1 = place(true, G.TOP_LEFT.Y);
  const x2 = place(false, G.BOTTOM_RIGHT.X);
  const y2 = place(true, G.BOTTOM_RIGHT.Y);
  if (!x1 || !y1 || !x2 || !y2) return null;
  const cells = [
    { x0: 0, y0: 0, x1: x1.a, y1: y1.a, color: CONFIG.COLOR[G.TOP_LEFT.COLOR] },
    { x0: x2.a, y0: y2.a, x1: W, y1: floorY, color: CONFIG.COLOR[G.BOTTOM_RIGHT.COLOR] },
  ];
  const nv = Math.floor(rng.next() * (G.EXTRA_V + 1));
  const nh = Math.floor(rng.next() * (G.EXTRA_H + 1));
  for (let k = 0; k < nv; k++) place(false, [0.06, 0.94], cells);
  for (let k = 0; k < nh; k++) place(true, [0.12, 0.85], cells);
  const segments = lines.map(asSeg);
  const total = segments.reduce((a, sg) => a + crossings(sg, obst), 0);
  return { segments, cells, crossings: total };
}

function detectStuck(world) {
  const contacts = new Map();
  const add = (weightBody, otherPart, wPart, normal) => {
    let nx = normal.x;
    let ny = normal.y;
    if (nx * (wPart.position.x - otherPart.position.x) + ny * (wPart.position.y - otherPart.position.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    const label = otherPart.parent.label;
    let kind = label;
    if (label === "wall") kind = Math.abs(ny) > Math.abs(nx) ? "floor" : "side";
    if (!contacts.has(weightBody.id)) contacts.set(weightBody.id, []);
    contacts.get(weightBody.id).push({ nx, ny, kind });
  };
  for (const pair of world.engine.pairs.list) {
    if (!pair.isActive || pair.isSensor) continue;
    const a = pair.bodyA;
    const b = pair.bodyB;
    if (a.parent.label === "weight") add(a.parent, b, a, pair.collision.normal);
    if (b.parent.label === "weight") add(b.parent, a, b, pair.collision.normal);
  }
  const reasons = new Set();
  for (const list of contacts.values()) {
    if (list.some((c) => c.kind === "side") && list.some((c) => c.kind === "bar")) reasons.add("wall");
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i];
        const q = list[j];
        if (p.kind === "weight" || q.kind === "weight") continue;
        if (p.nx * q.nx + p.ny * q.ny < -0.6) reasons.add("wedge");
      }
    }
  }
  return [...reasons];
}

function visualWeight(area, color) {
  const cw = CONFIG.PREP.COLOR_WEIGHT;
  const key = color === CONFIG.COLOR.RED ? "RED" : color === CONFIG.COLOR.BLUE ? "BLUE" : "YELLOW";
  return area * cw[key];
}

function shapeArea(w) {
  if (w.shape === "circle") return Math.PI * w.radius * w.radius;
  if (w.shape === "square") return (2 * w.halfWidth) ** 2;
  return (SQRT3 / 4) * (2 * w.halfWidth) ** 2;
}

function evaluateAttempt(seed, attempt, world, angleMin, angleMax) {
  const P = CONFIG.PREP;
  const W = CONFIG.ART.WIDTH;
  const H = CONFIG.ART.HEIGHT;
  const reasons = [];
  let score = 0;
  for (const bar of world.bars) {
    const tilt = Math.abs((bar.body.angle * 180) / Math.PI);
    if (tilt > P.MAX_FINAL_TILT_DEG) {
      reasons.push("tilt");
      score += 6 + (tilt - P.MAX_FINAL_TILT_DEG) * 0.2;
      break;
    }
  }
  if (P.STUCK_CHECK) {
    for (const why of detectStuck(world)) {
      reasons.push("stuck:" + why);
      score += 30;
    }
  }
  const gridRng = () => createRng(deriveSeed(seed, SEED_SALT.GRID + attempt * 16));
  let grid = null;
  for (let relax = 0; relax <= 1 && !grid; relax++) {
    const rules = gridRules(relax);
    const obst = collectObstacles(world, angleMin, angleMax, rules);
    grid = buildGrid(gridRng(), obst, world.floorY, world.bars[0].thickness, rules);
  }
  if (!grid) {
    reasons.push("grid");
    score += 20;
  } else {
    score += grid.crossings * 0.3;
  }
  let colorArea = 0;
  let left = 0;
  let right = 0;
  const add = (area, color, x) => {
    colorArea += area;
    if (x < W / 2) left += visualWeight(area, color);
    else right += visualWeight(area, color);
  };
  for (const w of world.weights) add(shapeArea(w), w.color, w.body.position.x);
  if (grid) for (const c of grid.cells) add((c.x1 - c.x0) * (c.y1 - c.y0), c.color, (c.x0 + c.x1) / 2);
  const areaRatio = colorArea / (W * H);
  const balance = Math.max(left, right) / Math.max(1e-9, left + right);
  if (areaRatio > P.COLOR_AREA_LIMIT) {
    reasons.push("area");
    score += 10 + (areaRatio - P.COLOR_AREA_LIMIT) * 100;
  }
  if (balance > P.BALANCE_LIMIT) {
    reasons.push("balance");
    score += 5 + (balance - P.BALANCE_LIMIT) * 50;
  }
  return { ok: reasons.length === 0, score, reasons, grid, areaRatio, balance };
}

class Preparer {
  constructor(seed) {
    this.seed = seed;
    this.attempt = 0;
    this.best = null;
    this.log = [];
    this.done = false;
    this.result = null;
    this.begin();
  }
  begin() {
    this.sim = new Simulation(this.seed, this.attempt, null);
    const n = this.sim.world.bars.length;
    this.angleMin = new Array(n).fill(0);
    this.angleMax = new Array(n).fill(0);
  }
  step(steps) {
    const bars = this.sim.world.bars;
    for (let i = 0; i < steps && !this.done; i++) {
      this.sim.step();
      if (this.sim.frozen) {
        this.finishAttempt();
        continue;
      }
      for (let b = 0; b < bars.length; b++) {
        const deg = (bars[b].body.angle * 180) / Math.PI;
        if (deg < this.angleMin[b]) this.angleMin[b] = deg;
        if (deg > this.angleMax[b]) this.angleMax[b] = deg;
      }
    }
  }
  finishAttempt() {
    const ev = evaluateAttempt(this.seed, this.attempt, this.sim.world, this.angleMin, this.angleMax);
    this.log.push({ attempt: this.attempt, reasons: ev.reasons, balance: ev.balance, areaRatio: ev.areaRatio });
    if (ev.grid && (!this.best || ev.score < this.best.ev.score)) this.best = { attempt: this.attempt, ev };
    if (ev.ok || this.attempt + 1 >= CONFIG.PREP.MAX_ATTEMPTS) {
      this.done = true;
      const pick = ev.ok ? { attempt: this.attempt, ev } : this.best;
      this.result = pick
        ? { attempt: pick.attempt, grid: pick.ev.grid, ok: ev.ok, attempts: this.log.length, log: this.log }
        : { attempt: 0, grid: this.lastResortGrid(), ok: false, attempts: this.log.length, log: this.log };
    } else {
      this.attempt++;
      this.begin();
    }
  }
  lastResortGrid() {
    const rules = Object.assign({}, gridRules(1), { HANGER_GAP: 0, CLEARANCE: 0 });
    const empty = { obbs: [], circles: [], hangers: [] };
    const world = this.sim.world;
    return buildGrid(createRng(deriveSeed(this.seed, SEED_SALT.GRID)), empty, world.floorY, world.bars[0].thickness, rules) || { segments: [], cells: [] };
  }
  runToEnd() {
    while (!this.done) this.step(500);
    return this.result;
  }
}

const view = { scale: 1, x: 0, y: 0, w: 0, h: 0, pd: 1 };
let grainPattern = null;
const timeLabel = { sec: -1, text: "00:00" };
const typeCache = { size: 0, font: "", tracking: "" };

function updateView() {
  const A = CONFIG.ART;
  const pd = pixelDensity();
  const fit = Math.min(width / A.WIDTH, height / A.HEIGHT) * (1 - A.SCREEN_MARGIN * 2);
  view.pd = pd;
  view.scale = (Math.floor((fit * A.WIDTH * pd) / 4) * 4) / (A.WIDTH * pd);
  view.w = A.WIDTH * view.scale;
  view.h = A.HEIGHT * view.scale;
  view.x = Math.round(((width - view.w) / 2) * pd) / pd;
  view.y = Math.round(((height - view.h) / 2) * pd) / pd;
}

function createGrainPattern(ctx) {
  const R = CONFIG.RENDER;
  const size = R.GRAIN_TILE;
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext("2d");
  const img = tctx.createImageData(size, size);
  const rng = createRng(R.GRAIN_SEED);
  for (let i = 0; i < size * size; i++) {
    const dark = rng.next() < 0.7;
    const alpha = Math.pow(rng.next(), 2) * 255 * R.GRAIN_STRENGTH;
    img.data[i * 4] = dark ? 40 : 255;
    img.data[i * 4 + 1] = dark ? 32 : 250;
    img.data[i * 4 + 2] = dark ? 24 : 240;
    img.data[i * 4 + 3] = alpha;
  }
  tctx.putImageData(img, 0, 0);
  return ctx.createPattern(tile, "repeat");
}

function renderFrame(sim) {
  const ctx = drawingContext;
  const A = CONFIG.ART;
  const C = CONFIG.COLOR;
  updateView();
  const grainOn = CONFIG.RENDER.GRAIN_STRENGTH > 0;
  if (grainOn && !grainPattern) grainPattern = createGrainPattern(ctx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.PAGE;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(view.pd * view.scale, 0, 0, view.pd * view.scale, view.pd * view.x, view.pd * view.y);
  ctx.beginPath();
  ctx.rect(0, 0, A.WIDTH, A.HEIGHT);
  ctx.clip();
  ctx.fillStyle = C.PAPER;
  ctx.fillRect(0, 0, A.WIDTH, A.HEIGHT);
  drawGrid(ctx, sim.grid);
  drawHangers(ctx, sim.world.bars);
  drawBarHalos(ctx, sim);
  drawHangerStubs(ctx, sim.world.bars);
  drawWeightHalos(ctx, sim);
  drawBars(ctx, sim.world.bars, sim.alpha);
  drawWeights(ctx, sim.world.weights, sim);
  drawFloor(ctx, sim.world.floorY);
  drawTypography(ctx, sim);
  if (params.debug) drawDebugWorld(ctx, sim);
  ctx.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const rx = view.x * view.pd;
  const ry = view.y * view.pd;
  const rw = view.w * view.pd;
  const rh = view.h * view.pd;
  if (grainOn) {
    ctx.fillStyle = grainPattern;
    ctx.fillRect(rx, ry, rw, rh);
  }
  const fade = 1 - sim.timeline.visibility;
  if (fade > 0.001) {
    ctx.globalAlpha = fade;
    ctx.fillStyle = C.PAGE;
    ctx.fillRect(rx, ry, rw, rh);
  }
  ctx.restore();
  if (params.debug) drawDebugHud(ctx, sim);
}

function drawGrid(ctx, grid) {
  for (const cell of grid.cells) {
    ctx.fillStyle = cell.color;
    ctx.fillRect(cell.x0, cell.y0, cell.x1 - cell.x0, cell.y1 - cell.y0);
  }
  ctx.fillStyle = CONFIG.COLOR.INK;
  for (const seg of grid.segments) {
    const [x0, y0, x1, y1] = segRect(seg);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
}

function drawHangers(ctx, bars) {
  ctx.strokeStyle = CONFIG.COLOR.INK;
  ctx.lineWidth = CONFIG.ART.WIDTH * CONFIG.RENDER.HANGER_RATIO;
  ctx.beginPath();
  for (const bar of bars) {
    ctx.moveTo(bar.pivot.x, 0);
    ctx.lineTo(bar.pivot.x, bar.pivot.y);
  }
  ctx.stroke();
}

function drawHangerStubs(ctx, bars) {
  const halo = CONFIG.ART.WIDTH * CONFIG.RENDER.HALO_RATIO;
  ctx.strokeStyle = CONFIG.COLOR.INK;
  ctx.lineWidth = CONFIG.ART.WIDTH * CONFIG.RENDER.HANGER_RATIO;
  ctx.beginPath();
  for (const bar of bars) {
    ctx.moveTo(bar.pivot.x, bar.pivot.y - (bar.thickness / 2 + halo + 3));
    ctx.lineTo(bar.pivot.x, bar.pivot.y);
  }
  ctx.stroke();
}

function traceBar(ctx, bar, alpha) {
  const b = bar.body;
  const x = Calc.mix(bar.prevX, b.position.x, alpha);
  const y = Calc.mix(bar.prevY, b.position.y, alpha);
  const a = Calc.mix(bar.prevAngle, b.angle, alpha);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  ctx.beginPath();
  for (let i = 0; i < bar.localVerts.length; i++) {
    const v = bar.localVerts[i];
    const px = x + v.x * cos - v.y * sin;
    const py = y + v.x * sin + v.y * cos;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawBars(ctx, bars, alpha) {
  const R = CONFIG.RENDER;
  const W = CONFIG.ART.WIDTH;
  ctx.fillStyle = CONFIG.COLOR.INK;
  for (const bar of bars) {
    traceBar(ctx, bar, alpha);
    ctx.fill();
  }
  ctx.fillStyle = CONFIG.COLOR.PAPER;
  ctx.strokeStyle = CONFIG.COLOR.INK;
  ctx.lineWidth = W * R.PIVOT_LINE_RATIO;
  for (const bar of bars) {
    ctx.beginPath();
    ctx.arc(bar.pivot.x, bar.pivot.y, W * R.PIVOT_RADIUS_RATIO, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function traceWeight(ctx, w, sim) {
  const grow = 1;
  const b = w.body;
  const x = Calc.mix(w.prevX, b.position.x, sim.alpha);
  const y = Calc.mix(w.prevY, b.position.y, sim.alpha);
  const a = Calc.mix(w.prevAngle, b.angle, sim.alpha);
  w.drawX = x;
  w.drawY = y;
  ctx.beginPath();
  if (w.shape === "circle") {
    ctx.arc(x, y, w.radius * grow, 0, Math.PI * 2);
  } else {
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    for (let i = 0; i < w.localVerts.length; i++) {
      const lx = w.localVerts[i].x * grow;
      const ly = w.localVerts[i].y * grow;
      const px = x + lx * cos - ly * sin;
      const py = y + lx * sin + ly * cos;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  return true;
}

function haloPainter(ctx, sim) {
  const halo = CONFIG.ART.WIDTH * CONFIG.RENDER.HALO_RATIO;
  ctx.lineWidth = halo * 2;
  ctx.lineJoin = "round";
  const cells = sim.grid.cells;
  const paint = () => {
    ctx.strokeStyle = CONFIG.COLOR.PAPER;
    ctx.stroke();
    for (const c of cells) {
      if (!c.clip) {
        c.clip = new Path2D();
        c.clip.rect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
      }
      ctx.save();
      ctx.clip(c.clip);
      ctx.strokeStyle = c.color;
      ctx.stroke();
      ctx.restore();
    }
  };
  return paint;
}

function drawBarHalos(ctx, sim) {
  const paint = haloPainter(ctx, sim);
  for (const bar of sim.world.bars) {
    traceBar(ctx, bar, sim.alpha);
    paint();
  }
}

function drawWeightHalos(ctx, sim) {
  const paint = haloPainter(ctx, sim);
  for (const w of sim.world.weights) {
    if (traceWeight(ctx, w, sim)) paint();
  }
}

function drawWeights(ctx, weights, sim) {
  const lw = CONFIG.ART.WIDTH * CONFIG.RENDER.OUTLINE_RATIO;
  ctx.lineWidth = lw * 2;
  ctx.lineJoin = "miter";
  ctx.strokeStyle = CONFIG.COLOR.INK;
  for (const w of weights) {
    if (!traceWeight(ctx, w, sim)) continue;
    ctx.fillStyle = w.color;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.stroke();
    ctx.restore();
  }
}

function drawFloor(ctx, floorY) {
  ctx.fillStyle = CONFIG.COLOR.INK;
  ctx.fillRect(0, floorY, CONFIG.ART.WIDTH, CONFIG.ART.WIDTH * CONFIG.RENDER.FLOOR_RATIO);
}

function drawTypography(ctx, sim) {
  const Y = CONFIG.TYPE;
  const W = CONFIG.ART.WIDTH;
  const H = CONFIG.ART.HEIGHT;
  const size = W * Y.SIZE_RATIO;
  const side = W * Y.SIDE_RATIO;
  const baseline = H * Y.BASELINE_RATIO;
  const sec = Math.floor(sim.time);
  if (sec !== timeLabel.sec) {
    timeLabel.sec = sec;
    timeLabel.text = String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  }
  if (typeCache.size !== size) {
    typeCache.size = size;
    typeCache.font = `500 ${size}px ${Y.FAMILY}`;
    typeCache.tracking = `${size * Y.TRACKING_EM}px`;
  }
  ctx.font = typeCache.font;
  ctx.textBaseline = "alphabetic";
  const tracking = "letterSpacing" in ctx;
  if (tracking) ctx.letterSpacing = typeCache.tracking;
  ctx.fillStyle = CONFIG.COLOR.INK;
  ctx.textAlign = "left";
  ctx.fillText(Y.TITLE, side, baseline);
  ctx.textAlign = "right";
  ctx.fillText(timeLabel.text, W - side + (tracking ? size * Y.TRACKING_EM : 0), baseline);
  if (tracking) ctx.letterSpacing = "0px";
}

function drawDebugWorld(ctx, sim) {
  const color = CONFIG.RENDER.DEBUG_COLOR;
  ctx.lineWidth = 1.5 / view.scale;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (const body of Composite.allBodies(sim.world.engine.world)) {
    for (let k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
      const part = body.parts[k];
      if (part.isSensor) continue;
      ctx.beginPath();
      for (let i = 0; i < part.vertices.length; i++) {
        const v = part.vertices[i];
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  for (const bar of sim.world.bars) {
    const r = 5 / view.scale;
    ctx.beginPath();
    ctx.moveTo(bar.pivot.x - r, bar.pivot.y);
    ctx.lineTo(bar.pivot.x + r, bar.pivot.y);
    ctx.moveTo(bar.pivot.x, bar.pivot.y - r);
    ctx.lineTo(bar.pivot.x, bar.pivot.y + r);
    ctx.moveTo(bar.pivot.x, bar.pivot.y);
    ctx.lineTo(bar.body.position.x, bar.body.position.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bar.body.position.x, bar.body.position.y, 3 / view.scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDebugHud(ctx, sim) {
  ctx.save();
  ctx.setTransform(view.pd, 0, 0, view.pd, 0, 0);
  ctx.font = "12px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = CONFIG.COLOR.GRAY;
  const t = sim.timeline;
  const line = `seed ${sim.seed} | ${t.phase.name} | ${sim.time.toFixed(1)}s | hold ${t.hold.toFixed(1)}s | attempt ${prepared.attempt + 1}/${prepared.attempts} | ${frameRate().toFixed(0)}fps`;
  ctx.fillText(line, 12, 20);
  ctx.restore();
}

let sim;
let prepared = null;
let nextPrep = null;
let accumulator = 0;
let params;

function readParams() {
  const q = new URLSearchParams(window.location.search);
  const seedParam = parseInt(q.get("seed"), 10);
  return {
    seed: Number.isFinite(seedParam) ? seedParam >>> 0 : Math.floor(Math.random() * 4294967296),
    debug: q.get("debug") === "1",
    fastForward: parseFloat(q.get("ff")) || 0,
  };
}

function startSimulation(seed, preparedResult) {
  prepared = preparedResult || new Preparer(seed).runToEnd();
  sim = new Simulation(seed, prepared.attempt, prepared.grid);
  accumulator = 0;
  nextPrep = null;
  console.log("seed", seed, "attempts", prepared.attempts, prepared.ok ? "" : "(조건을 다 만족하는 배치를 못 찾아 가장 나은 것을 사용)");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  params = readParams();
  startSimulation(params.seed);
  const ffSteps = Math.floor((params.fastForward * 1000) / CONFIG.PHYSICS.STEP_MS);
  for (let i = 0; i < ffSteps; i++) sim.step();
  if (document.fonts) document.fonts.load(`500 16px ${CONFIG.TYPE.FAMILY}`);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  const P = CONFIG.PHYSICS;
  accumulator += Math.min(deltaTime, P.MAX_FRAME_MS);
  while (accumulator >= P.STEP_MS) {
    sim.step();
    accumulator -= P.STEP_MS;
    if (sim.finished) {
      const seed = nextSeed(sim.seed);
      startSimulation(seed, nextPrep ? nextPrep.runToEnd() : undefined);
      break;
    }
  }
  if (sim.time >= CONFIG.PREP.START_AT) {
    if (!nextPrep) nextPrep = new Preparer(nextSeed(sim.seed));
    if (!nextPrep.done) nextPrep.step(CONFIG.PREP.STEPS_PER_FRAME);
  }
  sim.alpha = accumulator / P.STEP_MS;
  renderFrame(sim);
}