// 파티클
let sprite;
let smokes = [];
let embers = [];

function makeSprite() {
  sprite = createGraphics(64, 64);
  sprite.pixelDensity(1);
  const ctx = sprite.drawingContext;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
}

// 연기
function spawnSmoke(x, y, drift) {
  const S = CONFIG.smoke;
  for (let i = 0; i < S.count; i++) {
    smokes.push({
      x,
      y,
      vx: drift * (0.6 + Math.random() * 0.5),
      vy: -S.rise * (0.8 + Math.random() * 0.4),
      age: -i * S.gap,
      life: S.life * (0.75 + Math.random() * 0.4),
      seed: Math.random() * 100,
    });
  }
}

// 불씨
function spawnEmbers(x, y, dirX, speed, n) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + dirX * (0.9 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.5;
    const v = speed * (0.5 + Math.random() * 0.6);
    embers.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      age: 0,
      life: 0.6 + Math.random() * 0.6,
      size: 2.5 + Math.random() * 3.5,
      hot: 1,
    });
  }
}

// 성냥 불꽃
function spawnSparks(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const v = 60 + Math.random() * 120;
    embers.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      age: 0,
      life: 0.25 + Math.random() * 0.35,
      size: 1.5 + Math.random() * 2,
      hot: 1.4,
    });
  }
}

function updateParticles(dt) {
  const C = CONFIG.smoke;
  // 유리컵 안 연기
  const g = S.level === 3 && S.glassA > 0.5 && !S.glassOut ? glassBox() : null;
  for (const p of smokes) {
    p.age += dt;
    if (p.age < 0) continue;
    p.vx *= Math.exp(-dt * 0.8);
    // 흔들림
    const flow = (noise(p.y * 0.012, now() * 0.35) - 0.5) * 2;
    p.x += p.vx * dt + flow * C.sway * dt * (0.4 + p.age * 1.2);
    p.y += p.vy * dt;
    p.vy *= Math.exp(-dt * 0.25);
    if (g) {
      const ceil = g[1] + lay.flameH * 0.2;
      if (p.y < ceil) {
        p.y = ceil;
        p.vy = 0;
        if (!p.side) p.side = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 25);
        p.vx = p.side;
      }
      const lim = g[2] * 0.75;
      p.x = Math.max(g[0] - lim, Math.min(g[0] + lim, p.x));
    }
  }
  smokes = smokes.filter((p) => p.age < p.life);

  for (const p of embers) {
    p.age += dt;
    p.vy += 260 * dt; // 중력
    p.vx *= Math.exp(-dt * 1.2);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  embers = embers.filter((p) => p.age < p.life);
}

function drawParticles() {
  const C = CONFIG.smoke;
  imageMode(CENTER);
  const dim = 1 - S.life * 0.75;
  for (const p of smokes) {
    if (p.age < 0) continue;
    const k = p.age / p.life;
    const a = Math.min(1, p.age / 0.3) * Math.pow(1 - k, 1.8) * 0.8;
    const sz = C.size[0] + (C.size[1] - C.size[0]) * Math.pow(k, 0.7);
    const v = 255 * C.bright * a * dim;
    tint(v * 0.85, v * 0.85, v * 0.9);
    image(sprite, p.x, p.y, sz * 0.8, sz * 1.4);
  }
  for (const p of embers) {
    const k = p.age / p.life;
    const a = 1 - k * k;
    const sz = p.size * (1 - k * 0.7);
    tint(255 * a * p.hot, 150 * a * p.hot, 50 * a);
    image(sprite, p.x, p.y, sz * 3, sz * 3);
    tint(255 * a, 230 * a, 180 * a);
    image(sprite, p.x, p.y, sz, sz);
  }
  noTint();
}

function hasParticles() {
  return smokes.length > 0 || embers.length > 0;
}
