// EMBER
let lay = {};

// 불꽃 상태
const S = {
  level: 1,
  phase: 'lit', // lit | dying | dark | igniting
  kind: 0,
  t: 0,
  life: 1,
  sx: 1,
  sy: 1,
  lean: 0,
  leanV: 0,
  cut: 0,
  o2: 0,
  ember: 0,
  wind: 0,
  windY: 0,
  glassA: 0,
  glassVis: 1,
  glassOut: false,
  frost: 0,
  dieFrom: 1,
};

// 테스트
const Q = new URLSearchParams(location.search);
const FIXED = Q.has('fixed');
const STOP = +(Q.get('stop') || 0);
let simF = 0;
const now = () => (FIXED ? simF / 60 : millis() / 1000);

// 입력
const ptrs = new Map();
const stamp = () => (FIXED ? simF * (1000 / 60) : performance.now());
let mouseHold = false;

// 이징
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp1 = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp1(a[0], b[0], k), lerp1(a[1], b[1], k), lerp1(a[2], b[2], k)];
const easeIn = (k) => k * k * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutBack = (k) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);

function setup() {
  pixelDensity(Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr));
  const cnv = createCanvas(windowWidth, windowHeight, WEBGL);
  calcLayout();
  initRender();
  buildLayers();
  makeSprite();
  bindInput(cnv.elt);
  bindUI();
  if (Q.get('level')) S.level = Math.min(3, Math.max(1, +Q.get('level')));
  updateUI();
  setTimeout(() => showHint(S.level), CONFIG.hint.delay * 1000);
}

function calcLayout() {
  const L = CONFIG.layout;
  lay.flameH = Math.min(width * L.flameH, height * L.flameHMax);
  lay.wickX = width / 2;
  lay.wickY = height * L.wickY;
  lay.flameY = lay.wickY;
  lay.candTop = lay.wickY + lay.flameH * 0.1;
  lay.candW = lay.flameH * L.candleW;
  lay.candBot = Math.max(height * L.candBot, lay.candTop + lay.candW * 1.4);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calcLayout();
  resizeRender();
  buildLayers();
}

// 상태 전환

function kill(kind) {
  if (S.phase !== 'lit') return;
  S.phase = 'dying';
  S.kind = kind;
  S.t = 0;
  S.dieFrom = S.sy;
  buzz(CONFIG.sense.vibrate);
  if (kind === 1) sfxSizzle();
  if (kind === 2) {
    sfxPuff();
    sfxSizzle();
    const tip = flameTip();
    const dir = Math.sign(S.lean) || 1;
    spawnEmbers(tip.x, tip.y, dir, 110 + Math.abs(S.wind) * 0.05, CONFIG.l2.embers);
    spawnSmoke(lay.wickX, lay.wickY - lay.flameH * 0.05, dir * 70);
  }
}

function ignite(nextLevel) {
  hint.darkShown = false;
  if (S.glassA > 0.01) S.glassOut = true;
  hideHint();
  S.level = nextLevel;
  S.phase = 'igniting';
  S.t = 0;
  S.lean = 0;
  S.leanV = 0;
  S.cut = 0;
  S.o2 = 0;
  S.wind = 0;
  S.sx = 0.3;
  S.sy = 0.2;
  S.life = 0;
  spawnSparks(lay.wickX, lay.wickY - lay.flameH * 0.02);
  sfxStrike();
  updateUI();
}

function flameTip() {
  const h = lay.flameH * 0.95 * S.sy;
  return {
    x: lay.wickX + Math.sin(S.lean) * h,
    y: lay.flameY - Math.cos(S.lean) * h,
  };
}

// 갱신

function update(dt) {
  const T = CONFIG.time;
  S.t += dt;
  S.ember = Math.max(0, S.ember - dt / T.emberFade);

  // 바람
  S.wind *= Math.exp(-dt * CONFIG.l2.velDecay);
  S.windY *= Math.exp(-dt * CONFIG.l2.velDecay);
  let target = 0;
  const calm = breeze();
  if (S.level === 2 && S.phase === 'lit') {
    target = Math.max(-1, Math.min(1, S.wind / CONFIG.l2.maxSpeed)) * (Math.PI / 2);
    target += calm.lean;
  }
  if (S.phase === 'dying' && S.kind === 2) target = Math.sign(S.lean) * 1.4;
  const L2 = CONFIG.l2;
  const pushing = Math.abs(target) > Math.abs(S.lean) && Math.sign(target) === Math.sign(S.lean || target);
  const k = pushing ? L2.push : L2.stiff;
  const c = pushing ? L2.pushDamp : L2.damp;
  S.leanV += (k * (target - S.lean) - c * S.leanV) * dt;
  S.lean += S.leanV * dt;
  if (S.phase === 'lit' && S.level === 2) sfxBlow(Math.max(clamp01(Math.abs(S.wind) / L2.maxSpeed), calm.amt * L2.breezeSound));
  else sfxBlow(0);

  // 산소
  const holding = S.level === 3 && S.phase === 'lit' && (ptrs.size > 0 || mouseHold);
  if (holding) S.o2 = Math.min(1, S.o2 + dt / CONFIG.l3.holdTime);
  else if (S.phase === 'lit' || S.phase === 'igniting') S.o2 = Math.max(0, S.o2 - dt / CONFIG.l3.recover);
  const covered = S.level === 3 && (S.phase === 'dying' || S.phase === 'dark');
  if (S.glassOut) {
    S.glassVis = Math.max(0, S.glassVis - dt / CONFIG.l3.glassFade);
    if (S.glassVis <= 0) {
      S.glassOut = false;
      S.glassA = 0;
      S.glassVis = 1;
    }
  } else {
    S.glassA = lerp1(S.glassA, holding || covered ? 1 : 0, 1 - Math.exp(-dt * CONFIG.l3.glassDrop));
    S.frost = S.o2;
  }
  sfxO2(S.o2, holding);

  if (S.phase === 'lit') {
    const lean = Math.abs(S.lean) / (Math.PI / 2);
    S.sy = 1 + lean * L2.stretch + Math.min(Math.abs(S.windY) / L2.maxSpeed, 1) * 0.2;
    S.sx = 1 - lean * 0.25;
    if (S.level === 3) {
      const k = 1 - (1 - CONFIG.l3.minScale) * easeInOut(S.o2);
      S.sx = k;
      S.sy = k;
    }
    S.life = 1;
    if (S.level === 2 && Math.abs(S.lean) > (L2.killDeg * Math.PI) / 180) kill(2);
    if (S.level === 3 && S.o2 >= 1) kill(3);
  } else if (S.phase === 'dying') {
    updateDying();
  } else if (S.phase === 'dark') {
    S.life = 0;
    if (S.t > CONFIG.time.darkHold && !hint.darkShown) {
      hint.darkShown = true;
      showHint('dark');
    }
  } else if (S.phase === 'igniting') {
    const k = clamp01(S.t / T.ignite);
    const g = clamp01((S.t - 0.12) / (T.ignite - 0.12));
    S.life = easeOut(g);
    S.sy = 0.2 + 0.8 * easeOutBack(g);
    S.sx = 0.3 + 0.7 * easeOut(g);
    S.ember = Math.max(S.ember, 1 - k);
    if (k >= 1) {
      S.phase = 'lit';
      S.t = 0;
      showHint(S.level);
    }
  }
  updateParticles(dt);
}

function updateDying() {
  let dur;
  if (S.kind === 1) {
    // 레벨 1
    dur = CONFIG.l1.dur;
    const k = clamp01(S.t / dur);
    S.sy = lerp1(1, 0.25, easeOut(k));
    S.sx = 1 + Math.sin(k * Math.PI) * 0.35;
    S.life = 1 - easeIn(k);
  } else if (S.kind === 2) {
    // 레벨 2
    dur = CONFIG.l2.dur;
    const k = clamp01(S.t / dur);
    S.cut = easeOut(k);
    S.life = 1 - easeIn(k) * 0.4 - k * 0.6;
  } else {
    // 레벨 3
    dur = CONFIG.l3.dur;
    const k = clamp01(S.t / dur);
    const sc = CONFIG.l3.minScale * (1 - easeIn(k) * 0.8);
    S.sx = sc;
    S.sy = sc * (1 - k * 0.3);
    S.life = 1 - easeInOut(k);
    S.o2 = 1;
  }
  if (S.t >= dur) {
    if (S.kind !== 2) {
      if (S.kind === 3) sfxSizzle();
      if (S.kind === 3) buzz(CONFIG.sense.vibrate);
      spawnSmoke(lay.wickX, lay.wickY - lay.flameH * 0.05, 0);
    }
    S.phase = 'dark';
    S.t = 0;
    S.life = 0;
    S.ember = 1;
    updateUI();
  }
}

// 유리컵
function glassBox() {
  const L3 = CONFIG.l3;
  const drop = (1 - easeOut(S.glassA)) * lay.flameH * 1.4;
  return [lay.wickX, lay.wickY - lay.flameH * L3.glassTop - drop, lay.candW * L3.glassW, lay.candBot - drop];
}

// 산들바람
function breeze() {
  const L2 = CONFIG.l2;
  if (S.level !== 2 || S.phase !== 'lit') return { lean: 0, amt: 0 };
  const amt = easeInOut(clamp01(S.t / 2.5));
  const t = now() * L2.breezeSpeed;
  const w = Math.sin(t) * 0.5 + Math.sin(t * 1.61 + 1.1) * 0.3 + Math.sin(t * 0.37 + 2.3) * 0.2;
  return { lean: w * L2.breeze * amt, amt };
}

// 팔랑거림
function flutter(t) {
  const L2 = CONFIG.l2;
  const base = breeze().amt * 0.6;
  const amt = Math.min(1, base + Math.abs(S.wind) / L2.maxSpeed * 3 + Math.abs(S.lean) * 0.8);
  const w = L2.flutterSpeed;
  const f = Math.sin(t * w) * 0.55 + Math.sin(t * w * 1.73 + 1.3) * 0.3 + Math.sin(t * w * 0.51 + 2.1) * 0.15;
  return f * L2.flutter * amt;
}

// 레벨 3 색
function flameColors() {
  const C = CONFIG.color;
  let o = S.level === 3 ? S.o2 : 0;
  if (S.phase === 'dying' && S.kind === 3) o = 1;
  const a = easeOut(clamp01(o / 0.45));
  const b = easeInOut(clamp01((o - 0.45) / 0.45));
  const orangeCore = [1.0, 0.62, 0.26];
  const orangeMid = [0.95, 0.36, 0.06];
  const orangeOut = [0.55, 0.14, 0.02];
  return {
    core: lerp3(lerp3(C.core, orangeCore, a), C.o2Core, b),
    mid: lerp3(lerp3(C.mid, orangeMid, a), C.o2Mid, b),
    out: lerp3(lerp3(C.outer, orangeOut, a), C.o2Outer, b),
    warm: lerp3(C.warmLight, [0.35, 0.5, 1.0], b),
    blue: CONFIG.flame.blueAmt + b * 1.5,
    o,
  };
}

function draw() {
  draw2();
  drawTail();
}

function draw2() {
  if (FIXED) {
    // 테스트
    const until = STOP || simF + 1;
    while (simF < until) {
      simF++;
      if (window.simTick) simTick(simF);
      update(1 / 60);
    }
  } else {
    const dt = Math.min(deltaTime / 1000, 1 / 20);
    update(dt);
    perfCheck(dt);
  }

  const t = now();
  const col = flameColors();
  const F = CONFIG.flame;
  // 숨쉬기
  const breath = Math.sin(t * F.breathSpeed) * 0.7 + Math.sin(t * F.breathSpeed * 2.3 + 1.3) * 0.3;
  const size = Math.sqrt(S.sx * S.sy);
  const light = S.life * Math.min(1, size) * (1 - col.o * 0.35);
  const tip = flameTip();
  const cxy = { x: lerp1(lay.wickX, tip.x, 0.4), y: lerp1(lay.flameY, tip.y, 0.4) };
  const Lc = CONFIG.light;

  const st = {
    sx: S.sx * (1 + breath * F.breathAmt * 0.3),
    sy: S.sy * (1 + breath * F.breathAmt),
    lean: S.lean + flutter(t),
    cut: S.cut,
    inten: S.life,
    flick: S.phase === 'dying' ? 1.6 : 1 + Math.abs(S.lean) * 1.2 + col.o * 0.6,
    blue: col.blue,
    ember: S.ember * 0.9,
    cCore: col.core,
    cMid: col.mid,
    cOut: col.out,
    light,
    expo: lerp1(Lc.minExposure, 1, Math.pow(light, 0.8)),
    warm: col.warm,
    pulse: 1 + breath * CONFIG.bloom.pulse * light,
    lx: cxy.x,
    ly: cxy.y,
    glass: glassBox(),
    glassA: clamp01(S.glassA * 1.5) * easeInOut(S.glassVis),
    frost: S.frost,
  };
  renderFrame(st, hasParticles() ? drawParticles : null);
  if (STOP) noLoop();
}

function drawTail() {
  // 테스트
  if (Q.has('bench') && frameCount === 5) bench();
}

function bench() {
  const gl = drawingContext;
  const px = new Uint8Array(4);
  for (const res of [0.5, 0.35]) {
    resizeRender(res);
    for (let i = 0; i < 10; i++) draw2();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < 120; i++) draw2();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    console.log('bench flameRes', res, 'ms/frame', ((performance.now() - t0) / 120).toFixed(2), width + 'x' + height + '@' + pixelDensity());
  }
}

// 입력

function nearWick(x, y) {
  const cx = lay.wickX;
  const cy = lay.wickY - lay.flameH * 0.3;
  return Math.hypot(x - cx, y - cy) < lay.flameH * CONFIG.l1.hitR;
}

function bindInput(el) {
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointerdown', onDown, { passive: false });
  el.addEventListener('pointermove', onMove, { passive: false });
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('lostpointercapture', onUp);
}

function onDown(e) {
  e.preventDefault();
  audioInit();
  try {
    e.target.setPointerCapture(e.pointerId);
  } catch (err) {}
  const p = { x: e.clientX, y: e.clientY, t: stamp() };
  setMouse(e.pointerType === 'mouse');
  hideHint();
  const others = ptrs.size;
  ptrs.set(e.pointerId, p);
  if (e.pointerType === 'mouse') mouseHold = true;

  // 다시 켜기
  if (S.phase === 'dark') {
    if (S.t > CONFIG.time.darkHold) ignite((S.level % 3) + 1);
    return;
  }
  if (S.phase !== 'lit') return;

  if (S.level === 1) {
    const ok = others >= 1 || e.pointerType === 'mouse';
    if (ok && nearWick(p.x, p.y)) kill(1);
  }
}

function onMove(e) {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  e.preventDefault();
  const tm = stamp();
  const dtm = Math.max(4, tm - p.t) / 1000;
  const vx = (e.clientX - p.x) / dtm;
  const vy = (e.clientY - p.y) / dtm;
  p.x = e.clientX;
  p.y = e.clientY;
  p.t = tm;
  if (S.level === 2 && S.phase === 'lit') {
    S.wind = S.wind * 0.55 + vx * 0.45;
    S.windY = S.windY * 0.55 + vy * 0.45;
  }
}

function onUp(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (e.pointerType === 'mouse') mouseHold = false;
}

// UI

function bindUI() {
  const stop = (e) => e.stopPropagation();
  const re = document.getElementById('relight');
  re.addEventListener('pointerdown', stop);
  re.addEventListener('click', () => {
    audioInit();
    if (S.phase === 'dark' || S.phase === 'dying') ignite(S.level);
    else if (S.phase === 'lit') {
      S.o2 = 0;
      S.lean = 0;
      S.leanV = 0;
    }
  });
  const mu = document.getElementById('mute');
  mu.addEventListener('pointerdown', stop);
  mu.addEventListener('click', () => {
    audioInit();
    setMuted(!SFX.muted);
    mu.classList.toggle('off', SFX.muted);
    mu.setAttribute('aria-pressed', SFX.muted ? 'true' : 'false');
  });
}

function updateUI() {
  const dots = document.querySelectorAll('#dots i');
  dots.forEach((d, i) => {
    d.classList.toggle('on', i + 1 === S.level);
    d.classList.toggle('done', i + 1 < S.level);
  });
  document.getElementById('relight').classList.toggle('show', S.phase === 'dark');
}

// 안내 문구

const HINTS = {
  touch: {
    1: '한 손가락을 댄 채, 다른 손가락으로 불꽃을 톡',
    2: '불꽃 옆을 바람처럼 휙',
    3: '길게 눌러 유리컵을 씌워요',
    dark: '화면을 톡, 다음 불꽃',
  },
  mouse: {
    1: '불꽃을 클릭',
    2: '드래그해서 바람처럼 휙',
    3: '꾹 눌러 유리컵을 씌워요',
    dark: '클릭해서 다음 불꽃',
  },
};
const hint = {
  mouse: window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches,
  timer: 0,
  darkShown: false,
};

function setMouse(m) {
  hint.mouse = m;
}

function showHint(key) {
  const el = document.getElementById('hint');
  if (!el) return;
  el.textContent = HINTS[hint.mouse ? 'mouse' : 'touch'][key];
  el.classList.add('show');
  clearTimeout(hint.timer);
  hint.timer = setTimeout(hideHint, CONFIG.hint.show * 1000);
}

function hideHint() {
  const el = document.getElementById('hint');
  if (el) el.classList.remove('show');
  clearTimeout(hint.timer);
}

// 성능

let perf = { acc: 0, n: 0, step: 0 };
function perfCheck(dt) {
  if (perf.step >= 3 || millis() < 3000) return;
  perf.acc += dt;
  perf.n++;
  if (perf.acc < 2) return;
  const avg = perf.acc / perf.n;
  perf.acc = 0;
  perf.n = 0;
  if (avg <= 1 / 50) return;
  perf.step++;
  if (perf.step === 1) {
    CONFIG.flameRes = 0.35;
    CONFIG.bloomRes = 0.2;
  } else {
    const pd = Math.min(pixelDensity(), perf.step === 2 ? 1.5 : 1);
    pixelDensity(pd);
    buildLayers();
  }
  resizeRender();
}
