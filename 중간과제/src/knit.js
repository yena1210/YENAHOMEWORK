// 뜨개 조각 룩: 실 색 톤, 짜임 텍스처(망사, 줄무늬 메리야스, 그래니 스퀘어 4종)
// 텍스처는 rgb = 색면, a = 잉크 선. 망사는 구멍 마스크를 따로 만든다.
import * as THREE from 'three';
import { config } from './config.js';
import { makeRandom } from './random.js';
import { dataTexture } from './bark.js';
import { knitTex } from './craftTex.js';

/**
 * 색상(hue, 0~360) 하나 → 실 한 타래의 톤 4개 (sRGB 16진수)
 * base 기본 / light 밝음 / dark 어두움 / accent 포인트(반대쪽 색)
 */
export function yarnTones(hue) {
  const K = config.knit.tone;
  const V = config.knit.looks[config.knit.look];
  const S = K.s * V.sat, Lt = K.l + V.light;
  const c = (h, s, l) => '#' + new THREE.Color().setHSL(((h % 360) + 360) % 360 / 360, s, l, THREE.SRGBColorSpace).getHexString(THREE.SRGBColorSpace);
  return {
    base: c(hue, S, Lt),
    light: c(hue + 6, S * 0.85, Lt + 0.1),
    dark: c(hue - 8, S * 0.8, Lt - 0.14),
    accent: c(hue + K.accentShift, S * 0.9, Lt + 0.04),
  };
}

// 색 캔버스(c) + 잉크 캔버스(g) + (선택) 구멍 캔버스(m)에 그려 텍스처로 만든다
function make(n, draw, renderer, holes = false) {
  const mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = n; return cv; };
  const col = mk(), ink = mk(), hole = holes ? mk() : null;
  const c = col.getContext('2d'), g = ink.getContext('2d'), m = hole?.getContext('2d');
  for (const x of [c, g, m]) if (x) { x.lineCap = 'round'; x.lineJoin = 'round'; }
  g.strokeStyle = g.fillStyle = '#000';
  draw(c, g, m, n);
  const ci = c.getImageData(0, 0, n, n), gi = g.getImageData(0, 0, n, n);
  for (let i = 0; i < n * n; i++) ci.data[i * 4 + 3] = gi.data[i * 4 + 3];
  const map = dataTexture(ci.data, n, renderer);
  let mask = null;
  if (hole) {
    const t = new THREE.CanvasTexture(hole);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    mask = t;
  }
  return { map, mask };
}

// 잉크로 테두리만 그린 굵은 선 (가운데는 비운다) → 실 한 가닥처럼 보인다
function strand(c, g, pts, w, color, inkW) {
  const path = (ctx) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); };
  c.strokeStyle = color; c.lineWidth = w; path(c); c.stroke();
  g.lineWidth = w + inkW * 2; path(g); g.stroke();
  g.globalCompositeOperation = 'destination-out';
  g.lineWidth = w; path(g); g.stroke();
  g.globalCompositeOperation = 'source-over';
}

// 둥근 덩어리 하나 (코, 방울, 꽃잎): 색 채우기 + 잉크 테두리 + 밝은 결
function blob(c, g, x, y, rx, ry, rot, color, inkW, light = 'rgba(255,255,255,0.35)') {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = color; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill();
  c.strokeStyle = light; c.lineWidth = Math.min(rx, ry) * 0.35;
  c.beginPath(); c.ellipse(-rx * 0.15, -ry * 0.1, rx * 0.45, ry * 0.5, 0, 3.6, 5.4); c.stroke();
  c.restore();
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineWidth = inkW; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.stroke();
  g.restore();
}

/** 성근 망사: 사슬로 엮은 다이아몬드 그물. 구멍은 실제로 뚫린다. */
export function meshTex(renderer, t) {
  return make(512, (c, g, m, n) => {
    const w = n * 0.11, ink = n * 0.01;
    c.fillStyle = t.base; c.fillRect(0, 0, n, n);
    m.fillStyle = '#000'; m.fillRect(0, 0, n, n);
    m.strokeStyle = '#fff'; m.lineWidth = w + ink * 2.4;
    // 다이아몬드 그물: 두 방향 대각선 가닥. 옆 칸 복사본까지 그려 이음매가 없다.
    const lines = [];
    for (const ox of [-n, 0, n]) lines.push([[ox, 0], [ox + n, n]], [[ox + n, 0], [ox, n]]);
    for (const [a, b] of lines) {
      strand(c, g, [a, b], w, t.base, ink);
      m.beginPath(); m.moveTo(...a); m.lineTo(...b); m.stroke();
      // 사슬 코: 가닥을 따라 짧은 타원 고리
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = 10;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (let i = 0; i < k; i++) {
        const u = (i + 0.5) / k;
        g.save(); g.translate(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); g.rotate(ang);
        g.lineWidth = ink * 0.7; g.globalAlpha = 0.8;
        g.beginPath(); g.ellipse(0, 0, (L / k) * 0.36, w * 0.22, 0, 0, 7); g.stroke();
        g.restore(); g.globalAlpha = 1;
      }
    }
    // 가닥이 만나는 곳: 작은 매듭 방울
    for (const [x, y] of [[0, 0], [n, 0], [0, n], [n, n], [n / 2, n / 2]]) {
      blob(c, g, x, y, w * 0.85, w * 0.72, 0.4, t.light, ink);
      m.fillStyle = '#fff'; m.beginPath(); m.arc(x, y, w * 1.1, 0, 7); m.fill();
    }
  }, renderer, true);
}

/** 줄무늬 메리야스: V자 코 + 톤 줄무늬 */
export function stripeTex(renderer, t) {
  const stripes = [t.base, t.base, t.base, t.light, t.light, t.accent, t.base, t.base, t.dark, t.light];
  return { map: knitTex(renderer, { cols: 8, rows: 10, stripes, seed: 3 }), mask: null };
}

/**
 * 그래니 스퀘어 한 장. motif: 'rounds' 라운드 / 'flower' 꽃 / 'bobble' 방울 / 'burst' 방사형
 * 가운데에서 바깥으로 라운드를 쌓는다. 라운드마다 색 띠가 꽉 차 있고,
 * 그 위에 코(기둥)의 경계, 묶음 사이 틈, 모서리 사슬 구멍을 잉크로 그린다.
 */
export function grannyTex(renderer, t, motif = 'rounds', seed = 1) {
  const rand = makeRandom(seed);
  return make(512, (c, g, m, n) => drawGranny(c, g, n, t, motif, rand), renderer);
}

/**
 * 그래니 모자이크: 2×2 칸에 무늬 4종을 섞고 톤도 조금씩 다르게 → 여러 장을 이어 붙인 느낌
 */
export function grannyMosaic(renderer, hue, seed = 1) {
  const rand = makeRandom(seed);
  const motifs = ['rounds', 'flower', 'bobble', 'burst'];
  const hues = [hue, hue + 24, hue - 24, hue + 10];
  return make(1024, (c, g, m, n) => {
    for (let k = 0; k < 4; k++) {
      const ox = (k % 2) * (n / 2), oy = Math.floor(k / 2) * (n / 2);
      c.save(); g.save();
      c.translate(ox, oy); g.translate(ox, oy);
      drawGranny(c, g, n / 2, yarnTones(hues[k]), motifs[(k + seed) % 4], rand);
      c.restore(); g.restore();
    }
  }, renderer);
}

function drawGranny(c, g, n, t, motif, rand) {
  {
    const cx = n / 2, cy = n / 2, ink = n * 0.008;
    const gap = new THREE.Color(t.dark).multiplyScalar(0.72).getStyle(THREE.SRGBColorSpace);
    const W = n / 2;
    const wob = () => (rand() - 0.5) * n * 0.004; // 손뜨개의 삐뚤함

    // 정사각형 라운드: 반폭 d 의 고리, 띠 폭 band
    const squareRound = (d, band, color, clusters) => {
      const o = d + band / 2, i = d - band / 2;
      c.fillStyle = color;
      c.beginPath(); c.rect(cx - o, cy - o, o * 2, o * 2); c.rect(cx - i, cy - i, i * 2, i * 2); c.fill('evenodd');
      for (let side = 0; side < 4; side++) {
        const rot = (side * Math.PI) / 2;
        const P = (along, out) => {
          const lx = along, ly = -(d + out);
          return [cx + lx * Math.cos(rot) - ly * Math.sin(rot), cy + lx * Math.sin(rot) + ly * Math.cos(rot)];
        };
        const span = d * 2 - band * 0.6;
        const per = clusters * 3;
        for (let k = 0; k <= per; k++) {
          const along = -span / 2 + (span * k) / per;
          const [x0, y0] = P(along + wob(), -band * 0.42);
          const [x1, y1] = P(along + wob(), band * 0.42);
          if (k % 3 === 0) {
            // 묶음 사이 틈: 어두운 홈 + 진한 선
            c.strokeStyle = gap; c.lineWidth = band * 0.16; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
            g.lineWidth = ink * 1.1; g.globalAlpha = 0.9;
          } else {
            g.lineWidth = ink * 0.6; g.globalAlpha = 0.55; // 기둥 사이 가는 경계
          }
          g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          // 기둥 가운데 밝은 결
          if (k < per) {
            const [a0, b0] = P(along + span / per / 2, -band * 0.3), [a1, b1] = P(along + span / per / 2, band * 0.3);
            c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = band * 0.08;
            c.beginPath(); c.moveTo(a0, b0); c.lineTo(a1, b1); c.stroke();
          }
        }
      }
      g.globalAlpha = 0.8; g.lineWidth = ink;
      g.strokeRect(cx - o, cy - o, o * 2, o * 2);
      // 모서리 사슬 구멍
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k * Math.PI) / 2, r = d * Math.SQRT2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        // 사슬 구멍: 작은 어두운 틈 (테두리 선 없이 → 나사못처럼 보이지 않게)
        c.fillStyle = gap; c.beginPath(); c.ellipse(x, y, band * 0.13, band * 0.09, a, 0, 7); c.fill();
      }
      g.globalAlpha = 1;
    };
    // 원형 라운드: 반지름 r 의 고리, 기둥이 바깥으로 뻗는다
    const circleRound = (r, band, color, count) => {
      c.fillStyle = color;
      c.beginPath(); c.arc(cx, cy, r + band / 2, 0, 7); c.arc(cx, cy, r - band / 2, 0, 7, true); c.fill();
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + wob() * 0.01;
        const p = (rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
        g.lineWidth = k % 3 === 0 ? ink : ink * 0.6; g.globalAlpha = k % 3 === 0 ? 0.9 : 0.55;
        g.beginPath(); g.moveTo(...p(r - band * 0.45)); g.lineTo(...p(r + band * 0.45)); g.stroke();
        const b = a + Math.PI / count;
        c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = band * 0.08;
        c.beginPath(); c.moveTo(cx + Math.cos(b) * (r - band * 0.3), cy + Math.sin(b) * (r - band * 0.3));
        c.lineTo(cx + Math.cos(b) * (r + band * 0.3), cy + Math.sin(b) * (r + band * 0.3)); c.stroke();
      }
      g.globalAlpha = 0.8; g.lineWidth = ink;
      g.beginPath(); g.arc(cx, cy, r + band / 2, 0, 7); g.stroke();
      g.globalAlpha = 1;
    };
    const center = (r, color) => blob(c, g, cx, cy, r, r, 0, color, ink);

    // 바깥(이어 붙이는 테두리)부터 채운다
    c.fillStyle = t.base; c.fillRect(0, 0, n, n);
    if (motif === 'rounds') {
      squareRound(W * 0.84, W * 0.26, t.base, 3);
      squareRound(W * 0.58, W * 0.26, t.light, 2);
      squareRound(W * 0.32, W * 0.26, t.accent, 1);
      center(W * 0.18, t.dark);
    } else if (motif === 'flower') {
      squareRound(W * 0.84, W * 0.26, t.base, 3);
      squareRound(W * 0.58, W * 0.26, t.light, 2);
      c.fillStyle = t.dark; c.beginPath(); c.arc(cx, cy, W * 0.44, 0, 7); c.fill(); // 꽃 뒤 바탕
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        blob(c, g, cx + Math.cos(a) * W * 0.26, cy + Math.sin(a) * W * 0.26, W * 0.1, W * 0.18, a + Math.PI / 2, t.accent, ink);
        g.lineWidth = ink * 0.6; g.globalAlpha = 0.7; g.beginPath();
        g.moveTo(cx + Math.cos(a) * W * 0.14, cy + Math.sin(a) * W * 0.14);
        g.lineTo(cx + Math.cos(a) * W * 0.36, cy + Math.sin(a) * W * 0.36); g.stroke(); g.globalAlpha = 1;
      }
      center(W * 0.12, t.light);
    } else if (motif === 'bobble') {
      squareRound(W * 0.84, W * 0.26, t.base, 3);
      squareRound(W * 0.58, W * 0.26, t.light, 2);
      circleRound(W * 0.3, W * 0.26, t.dark, 12);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.2;
        blob(c, g, cx + Math.cos(a) * W * 0.3, cy + Math.sin(a) * W * 0.3, W * 0.085, W * 0.085, 0, t.accent, ink);
      }
      center(W * 0.13, t.light);
    } else {
      squareRound(W * 0.86, W * 0.22, t.base, 3);
      circleRound(W * 0.62, W * 0.26, t.light, 24);
      circleRound(W * 0.38, W * 0.22, t.dark, 16);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        blob(c, g, cx + Math.cos(a) * W * 0.17, cy + Math.sin(a) * W * 0.17, W * 0.035, W * 0.1, a + Math.PI / 2, k % 2 ? t.light : t.accent, ink);
      }
      center(W * 0.08, t.accent);
    }
    // 이어 붙인 땀: 네 변에 짧은 사선 땀
    g.lineWidth = ink; g.globalAlpha = 0.9;
    for (let k = 0; k < 4; k++) {
      for (let i = 0.5; i < 12; i++) {
        const u = (i / 12) * n, e = n * 0.012;
        const pts = [[u, 0], [n, u], [u, n], [0, u]][k];
        g.beginPath(); g.moveTo(pts[0] - e, pts[1] - e); g.lineTo(pts[0] + e, pts[1] + e); g.stroke();
      }
    }
    g.globalAlpha = 1;
  }
}

/** 단 (말린 끝): 세로 골이 진 고무뜨기 */
export function ribTex(renderer, t) {
  return make(256, (c, g, m, n) => {
    c.fillStyle = t.dark; c.fillRect(0, 0, n, n);
    const k = 8, w = n / k;
    for (let i = 0; i < k; i++) {
      c.fillStyle = i % 2 ? t.base : t.light;
      c.fillRect(i * w + w * 0.1, 0, w * 0.8, n);
      g.lineWidth = n * 0.012; g.globalAlpha = 0.7;
      g.beginPath(); g.moveTo(i * w + w * 0.1, 0); g.lineTo(i * w + w * 0.1, n); g.stroke();
    }
    g.globalAlpha = 1;
  }, renderer).map;
}

/** 꽃잎 한 장: 테두리와 가운데 결 */
export function petalTex(renderer, color) {
  return make(256, (c, g, m, n) => {
    c.fillStyle = color; c.fillRect(0, 0, n, n);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath(); c.ellipse(n / 2, n * 0.45, n * 0.2, n * 0.3, 0, 0, 7); c.fill();
    g.lineWidth = n * 0.03;
    for (const x of [0.35, 0.5, 0.65]) { g.beginPath(); g.moveTo(n * x, n * 0.9); g.quadraticCurveTo(n * 0.5, n * 0.5, n * 0.5, n * 0.15); g.stroke(); }
  }, renderer).map;
}

/** 물레 둘레의 실 고리: 둘레(u)를 따라 실 색이 칸 없이 이어지고, 감긴 실 결을 잉크로 */
export function ringTex(renderer) {
  return make(1024, (c, g, m, n) => {
    for (let x = 0; x < n; x += 2) {
      c.fillStyle = yarnTones((x / n) * 360).base;
      c.fillRect(x, 0, 2, n);
    }
    // 감긴 실: 둘레 방향으로 촘촘한 비스듬한 가닥
    const k = 260, w = n / k;
    for (let i = 0; i < k; i++) {
      const x = i * w;
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = w * 0.35;
      c.beginPath(); c.moveTo(x + w * 0.3, 0); c.lineTo(x + w * 0.3 + w * 1.2, n); c.stroke();
      g.globalAlpha = 0.5; g.lineWidth = w * 0.16;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w * 1.2, n); g.stroke();
    }
    g.globalAlpha = 1;
  }, renderer).map;
}

/** 캔버스에 그린 그림을 툰 재질용 텍스처로 (rgb 색, a 잉크) */
export function drawTex(renderer, n, draw) {
  return make(n, (c, g, m, n) => draw(c, g, n), renderer).map;
}
