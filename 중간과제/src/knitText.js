// 뜨개 글씨: 글자를 코(짧은 V 두 개) 격자로 떠서 천 위에 그린다.
// 글자 모양은 글꼴을 작은 격자에 찍어 정하고(한 줄 = rows 코), 코마다 실 색 / 바탕 색으로 뜬다.
import * as THREE from 'three';
import { config } from './config.js';

const cache = new Map();

/** 글꼴이 다 내려받아진 뒤에 글자 모양을 만든다 (그 전에 만든 것은 대신 글꼴이라 버린다) */
export function fontReady() {
  const X = config.pad.pixel;
  if (!X || !document.fonts) return Promise.resolve();
  return document.fonts.load(`${X.em}px '${X.family}'`).then(() => cache.clear()).catch(() => {});
}
const font = () => config.pad.font;

/** 글자 하나 → 코 격자 { w, rows, on: Uint8Array } (같은 글자, 같은 높이는 한 번만) */
export function glyph(ch, rows) {
  const key = ch + '/' + rows;
  if (cache.has(key)) return cache.get(key);
  // 굵게: 글꼴 한 칸 = 코 sc×sc (획이 한 코보다 굵어 실제 뜨개 글씨처럼 꽉 찬다)
  const sc = config.pad.pixel?.scale || 1;
  if (sc > 1 && rows % sc === 0) {
    const g0 = glyph1(ch, rows / sc), w = g0.w * sc, on = new Uint8Array(w * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) on[y * w + x] = g0.on[Math.floor(y / sc) * g0.w + Math.floor(x / sc)];
    const g = { w, rows, on };
    cache.set(key, g);
    return g;
  }
  return glyph1(ch, rows);
}
function glyph1(ch, rows) {
  const key = ch + '/' + rows + '/1';
  if (cache.has(key)) return cache.get(key);
  const P = config.pad, X = P.pixel;
  // 픽셀 글꼴: 글꼴의 한 칸 = 코 하나 (칸에 맞춰 그린 글꼴이라 받침이 뭉치지 않는다)
  const k = X ? 8 : 6; // 크게 그려서 코마다 덮인 정도로 정한다
  const h = rows * k;
  const size = X ? X.em * k : Math.round(h * P.glyphSize);
  const fam = X ? `'${X.family}'` : font();
  const cv = document.createElement('canvas');
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.font = `${size}px ${fam}`;
  const adv = ch === ' ' ? (X ? X.space : rows * 0.4) * k : c.measureText(ch).width;
  const w = Math.max(1, Math.round(adv / k));
  cv.width = w * k;
  cv.height = h;
  c.font = `${size}px ${fam}`;
  c.fillStyle = '#000';
  if (X) {
    // 글꼴 상자(위 여백 + 아래 여백)를 재서 한 줄 안에 다 들어오게 가운데로
    const m = c.measureText('갉');
    const asc = m.fontBoundingBoxAscent, box = asc + m.fontBoundingBoxDescent;
    const top = Math.round((h - box) / 2 / k) * k; // 칸에 맞춰 (반 칸 걸치면 획이 흐려진다)
    c.textBaseline = 'alphabetic';
    c.fillText(ch, 0, top + asc + (X.dy || 0) * k);
  }
  else { c.textBaseline = 'middle'; c.fillText(ch, (w * k - adv) / 2, h * 0.53); }
  const px = c.getImageData(0, 0, w * k, h).data;
  const on = new Uint8Array(w * rows);
  const th = X ? 0.5 : P.ink;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) sum += px[((y * k + j) * w * k + x * k + i) * 4 + 3];
      on[y * w + x] = sum / (k * k * 255) > th ? 1 : 0;
    }
  }
  // 픽셀 글꼴은 글자 오른쪽에 이미 한 칸 띄움이 들어 있다 → 빈 열은 잘라 낸다
  let ww = w;
  if (X && ch.trim()) while (ww > 1 && ![...Array(rows).keys()].some((y) => on[y * w + ww - 1])) ww--;
  const g = { w: ww, rows, on: ww === w ? on : on.filter((_, i) => i % w < ww) };
  cache.set(key, g);
  return g;
}

/**
 * 글을 줄로 나눠 코 자리를 정한다. → { lines: [[{ch, x, g}]], cols, n(글자 수) }
 * cols = 한 줄의 코 수. 글자 사이는 한 코 띄운다.
 */
export function layout(text, rows, cols) {
  const lines = [[]];
  let x = 1;
  // 낱말 단위로 줄을 바꾼다 (한 줄보다 긴 낱말만 글자 단위로)
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    const chars = [...word].map((ch) => ({ ch, g: glyph(ch, rows) }));
    const ww = chars.reduce((a, c) => a + c.g.w + 1, 0);
    if (!/\s/.test(word) && x + ww > cols && x > 1 && ww <= cols - 1) { lines.push([]); x = 1; }
    for (const { ch, g } of chars) {
      if (x + g.w > cols - 1 && lines[lines.length - 1].length) {
        lines.push([]);
        x = 1;
        if (ch === ' ') continue; // 줄 첫머리 띄어쓰기는 버린다
      }
      lines[lines.length - 1].push({ ch, x, g });
      x += g.w + (ch === ' ' ? 0 : config.pad.pixel?.scale || 1);
    }
  }
  return { lines, cols };
}

// 정원과 같은 툰 색: 밝은 면 = 색 × 금빛, 그림자 면 = 색 × 청보라. 잉크는 보라빛 남색
const INK = '#3a3766';
const mulCache = new Map();
export function mul(hex, by) {
  const k = hex + by;
  if (mulCache.has(k)) return mulCache.get(k);
  const a = new THREE.Color(hex), b = new THREE.Color(by);
  const out = '#' + a.multiply(b).getHexString();
  mulCache.set(k, out);
  return out;
}
const lit = (c) => mul(c, config.look.lit), shade = (c) => mul(c, config.look.shade);

/** 코 하나: 둥근 V 다리 두 개. 왼 다리는 바탕색, 오른 다리는 한 톤 어둡게 (실이 꼬인 결).
 *  ink > 0 이면 얇은 잉크 윤곽 (글자 코만). v = 아주 작은 모양 차이 (손뜨개 느낌) */
function stitch(c, x, y, s, col, edge, ink = 1, v = 0) {
  const h = s * 1.08, k = ((v * 37) % 5) / 5 - 0.4; // -0.4 ~ 0.4
  for (const d of [-1, 1]) {
    const cx = x + s * 0.5 + d * s * (0.24 + k * 0.012), w = s * (ink > 0 ? 0.29 : 0.25);
    c.save();
    c.translate(cx, y + h * 0.42);
    c.rotate(d * (0.5 + k * 0.03));
    c.beginPath();
    c.ellipse(0, 0, w, h * 0.5, 0, 0, Math.PI * 2);
    c.fillStyle = d < 0 ? col : mul(col, '#e9e6f3');
    c.fill();
    if (ink > 0) { c.strokeStyle = edge; c.globalAlpha = ink * Math.min(1, s / 8); c.lineWidth = Math.max(0.5, s * 0.07); c.stroke(); c.globalAlpha = 1; }
    // 실 결: 다리 가운데 가는 밝은 선
    c.strokeStyle = 'rgba(255,253,246,0.32)';
    c.lineWidth = Math.max(0.5, s * 0.055);
    c.beginPath(); c.moveTo(-w * 0.15, -h * 0.32); c.lineTo(-w * 0.15, h * 0.28); c.stroke();
    c.restore();
  }
}
function stitchShadow(c, x, y, s) {
  const h = s * 1.05;
  c.fillStyle = 'rgba(80,76,150,0.22)';
  for (const d of [-1, 1]) {
    const x0 = x + s * 0.5 + d * s * 0.46, x1 = x + s * 0.5 + d * s * 0.06, w = s * 0.26;
    c.beginPath();
    c.moveTo(x0 - w, y); c.lineTo(x0 + w, y);
    c.lineTo(x1 + w, y + h * 0.9); c.lineTo(x1 - w, y + h * 0.9);
    c.closePath(); c.fill();
  }
}

// 코 하나를 미리 그린 작은 그림 (색마다 한 번). 매번 선을 긋지 않고 찍기만 한다
const sprites = new Map();
function sprite(s, col, edge, dpr, ink = 1, sh = false, v = 0) {
  const key = `${s}/${col}/${edge}/${dpr}/${ink}/${sh}/${v}`;
  if (sprites.has(key)) return sprites.get(key);
  const pad = Math.ceil(s * 0.3);
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((s + pad * 2) * dpr);
  cv.height = Math.ceil((s * 1.2 + pad * 2) * dpr);
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);
  if (sh) stitchShadow(c, 0, 0, s);
  else stitch(c, 0, 0, s, col, edge, ink, v);
  const sp = { cv, pad, w: cv.width / dpr, h: cv.height / dpr };
  if (sprites.size > 200) sprites.clear();
  sprites.set(key, sp);
  return sp;
}

// 바탕 (틀 + 레이스 + 바탕 코): 크기와 색이 같으면 다시 그리지 않는다
const bases = new Map();
function baseLayer(W, H, fw, fh, F, lace, bar, s, cols, o, dpr) {
  const key = `${W}/${H}/${s}/${cols}/${o.base}/${o.shade}/${o.edge}/${F}/${dpr}`;
  if (bases.has(key)) return bases.get(key);
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (F) frame(c, W, H, F, o);
  c.save();
  c.translate(F, F + lace);
  c.beginPath(); c.rect(0, -lace, fw, fh + lace + bar); c.clip();
  c.fillStyle = o.shade;
  c.fillRect(0, 0, fw, fh + bar);
  const sps = [0, 1, 2, 3].map((v) => sprite(s, o.base, o.edge, dpr, 0, false, v)), ny = Math.ceil((fh + bar) / s);
  for (let y = 0; y < ny; y++) for (let x = 0; x < cols; x++) {
    const sp = sps[(x * 7 + y * 13) % 4];
    c.drawImage(sp.cv, x * s - sp.pad, y * s - sp.pad, sp.w, sp.h);
  }
  if (F) {
    laceEdge(c, fw, lace, s);
    // 틀 안쪽 위·왼쪽: 틀이 드리운 납작한 그늘 한 띠
    c.fillStyle = 'rgba(96,92,170,0.16)';
    c.fillRect(0, -lace, fw, Math.max(4, s * 0.6));
    c.fillRect(0, -lace, Math.max(4, s * 0.6), fh + lace + bar);
  }
  c.restore();
  if (bases.size > 8) bases.clear();
  bases.set(key, cv);
  return cv;
}

/**
 * 천에 글을 뜬다. o = { s 코 크기, rows, cols, lineGap, color 글 실, base 바탕 실, shade 코 사이,
 *   edge / edgeOn 테두리, reveal(글자별 0~1), frame(틀 두께, 0 = 없음), knot(바늘 매듭) }
 */
export function drawFabric(cv, text, o) {
  const { s, rows, cols } = o;
  const gap = o.lineGap ?? 2;
  const F = o.frame || 0, lace = F ? s * 1.6 : 0, bar = F ? s * 2.2 : 0;
  const L = layout(text, rows, cols);
  const nLines = Math.max(o.minLines || 1, L.lines.length);
  const fh = (gap + nLines * (rows + gap)) * s;
  const fw = cols * s;
  const W = fw + F * 2, H = fh + F * 2 + lace + bar;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
  }
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  c.drawImage(baseLayer(W, H, fw, fh, F, lace, bar, s, cols, o, dpr), 0, 0);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 글자 코만 위에 찍는다 (아래 단부터, 뜬 정도만큼)
  const sps = [0, 1, 2, 3].map((v) => sprite(s, o.color, o.edgeOn, dpr, 0.55, false, v)), ox = F, oy = F + lace;
  const pts = [];
  // center: 글 덩어리를 천 가운데에 (줄마다 가운데 맞춤)
  const used = L.lines.length * (rows + gap) - gap;
  const top = o.center ? Math.max(gap, Math.round((fh / s - used) / 2)) : gap;
  const lineW = (line) => (line.length ? line[line.length - 1].x + line[line.length - 1].g.w + 1 : 1);
  const left = (line) => (o.center ? Math.max(0, Math.floor((cols - lineW(line) - 1) / 2)) : 0);
  let idx = 0;
  L.lines.forEach((line, li) => {
    const y0 = top + li * (rows + gap), dx = left(line);
    for (const { x: x0, g } of line) {
      const x = x0 + dx;
      const r = o.reveal ? o.reveal[idx] ?? 1 : 1;
      const need = r >= 1 ? Infinity : r * g.on.reduce((a, b) => a + b, 0);
      let k = 0;
      for (let yy = rows - 1; yy >= 0; yy--) {
        for (let xx = 0; xx < g.w; xx++) {
          if (!g.on[yy * g.w + xx] || k++ >= need) continue;
          pts.push(ox + (x + xx) * s - sps[0].pad, oy + (y0 + yy) * s - sps[0].pad);
        }
      }
      idx++;
    }
  });
  for (let i = 0; i < pts.length; i += 2) {
    const sp = sps[((pts[i] / s) * 7 + (pts[i + 1] / s) * 13 & 1023) % 4];
    c.drawImage(sp.cv, pts[i], pts[i + 1], sp.w, sp.h);
  }
  const last = lastSpot(L, rows, gap, s);
  last.x += left(L.lines[L.lines.length - 1]) * s;
  if (F) {
    c.save();
    c.translate(F, F + lace);
    needleBar(c, fw, fh + bar * 0.45, s, o.knot ? last.x : null, o, F);
    c.restore();
  }
  return { lines: nLines, height: H, width: W, last: { x: last.x + F, y: last.y + F + lace } };
}

// 잉크 선: 점을 곧게 잇는다 (반 픽셀에 맞춰 또렷하게)
export function wob(c, pts, close = false) {
  const p = (v) => Math.round(v) + 0.5;
  c.beginPath();
  c.moveTo(p(pts[0][0]), p(pts[0][1]));
  for (let i = 1; i < pts.length; i++) c.lineTo(p(pts[i][0]), p(pts[i][1]));
  if (close) c.closePath();
}
// 빗금: 손으로 그은 사선 (그림자 대신)
export function hatch(c, x, y, w, h, s) {
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.strokeStyle = 'rgba(58,55,102,0.35)'; c.lineWidth = 1;
  const g = Math.max(4, s * 0.7);
  for (let k = -h; k < w; k += g) { c.beginPath(); c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); c.stroke(); }
  c.restore();
}

// 나무 뜨개틀: 납작한 나무색 + 또렷한 잉크 선 + 모서리 맞춤선 + 곧은 나뭇결 + 아래·오른쪽 그늘 띠
function frame(c, W, H, F, o) {
  const wood = o.wood || '#ecd3a3', dark = mul(wood, '#d8d2ea');
  c.fillStyle = wood;
  c.fillRect(0, 0, W, H);
  // 아래·오른쪽 나무는 그늘 (해는 왼쪽 위)
  c.fillStyle = dark;
  c.beginPath(); c.moveTo(W, 0); c.lineTo(W, H); c.lineTo(0, H); c.lineTo(F, H - F); c.lineTo(W - F, H - F); c.lineTo(W - F, F); c.closePath(); c.fill();
  // 곧은 나뭇결 (각 변을 따라 두 줄씩, 끊어서)
  c.strokeStyle = 'rgba(160,112,62,0.32)'; c.lineWidth = 1;
  for (const k of [0.36, 0.64]) {
    const q = F * k;
    for (const [a, b] of [[[F, q], [W * 0.42, q]], [[W * 0.5, q], [W - F, q]], [[F, H - q], [W * 0.6, H - q]], [[W * 0.66, H - q], [W - F, H - q]],
      [[q, F], [q, H * 0.55]], [[q, H * 0.62], [q, H - F]], [[W - q, F], [W - q, H * 0.4]], [[W - q, H * 0.48], [W - q, H - F]]]) {
      wob(c, [a, b]); c.stroke();
    }
  }
  c.strokeStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round';
  // 모서리 맞춤선 (액자 나무 네 쪽이 만나는 곳)
  c.lineWidth = 1;
  for (const [a, b] of [[[0, 0], [F, F]], [[W, 0], [W - F, F]], [[0, H], [F, H - F]], [[W, H], [W - F, H - F]]]) { wob(c, [a, b]); c.stroke(); }
  c.lineWidth = 1.6;
  wob(c, [[0.5, 0.5], [W - 1, 0.5], [W - 1, H - 1], [0.5, H - 1]], true); c.stroke();
  c.lineWidth = 1.3;
  wob(c, [[F, F], [W - F, F], [W - F, H - F], [F, H - F]], true); c.stroke();
}
function laceEdge(c, fw, lace, s) {
  const r = s * 1.1, white = '#f6f1e6';
  c.fillStyle = white;
  c.fillRect(0, -lace, fw, lace * 0.45);
  c.strokeStyle = INK; c.lineWidth = 0.9;
  for (let x = r; x < fw + r; x += r * 2) {
    c.fillStyle = white;
    c.beginPath(); c.arc(x, -lace * 0.55, r, 0, Math.PI); c.fill(); c.stroke();
    c.beginPath(); c.arc(x, -lace * 0.5, r * 0.28, 0, 7); c.stroke();
  }
}
function needleBar(c, fw, y, s, kx, o, F) {
  const t = Math.max(7, s * 1.3);
  const kxx = kx === null ? null : Math.min(Math.max(kx, s * 2), fw - s * 2);
  // 실: 매듭에서 틀 오른쪽 아래 밖으로 (바늘보다 먼저 그려 바늘 뒤로 지나가게)
  if (kxx !== null) {
    c.strokeStyle = '#3a3766'; c.lineWidth = Math.max(3, s * 0.7) + 2; c.lineCap = 'round';
    const path = () => { c.beginPath(); c.moveTo(kxx, y); c.bezierCurveTo(kxx + s * 3, y + s * 4, fw - s * 4, y + s * 1, fw + F + s * 2, y + s * 5); };
    path(); c.stroke();
    c.strokeStyle = o.yarnLine || o.color; c.lineWidth = Math.max(3, s * 0.7);
    path(); c.stroke();
  }
  // 바늘 막대 (나무): 납작한 색 + 손으로 그은 잉크 선
  const nd = o.needle || '#e9c98f';
  c.fillStyle = nd;
  round(c, -F * 0.7, y - t / 2, fw + F * 1.4, t, t / 2); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.4; c.lineJoin = 'round';
  wob(c, [[-F * 0.7 + t / 2, y - t / 2], [fw + F * 0.7 - t / 2, y - t / 2]], false, 4, 0.5); c.stroke();
  wob(c, [[-F * 0.7 + t / 2, y + t / 2], [fw + F * 0.7 - t / 2, y + t / 2]], false, 5, 0.5); c.stroke();
  c.lineWidth = 0.8;
  wob(c, [[-F * 0.4, y + t * 0.1], [fw + F * 0.4, y + t * 0.1]], false, 6, 0.4); c.stroke(); // 결 한 줄
  for (const x of [-F * 0.7, fw + F * 0.7]) {
    c.beginPath(); c.arc(x, y, t * 0.78, 0, 7); c.fillStyle = nd; c.fill(); c.lineWidth = 1.4; c.stroke();
  }
  if (kxx === null) return;
  // 지금 뜨는 자리: 바늘에 감긴 실 매듭
  const yc = o.yarnLine || o.color;
  c.fillStyle = yc;
  round(c, kxx - t * 0.7, y - t * 1.0, t * 1.4, t * 2.0, t * 0.55); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
  c.lineWidth = 0.9;
  for (const k of [-0.45, 0, 0.45]) { c.beginPath(); c.moveTo(kxx - t * 0.55, y + k * t); c.lineTo(kxx + t * 0.55, y + k * t - t * 0.2); c.stroke(); }
}
function round(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// 마지막 글자 다음 자리 (px, 천 기준)
function lastSpot(L, rows, gap, s) {
  const li = L.lines.length - 1, line = L.lines[li];
  const end = line.length ? line[line.length - 1].x + line[line.length - 1].g.w + 1 : 1;
  return { x: end * s, y: (gap + li * (rows + gap) + rows / 2) * s };
}

/** 실 색 → 천 색 (톤온톤: 천은 실 색, 글자는 같은 색 계열의 진한 톤). 테두리는 정원처럼 잉크 쪽으로 */
export function fabricColors(tones) {
  const shift = (hex, l) => { const c = new THREE.Color(hex); const h = {}; c.getHSL(h); c.setHSL(h.h, h.s, Math.max(0, Math.min(1, h.l + l))); return '#' + c.getHexString(); };
  const sat = (hex, k) => { const c = new THREE.Color(hex); const h = {}; c.getHSL(h); c.setHSL(h.h, Math.min(1, h.s + k), h.l); return '#' + c.getHexString(); };
  const toInk = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color(INK), k).getHexString();
  return {
    base: tones.light, shade: mul(tones.light, '#e2dff0'),
    edge: toInk(tones.base, 0.3), color: sat(shift(tones.dark, -0.1), 0.12), edgeOn: toInk(tones.dark, 0.4),
    yarnLine: tones.dark,
  };
}

/** 뜨개 글씨 제목: 바탕 천 없이 글자 코만, 글자마다 다른 실 색 (뜨개방 제목) */
export function drawWord(cv, text, s, colors) {
  const rows = config.pad.rows;
  const L = layout(text, rows, 999);
  const line = L.lines[0] || [];
  const cols = line.length ? line[line.length - 1].x + line[line.length - 1].g.w + 1 : 4;
  const W = cols * s, H = (rows + 1) * s;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  line.forEach(({ x, g }, i) => {
    const col = colors[i % colors.length];
    for (let yy = 0; yy < rows; yy++) {
      for (let xx = 0; xx < g.w; xx++) if (g.on[yy * g.w + xx]) stitch(c, (x + xx) * s, yy * s, s, col.base, col.edge);
    }
  });
}
