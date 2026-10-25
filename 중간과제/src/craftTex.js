// 뜨개와 바느질 텍스처. 전부 rgb = 색면, a = 잉크 선.
import { makeRandom } from './random.js';
import { dataTexture } from './bark.js';

// 색 캔버스(c)와 잉크 캔버스(g)에 그린 뒤 하나의 텍스처로 합친다
function make(n, renderer, draw, h = n) {
  const col = document.createElement('canvas');
  const ink = document.createElement('canvas');
  col.width = ink.width = n;
  col.height = ink.height = h;
  const c = col.getContext('2d'), g = ink.getContext('2d');
  c.lineCap = g.lineCap = 'round';
  c.lineJoin = g.lineJoin = 'round';
  g.strokeStyle = g.fillStyle = '#000';
  draw(c, g, n, h);
  const ci = c.getImageData(0, 0, n, h), gi = g.getImageData(0, 0, n, h);
  for (let i = 0; i < n * h; i++) ci.data[i * 4 + 3] = gi.data[i * 4 + 3];
  return dataTexture(ci.data, n, renderer, h);
}

// 가장자리를 넘는 그림은 반대편에도 → 이음매 없음
function wrap(n, h, fn) {
  for (const ox of [-n, 0, n]) for (const oy of [-h, 0, h]) fn(ox, oy);
}

/**
 * 메리야스 뜨개: V자 코가 세로로 줄지어 있다.
 * cols, rows = 한 장 안의 코 수. stripes = 줄마다 색 (반복)
 */
export function knitTex(renderer, { cols = 8, rows = 10, stripes = ['#ffffff'], seed = 1 } = {}) {
  const rand = makeRandom(seed);
  return make(512, renderer, (c, g, n, h) => {
    const cw = n / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const color = stripes[r % stripes.length];
      c.fillStyle = color;
      c.fillRect(0, r * rh, n, rh + 1);
      for (let k = 0; k < cols; k++) {
        const x = k * cw + cw / 2, y = r * rh;
        const j = () => (rand() - 0.5) * cw * 0.06; // 손뜨개의 삐뚤함
        // 코 한 개 = 아래에서 만나는 비스듬한 다리 두 개 (V)
        for (const side of [-1, 1]) {
          // 아래(코를 시작한 쪽)로 뾰족한 V: 위에서 벌어지고 아래에서 만난다
          const x0 = x + side * cw * 0.4 + j(), y0 = y + rh * 0.98 + j();
          const x1 = x + side * cw * 0.04, y1 = y + rh * 0.05;
          // 다리 가운데를 밝게 → 실이 볼록하다
          c.strokeStyle = 'rgba(255,255,255,0.28)';
          c.lineWidth = cw * 0.16;
          seg(c, x0 - side * cw * 0.08, y0 - rh * 0.15, x1 + side * cw * 0.06, y1 + rh * 0.15);
          // 잉크: 다리의 바깥쪽 한 줄만 (빽빽하지 않게)
          g.lineWidth = cw * (0.028 + rand() * 0.012);
          g.globalAlpha = 0.55 + rand() * 0.3;
          g.beginPath();
          g.moveTo(x0 + side * cw * 0.06, y0);
          g.quadraticCurveTo(x + side * cw * 0.3, y + rh * 0.45, x1 + side * cw * 0.02, y1);
          g.stroke();
        }
      }
    }
    g.globalAlpha = 1;
  });
}

/** 바닥: 색면 위에 홈질 점선, 십자수 X, 꿰맨 자국을 흩뿌린다 */
export function groundTex(renderer, { base, thread, seed = 3, density = 1 }) {
  const rand = makeRandom(seed);
  return make(1024, renderer, (c, g, n, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, n, h);
    // 아주 옅은 색연필 얼룩
    for (let i = 0; i < 40; i++) {
      const x = rand() * n, y = rand() * h, r = n * (0.04 + rand() * 0.1);
      c.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(120,110,170,0.05)';
      wrap(n, h, (ox, oy) => { c.beginPath(); c.ellipse(x + ox, y + oy, r, r * 0.5, 0, 0, 7); c.fill(); });
    }
    // 홈질 점선: 부드러운 곡선을 따라 짧은 땀
    for (let i = 0; i < 9 * density; i++) {
      let x = rand() * n, y = rand() * h, a = rand() * Math.PI * 2;
      const steps = 8 + Math.floor(rand() * 14), st = n * 0.018;
      const tc = thread[Math.floor(rand() * thread.length)];
      for (let s = 0; s < steps; s++) {
        a += (rand() - 0.5) * 0.35;
        const nx = x + Math.cos(a) * st, ny = y + Math.sin(a) * st;
        const mx = x + (nx - x) * 0.62, my = y + (ny - y) * 0.62;
        wrap(n, h, (ox, oy) => {
          c.strokeStyle = tc; c.lineWidth = n * 0.006; seg(c, x + ox, y + oy, mx + ox, my + oy);
          g.globalAlpha = 0.55; g.lineWidth = n * 0.0016; seg(g, x + ox, y + oy, mx + ox, my + oy);
        });
        x = nx; y = ny;
      }
    }
    // 십자수 X: 두세 개씩 모여 있다
    for (let i = 0; i < 14 * density; i++) {
      const cx = rand() * n, cy = rand() * h, m = 1 + Math.floor(rand() * 3);
      const tc = thread[Math.floor(rand() * thread.length)];
      for (let k = 0; k < m; k++) {
        const x = cx + k * n * 0.014, y = cy + (rand() - 0.5) * n * 0.004, s = n * 0.0055;
        wrap(n, h, (ox, oy) => {
          c.strokeStyle = tc; c.lineWidth = n * 0.004;
          seg(c, x - s + ox, y - s + oy, x + s + ox, y + s + oy);
          seg(c, x + s + ox, y - s + oy, x - s + ox, y + s + oy);
          g.globalAlpha = 0.6; g.lineWidth = n * 0.0013;
          seg(g, x - s + ox, y - s + oy, x + s + ox, y + s + oy);
          seg(g, x + s + ox, y - s + oy, x - s + ox, y + s + oy);
        });
      }
    }
    // 꿰맨 자국: 선 하나에 가로 땀
    for (let i = 0; i < 4 * density; i++) {
      const x = rand() * n, y = rand() * h, a = rand() * Math.PI, l = n * (0.05 + rand() * 0.06);
      const dx = Math.cos(a), dy = Math.sin(a);
      wrap(n, h, (ox, oy) => {
        g.globalAlpha = 0.5; g.lineWidth = n * 0.0014;
        seg(g, x + ox, y + oy, x + dx * l + ox, y + dy * l + oy);
        for (let t = 0.1; t < 1; t += 0.16) {
          const px = x + dx * l * t + ox, py = y + dy * l * t + oy, s = n * 0.006;
          seg(g, px - dy * s, py + dx * s, px + dy * s, py - dx * s);
        }
      });
    }
    g.globalAlpha = 1;
  });
}

/** 꼬인 실 (덩굴, 실패에 감긴 실): 비스듬한 꼬임 선 */
export function yarnTex(renderer, { color, seed = 5, twist = 6 }) {
  const rand = makeRandom(seed);
  return make(256, renderer, (c, g, n, h) => {
    c.fillStyle = color;
    c.fillRect(0, 0, n, h);
    // u = 둘레, v = 길이. 꼬임 한 번 = 대각선 하나
    for (let i = 0; i < twist; i++) {
      const y = (i / twist) * h;
      wrap(n, h, (ox, oy) => {
        c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = h / twist * 0.35;
        seg(c, ox, y + oy + h / twist * 0.3, n + ox, y + oy + h * 0.5 + h / twist * 0.3);
        g.globalAlpha = 0.7 + rand() * 0.3; g.lineWidth = n * 0.02;
        seg(g, ox, y + oy, n + ox, y + oy + h * 0.5);
      });
    }
    g.globalAlpha = 1;
  });
}

/** 털실 방울: 짧은 곱슬 터치를 흩뿌린다 */
export function fuzzTex(renderer, { color, seed = 7 }) {
  const rand = makeRandom(seed);
  return make(256, renderer, (c, g, n, h) => {
    c.fillStyle = color;
    c.fillRect(0, 0, n, h);
    // 짧은 털 결: 방향이 제각각인 짧은 획 (곡선은 얼굴처럼 보여서 쓰지 않는다)
    for (let i = 0; i < 110; i++) {
      const x = rand() * n, y = rand() * h, l = n * (0.012 + rand() * 0.016), a = rand() * 6.28;
      const al = 0.35 + rand() * 0.4;
      wrap(n, h, (ox, oy) => {
        g.globalAlpha = al; g.lineWidth = n * 0.005;
        seg(g, x + ox, y + oy, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
      });
    }
    g.globalAlpha = 1;
  });
}

/** 단추 윗면: 테두리 홈 + 구멍 4개 + 실 X */
export function buttonTex(renderer, { color, thread, seed = 9 }) {
  return make(256, renderer, (c, g, n) => {
    const m = n / 2;
    c.fillStyle = color; c.fillRect(0, 0, n, n);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.arc(m, m, n * 0.3, 0, 7); c.fill();
    g.lineWidth = n * 0.014; g.globalAlpha = 0.85;
    g.beginPath(); g.arc(m, m, n * 0.36, 0, 7); g.stroke();
    const o = n * 0.09;
    c.strokeStyle = thread; c.lineWidth = n * 0.045;
    seg(c, m - o, m - o, m + o, m + o); seg(c, m + o, m - o, m - o, m + o);
    g.lineWidth = n * 0.01;
    for (const [x, y] of [[-o, -o], [o, -o], [-o, o], [o, o]]) {
      g.beginPath(); g.arc(m + x, m + y, n * 0.035, 0, 7); g.stroke();
    }
    seg(g, m - o * 0.6, m - o * 0.6, m + o * 0.6, m + o * 0.6);
    seg(g, m + o * 0.6, m - o * 0.6, m - o * 0.6, m + o * 0.6);
    g.globalAlpha = 1;
  });
}

/** 줄무늬 (실패의 감긴 실처럼 가로줄) */
export function wrapTex(renderer, { color, lines = 18, seed = 11 }) {
  const rand = makeRandom(seed);
  return make(256, renderer, (c, g, n, h) => {
    c.fillStyle = color; c.fillRect(0, 0, n, h);
    for (let i = 0; i < lines; i++) {
      const y = (i + 0.5) / lines * h + (rand() - 0.5) * 2;
      g.globalAlpha = 0.35 + rand() * 0.35; g.lineWidth = 1.2 + rand();
      seg(g, 0, y, n, y + (rand() - 0.5) * 3);
    }
    g.globalAlpha = 1;
  });
}

function seg(ctx, x0, y0, x1, y1) {
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
