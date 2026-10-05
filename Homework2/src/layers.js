// 정적 레이어

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function softDot(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.35, `rgba(${rgb},${a * 0.35})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawBg(g) {
  const ctx = g.drawingContext;
  const w = g.width;
  const h = g.height;
  g.clear();
  // 바탕
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#030305');
  bg.addColorStop(0.6, '#050404');
  bg.addColorStop(1, '#020202');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const rnd = rng(7);
  const n = Math.round((w * h) / 4200);
  const S = CONFIG.stars;
  // 별
  for (let i = 0; i < n; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.85;
    const b = Math.pow(rnd(), 3);
    const r = 0.5 + b * 1.3;
    const tint = rnd() < 0.5 ? '255,214,170' : '220,226,255';
    softDot(ctx, x, y, r * 2.2, tint, (0.15 + b * 0.7) * S.bright);
  }
  // 보케
  for (let i = 0; i < S.bokeh; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.75;
    const r = 6 + rnd() * 14;
    softDot(ctx, x, y, r, '255,190,130', (0.03 + rnd() * 0.05) * S.bright);
  }
}

function drawCandle(g) {
  const ctx = g.drawingContext;
  g.clear();
  ctx.save();
  const cx = lay.wickX;
  const top = lay.candTop;
  const cw = lay.candW;
  const bot = lay.candBot;
  const ry = cw * 0.16;
  const x0 = cx - cw / 2;

  // 접시
  const dw = cw * 2.3;
  const dh = cw * 0.36;
  let gr = ctx.createRadialGradient(cx, bot + dh * 0.3, 0, cx, bot + dh * 0.3, dw * 0.6);
  gr.addColorStop(0, 'rgba(0,0,0,0.6)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(cx, bot + dh * 0.3, dw * 0.6, dh * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  gr = ctx.createLinearGradient(cx - dw / 2, 0, cx + dw / 2, 0);
  gr.addColorStop(0, '#0e0b09');
  gr.addColorStop(0.4, '#2c241e');
  gr.addColorStop(1, '#0c0a08');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(cx, bot + dh * 0.14, dw / 2, dh / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  gr = ctx.createLinearGradient(0, bot - dh / 2, 0, bot + dh / 2);
  gr.addColorStop(0, '#2a221c');
  gr.addColorStop(1, '#15110e');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(cx, bot, dw / 2 * 0.97, dh / 2 * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,205,160,0.45)';
  ctx.lineWidth = Math.max(1, cw * 0.018);
  ctx.beginPath();
  ctx.ellipse(cx, bot, dw / 2 * 0.97, dh / 2 * 0.92, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // 그림자
  gr = ctx.createRadialGradient(cx, bot, cw * 0.3, cx, bot, cw * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(cx, bot + ry * 0.2, cw * 0.75, ry * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // 몸통
  gr = ctx.createLinearGradient(x0, 0, x0 + cw, 0);
  gr.addColorStop(0, '#6d6152');
  gr.addColorStop(0.3, '#e6dac2');
  gr.addColorStop(0.55, '#d8cbb0');
  gr.addColorStop(1, '#4e4438');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x0, bot);
  ctx.ellipse(cx, bot, cw / 2, ry, 0, Math.PI, 0, true);
  ctx.lineTo(x0 + cw, top);
  ctx.closePath();
  ctx.fill();

  // 윗면
  ctx.fillStyle = '#f2e9d6';
  ctx.beginPath();
  ctx.ellipse(cx, top, cw / 2, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  gr = ctx.createRadialGradient(cx, top - ry * 0.2, 0, cx, top, cw / 2);
  gr.addColorStop(0, '#c9b48e');
  gr.addColorStop(0.75, '#e8dcc4');
  gr.addColorStop(1, '#f4ecdc');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(cx, top + ry * 0.05, cw / 2 * 0.86, ry * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  // 심지
  ctx.strokeStyle = '#1a120d';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, cw * 0.035);
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.quadraticCurveTo(cx + cw * 0.01, lay.wickY + (top - lay.wickY) * 0.4, cx + cw * 0.03, lay.wickY - lay.flameH * 0.02);
  ctx.stroke();
  ctx.restore();
}

function buildLayers() {
  const pd = pixelDensity();
  if (R.bg) R.bg.remove();
  if (R.cand) R.cand.remove();
  R.bg = createGraphics(width, height);
  R.bg.pixelDensity(Math.min(pd, 1.5));
  drawBg(R.bg);
  R.cand = createGraphics(width, height);
  R.cand.pixelDensity(pd);
  drawCandle(R.cand);
}
