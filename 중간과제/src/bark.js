// 나무껍질 디테일 텍스처 (만화 일러스트용)
// rgb = 아주 옅은 색연필 얼룩 (재질 색에 곱해진다), a = 결을 따라 흐르는 잉크 선
// 세로(v) = 가지 길이 방향. 가로/세로 모두 이음매 없이 반복된다.
import * as THREE from 'three';
import { config } from './config.js';
import { makeRandom } from './random.js';

export function makeBark(renderer) {
  const k = config.bark;
  const n = k.size;
  const rand = makeRandom(config.seed + 21);
  const col = document.createElement('canvas');
  const ink = document.createElement('canvas');
  col.width = col.height = ink.width = ink.height = n;
  const c = col.getContext('2d');
  const g = ink.getContext('2d');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, n, n);

  // 1) 색연필 얼룩: 결 방향으로 긴 옅은 획 (분홍, 이끼, 라벤더)
  for (let i = 0; i < k.tints; i++) {
    const x = rand() * n, y = rand() * n;
    const color = k.tintColors[Math.floor(rand() * k.tintColors.length)];
    const w = n * (0.01 + rand() * 0.03), len = n * (0.15 + rand() * 0.4);
    const a = 0.08 + rand() * 0.12;
    wrap(n, x, y, (ox, oy) => line(c, x + ox, y + oy, len, (rand() - 0.5) * n * 0.02, w, color, a));
  }

  // 2) 잉크 결 선: 길고 가는 선 + 짧은 끊긴 선. 한 번에 그어 굵기가 고르지 않다.
  g.strokeStyle = '#000';
  for (let i = 0; i < k.lines; i++) {
    const x = rand() * n, y = rand() * n;
    const long = rand() < 0.6;
    const len = n * (long ? 0.25 + rand() * 0.45 : 0.04 + rand() * 0.12);
    const wob = (rand() - 0.5) * n * (long ? 0.03 : 0.01);
    const w = n * (0.0022 + rand() * 0.0026);
    const a = 0.55 + rand() * 0.45;
    wrap(n, x, y, (ox, oy) => taper(g, x + ox, y + oy, len, wob, w, a));
  }
  // 3) 작은 옹이 눈: 결이 감싸는 타원 몇 개
  for (let i = 0; i < k.knots; i++) {
    const x = rand() * n, y = rand() * n, rx = n * (0.006 + rand() * 0.01), ry = rx * (2 + rand() * 2);
    wrap(n, x, y, (ox, oy) => {
      g.globalAlpha = 0.8;
      g.lineWidth = n * 0.0022;
      g.beginPath();
      g.ellipse(x + ox, y + oy, rx, ry, 0, 0, Math.PI * 2);
      g.stroke();
    });
  }
  g.globalAlpha = 1;

  // 색(rgb) + 잉크(alpha) 합치기.
  // 캔버스는 투명한 곳의 색을 지워버리므로 픽셀 배열로 바로 텍스처를 만든다.
  const ci = c.getImageData(0, 0, n, n), gi = g.getImageData(0, 0, n, n);
  for (let i = 0; i < n * n; i++) ci.data[i * 4 + 3] = gi.data[i * 4 + 3];
  return dataTexture(ci.data, n, renderer);
}

// 픽셀 배열 → 반복되는 고품질 텍스처 (밉맵 + 이방성 필터링)
export function dataTexture(data, n, renderer, h = n) {
  const tex = new THREE.DataTexture(new Uint8Array(data.buffer.slice(0)), n, h);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

// 가장자리를 넘는 그림은 반대편에도 그린다 → 이음매 없음
function wrap(n, x, y, fn) {
  for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) fn(ox, oy);
}

function line(ctx, x, y, len, wob, w, color, a) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = a;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + wob, y + len / 2, x, y + len);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// 양 끝이 가늘어지는 펜 선 (짧은 마디로 나눠 굵기를 바꾼다)
function taper(ctx, x, y, len, wob, w, a) {
  const seg = 10;
  ctx.globalAlpha = a;
  ctx.lineCap = 'round';
  let px = x, py = y;
  for (let i = 1; i <= seg; i++) {
    const u = i / seg;
    const nx = x + wob * Math.sin(u * Math.PI), ny = y + len * u;
    ctx.lineWidth = w * (0.3 + Math.sin(u * Math.PI) * 0.9);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    px = nx; py = ny;
  }
  ctx.globalAlpha = 1;
}
