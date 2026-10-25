// 나무 뼈대: 가지마다 3D 곡선 + 꼬이지 않는 프레임 + 굵기 + 꼬인 표면
// branch.at(t)         → 가지 위 위치 t(0=시작, 1=끝)의 위치, 접선, 법선, 굵기
// branch.surface(t, a) → 둘레 각도 a에서의 실제 표면 반지름 (골, 옹이, 뿌리 포함)
import * as THREE from 'three';
import { makeRandom } from './random.js';

const UP = new THREE.Vector3(0, 1, 0);
const AN = 64; // 굵기 표 칸 수

export class Branch {
  constructor(pts, opt) {
    this.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    this.len = this.curve.getLength();
    this.r0 = opt.r0; // 시작 굵기 (처음엔 추정값, finish 뒤엔 실제값)
    this.r1 = opt.r1;
    this.level = opt.level; // 0 줄기, 1 이상 가지
    this.parent = opt.parent || null;
    this.tp = opt.tp || 0; // 부모의 어디서 나왔나
    this.sin = opt.sin || 1; // 부모와 벌어진 각의 sin (표면을 뚫고 나오는 위치 계산용)
    this.exit = 0; // 부모 표면을 뚫고 나오는 위치 (길이)
    this.flare = opt.flare || 0; // 가지 깃
    this.base = opt.base || 0; // 줄기 밑동 퍼짐
    this.cap = opt.cap ?? 0.8; // 끝 마개 길이 (굵기 배율)
    this.relief = opt.relief || null; // 표면 꼬임 값
    this.s0 = 0; // 부모에게서 이어받은 길이 (골, 결이 끊기지 않게)
    this.a0 = 0; // 부모 둘레 각도와의 차이
    this.kids = [];
    this.area = null; // 단면적 표 (finish에서 채운다)
    this.makeFrames();
  }

  // parallel transport: 앞 프레임을 접선이 바뀐 만큼만 돌려서 다음 프레임을 만든다 → 꼬이지 않는다
  makeFrames() {
    const n = Math.max(24, Math.ceil(this.len * 48));
    this.n = n;
    this.P = []; this.T = []; this.N = []; this.B = [];
    for (let i = 0; i <= n; i++) {
      this.P.push(this.curve.getPointAt(i / n));
      this.T.push(this.curve.getTangentAt(i / n).normalize());
    }
    const t0 = this.T[0];
    const ref = Math.abs(t0.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0);
    let nrm = ref.clone().cross(t0).normalize();
    const q = new THREE.Quaternion();
    for (let i = 0; i <= n; i++) {
      if (i > 0) {
        q.setFromUnitVectors(this.T[i - 1], this.T[i]);
        nrm = nrm.clone().applyQuaternion(q);
        nrm.addScaledVector(this.T[i], -nrm.dot(this.T[i])).normalize(); // 오차 정리
      }
      this.N.push(nrm);
      this.B.push(this.T[i].clone().cross(nrm).normalize());
    }
  }

  // 축 굵기 (골, 옹이를 빼고 평균낸 굵기)
  radius(t) {
    t = Math.min(Math.max(t, 0), 1);
    let r;
    if (this.area) {
      const f = t * AN, i = Math.min(Math.floor(f), AN - 1), k = f - i;
      r = Math.sqrt((this.area[i] * (1 - k) + this.area[i + 1] * k) / Math.PI);
    } else {
      r = this.r1 + (this.r0 - this.r1) * (1 - t);
    }
    const s = t * this.len;
    // 줄기 밑동: 땅에 닿는 곳이 넓게 퍼진다
    if (this.base) r *= 1 + this.base * Math.exp(-Math.max(0, s - 0.25) / (this.r0 * 1.3));
    // 가지 깃: 부모에서 나오는 곳이 살짝 넓다
    if (this.flare) r *= 1 + this.flare * Math.exp(-Math.max(0, s - this.exit) / (this.r0 * 1.5));
    return r;
  }

  // 실제 표면 반지름: 나선으로 감기는 골과 마루, 옹이, 뿌리
  surface(t, a, r = this.radius(t)) {
    const v = this.relief;
    if (!v) return r;
    const s0 = t * this.len;
    const s = s0 + this.s0;
    a += this.a0;
    // 굵을수록 골이 깊고, 이음매 근처에선 부모와 매끈하게 이어지도록 줄인다
    let k = v.amp * smooth(v.rMin, v.rMax, r);
    if (this.parent && !v.keep) k *= 1 - Math.exp(-Math.max(0, s0 - this.exit) / (this.r0 * 2));
    let d = k * (
      Math.sin(3 * a + v.twist * s + v.ph[0]) * 0.6 +
      Math.sin(2 * a + v.twist * 0.9 * s + v.ph[2]) * 0.25 +
      Math.sin(7 * a + v.twist * 1.15 * s + v.ph[1]) * 0.3 +
      Math.sin(15 * a + v.twist * 1.3 * s + v.ph[2]) * 0.12 +
      Math.sin(5 * a - v.twist * 0.4 * s + v.ph[3]) * 0.18
    );
    // 옹이와 혹
    for (const o of v.knots) {
      const ds = (s - o.s) / o.w;
      let da = a - o.a;
      da = Math.atan2(Math.sin(da), Math.cos(da)) * r / o.w;
      d += o.h * Math.exp(-(ds * ds + da * da));
    }
    // 뿌리 (줄기만): 밑동에서 갈래로 퍼지고, 줄기 결을 따라 살짝 감긴다
    if (v.roots) {
      const e = Math.exp(-Math.max(0, s - 0.12) / v.rootH);
      const lobe = Math.pow(0.5 + 0.5 * Math.cos(v.rootN * a + v.rootPh + v.twist * 0.6 * s), 2.5);
      d += v.roots * e * (lobe - 0.25);
    }
    return r * (1 + d);
  }

  // 위치 t의 정보. out 객체를 넘기면 재사용한다.
  at(t, out = {}) {
    const f = Math.min(Math.max(t, 0), 1) * this.n;
    const i = Math.min(Math.floor(f), this.n - 1);
    const k = f - i;
    out.pos = (out.pos || new THREE.Vector3()).lerpVectors(this.P[i], this.P[i + 1], k);
    out.tan = (out.tan || new THREE.Vector3()).lerpVectors(this.T[i], this.T[i + 1], k).normalize();
    out.nrm = (out.nrm || new THREE.Vector3()).lerpVectors(this.N[i], this.N[i + 1], k);
    out.nrm.addScaledVector(out.tan, -out.nrm.dot(out.tan)).normalize();
    out.bin = (out.bin || new THREE.Vector3()).crossVectors(out.tan, out.nrm);
    out.r = this.radius(t);
    return out;
  }
}

function smooth(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

// 스타일 값으로 나무 하나를 만든다
export function growTree(style, seed) {
  const rand = makeRandom(seed);
  const rr = (a, b) => a + (b - a) * rand();
  const H = style.height;
  const out = [];

  // 표면 꼬임 값 (가지마다 위상이 다르다)
  const relief = (extra = {}) => ({
    amp: style.relief, twist: style.twist * (rand() < 0.8 ? 1 : -1) * rr(0.8, 1.2),
    rMin: 0.02, rMax: 0.22,
    ph: [rr(0, 6.28), rr(0, 6.28), rr(0, 6.28), rr(0, 6.28)],
    knots: [], ...extra,
  });
  const addKnots = (b) => {
    const n = Math.round(b.len * style.knots * rr(0.5, 1.5));
    for (let i = 0; i < n; i++) {
      b.relief.knots.push({ s: rr(0.1, 0.9) * b.len, a: rr(0, 6.28), w: rr(0.05, 0.14), h: rr(0.06, 0.18) });
    }
  };

  // 줄기: S자로 굽고, 나선을 그리며 꼬여 오른다
  const pts = [new THREE.Vector3(0, -0.25, 0)]; // 땅속에서 시작 (잘린 단면이 안 보이게)
  const ph1 = rr(0, 6.28), ph2 = rr(0, 6.28), ph3 = rr(0, 6.28);
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const amp = style.bend * H * Math.pow(u, 0.9);
    const hx = style.helix * H * u * Math.cos(u * Math.PI * 2 * style.helixTurns + ph3);
    const hz = style.helix * H * u * Math.sin(u * Math.PI * 2 * style.helixTurns + ph3);
    pts.push(new THREE.Vector3(
      amp * (Math.sin(Math.PI * style.bendFreq * u + ph1) - Math.sin(ph1)) * 0.8 + style.lean * H * u * u + hx,
      H * u * (1 - style.squat * u * 0.3),
      amp * (Math.sin(Math.PI * style.bendFreq * 0.8 * u + ph2) - Math.sin(ph2)) * 0.6 + hz
    ));
  }
  const fork = style.fork;
  const trunk = new Branch(pts, {
    r0: style.trunkR, r1: style.trunkR * (fork ? fork.r : 0.12), level: 0,
    base: style.base, cap: fork ? 0.15 : 0.8,
    relief: relief({ amp: style.relief * style.trunkRelief, roots: style.roots, rootN: style.rootN, rootH: style.rootH, rootPh: rr(0, 6.28) }),
  });
  addKnots(trunk);
  out.push(trunk);
  const az0 = rr(0, 6.28);

  if (!fork) {
    addMains(trunk, 1, H, az0);
  } else {
    // 갈라진 굵은 줄기들 (서로 반대쪽으로 벌어진다)
    for (let k = 0; k < fork.count; k++) {
      // 정확히 반대쪽이 아니라 조금 비껴서 벌어진다 → 옆에서 봐도 납작한 V자가 아니다
      const az = az0 + (k / fork.count) * Math.PI * 2 * fork.spread + rr(-0.35, 0.35);
      const elev = rr(fork.elev[0], fork.elev[1]) * (Math.PI / 180);
      const dir = new THREE.Vector3(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev));
      const len = H * rr(fork.len[0], fork.len[1]);
      const lead = sprout(trunk, fork.at, dir, len, rr(fork.ratio[0], fork.ratio[1]), 1, fork.curl, fork.along);
      out.push(lead);
      addMains(lead, 2, len * 1.6, az);
    }
  }
  const kept = prune(out, style.prune, seed);
  finish(kept, style);
  return kept;

  // 부모(줄기 또는 갈라진 줄기)에 큰 가지를 단다
  function addMains(parent, level, size, azBase) {
    const count = Math.round(rr(style.mainCount[0], style.mainCount[1] + 0.99) - 0.5);
    for (let k = 0; k < count; k++) {
      const t = style.mainStart + (style.mainEnd - style.mainStart) * ((k + rr(0.1, 0.7)) / count);
      // 황금각으로 돌려가며 → 고르게 퍼진다. 갈라진 줄기에선 바깥쪽을 더 많이 향한다.
      let az = azBase + k * 2.39996 + rr(-0.3, 0.3);
      if (level > 1) az = azBase + Math.sin(k * 2.39996) * 1.3 + rr(-0.3, 0.3);
      const elev = rr(style.mainElev[0], style.mainElev[1]) * (Math.PI / 180);
      const len = size * rr(style.mainLen[0], style.mainLen[1]) * (1 - t * style.lenFall);
      const dir = new THREE.Vector3(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev));
      const b = sprout(parent, t, dir, len, rr(style.mainRatio[0], style.mainRatio[1]), level);
      out.push(b);
      branchOut(b, level + 1, style.subDepth);
    }
  }

  // 가지에 더 작은 가지를 단다 (depth 만큼 반복)
  function branchOut(b, level, depth) {
    if (depth <= 0) return;
    const first = depth === style.subDepth;
    const range = first ? style.subCount : style.sub2Count;
    const subs = Math.round(rr(range[0], range[1]));
    let spin = rr(0, 6.28);
    for (let j = 0; j < subs; j++) {
      const ts = 0.22 + 0.66 * ((j + rr(0.1, 0.9)) / subs);
      const f = b.at(ts);
      spin += 2.39996 + rr(-0.4, 0.4); // 어긋나게 돌아가며 난다
      const side = f.nrm.clone().multiplyScalar(Math.cos(spin)).addScaledVector(f.bin, Math.sin(spin));
      side.y = side.y * 0.5 + style.subRise;
      const ang = rr(0.45, 0.95);
      const d = f.tan.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side.normalize(), Math.sin(ang));
      const lr = first ? style.subLen : style.sub2Len;
      const sl = b.len * rr(lr[0], lr[1]) * (1 - ts * 0.55);
      if (sl < 0.06) continue;
      const c = sprout(b, ts, d, sl, rr(0.45, 0.65), level);
      c.twig = style.subDepth - depth + 1; // 1 = 큰 가지의 잔가지, 2 = 잔가지의 잔가지
      out.push(c);
      branchOut(c, level + 1, depth - 1);
    }
  }

  // 부모 가지의 t 위치에서 dir 방향으로 새 가지를 낸다
  function sprout(parent, t, dir, len, ratio, level, curlK = 1, along = 0.55) {
    const f = parent.at(t);
    dir = dir.clone().normalize();

    // 부모 속(중심)에서 시작해서, 처음엔 부모 결을 따라 흐르다가 바깥으로 벌어진다
    const pts = [f.pos.clone()];
    const exitDir = f.tan.clone().multiplyScalar(along).add(dir).normalize();
    pts.push(f.pos.clone().addScaledVector(exitDir, f.r * 0.9));

    const steps = Math.max(5, Math.min(14, Math.round(len * 9)));
    const step = len / steps;
    const d = dir.clone();
    const p = pts[1].clone();
    const v = new THREE.Vector3(); // 방향이 바뀌는 속도 (관성 있는 랜덤 → 불규칙하지만 부드럽게)
    const a1 = new THREE.Vector3(), a2 = new THREE.Vector3();
    const ph = rand() * 6.28, fq = 0.8 + rand() * 1.2, curl = style.curl * curlK * rr(0.7, 1.3);
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      v.multiplyScalar(0.6).add(new THREE.Vector3(rand() - 0.5, (rand() - 0.5) * 0.7, rand() - 0.5).multiplyScalar(style.wander));
      d.add(v);
      // 굵은 쪽은 오르고, 가운데는 무게로 처지고, 끝은 빛 쪽으로 들린다
      const flat = 1 - Math.abs(d.y);
      d.y += style.rise * (1 - u) * 0.25 - style.droop * flat * Math.sin(u * Math.PI) * 0.3 + style.tipUp * u * u * 0.3;
      // 큰 굽이 (갈라진 줄기의 S자)
      a1.crossVectors(d, UP);
      if (a1.lengthSq() < 1e-4) a1.set(1, 0, 0);
      a1.normalize();
      a2.crossVectors(d, a1).normalize();
      const w = Math.PI * 2 * fq * u + ph;
      d.addScaledVector(a1, (Math.sin(w) * curl * 2) / steps).addScaledVector(a2, (Math.cos(w * 0.7) * curl) / steps).normalize();
      p.addScaledVector(d, step);
      pts.push(p.clone());
    }
    const b = new Branch(pts, {
      r0: f.r * ratio, r1: 0.01, level, parent, tp: t,
      sin: Math.sqrt(Math.max(0.05, 1 - Math.pow(exitDir.dot(f.tan), 2))),
      // 부모만큼 굵은 가지(갈라진 줄기)는 깃을 거의 넓히지 않는다
      flare: style.flare * Math.min(1, Math.max(0, (0.9 - ratio) / 0.4)),
      relief: relief(),
    });
    // 부모만큼 굵은 가지(갈라진 줄기)는 부모의 골과 결을 그대로 이어받는다 → 갈라지는 곳에 경계선이 없다
    if (ratio > 0.7) {
      b.relief = { ...parent.relief, roots: 0, knots: [], keep: true };
      b.s0 = parent.s0 + t * parent.len;
      const n0 = b.N[0];
      b.a0 = parent.a0 + Math.atan2(n0.dot(f.bin), n0.dot(f.nrm));
    }
    addKnots(b);
    parent.kids.push(b);
    return b;
  }
}

// 잔가지 덜어내기: 나무를 다 키운 뒤 고른다 → 줄기와 큰 가지 모양은 그대로
// p = { keep1, keep2, minLen } 잔가지 단계별로 남길 비율, 이보다 짧은 잔가지는 뺀다
function prune(list, p, seed) {
  if (!p) return list;
  const rand = makeRandom(seed + 991); // 따로 쓰는 난수 → 나무 모양에 영향 없음
  const drop = new Set();
  for (const b of list) {
    const r = rand();
    if (drop.has(b.parent)) { drop.add(b); continue; }
    if (!b.twig) continue;
    const keep = b.twig === 1 ? p.keep1 : p.keep2;
    if (r > keep || b.len < p.minLen) drop.add(b);
  }
  for (const b of list) b.kids = b.kids.filter((c) => !drop.has(c));
  return list.filter((b) => !drop.has(b));
}

// 단면적 보존(다빈치 규칙): 가지가 갈라지면 부모는 자식 몫만큼 가늘어진다.
// 끝에서부터 거꾸로 단면적을 더해 올라가서, 줄기 밑동이 trunkR이 되도록 맞춘다.
function finish(list, style) {
  const tipA = Math.PI * style.tipR * style.tipR;
  let total = 0;
  for (const b of list) total += b.len;
  const perLen = Math.max(0, (Math.PI * style.trunkR ** 2 - list.length * tipA) / total);

  // 자식이 항상 부모보다 뒤에 만들어졌으니 뒤에서부터 계산하면 된다
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.area = new Float32Array(AN + 1);
    for (let j = 0; j <= AN; j++) {
      const t = j / AN;
      let a = tipA + perLen * b.len * (1 - t);
      for (const c of b.kids) {
        // 갈라지는 곳 앞뒤로 부드럽게 줄어든다
        // 갈라진 '뒤에서부터' 서서히 가늘어진다 → 갈래 직전에 잘록한 목이 생기지 않는다
        const w = Math.max(0.02, (Math.sqrt(c.area[0] / Math.PI) * 2.5) / b.len);
        a += c.area[0] * (1 - smooth(c.tp, c.tp + w, t));
      }
      b.area[j] = a;
    }
  }
  // 실제 굵기로 깃, 뚫고 나오는 위치를 다시 정한다
  for (const b of list) {
    b.r0 = Math.sqrt(b.area[0] / Math.PI);
    if (b.parent) {
      const pr = b.parent.radius(b.tp);
      b.exit = Math.min(pr / b.sin, pr * 2.5);
    }
  }
}
