// 뜨개 조각: 가지(Branch) 위 구간 [t0, t1]을 감싸는 소매 + 장식
// 가지의 실제 표면(골, 옹이 포함)을 따라 감기고, 양 끝은 도톰하게 말린 단이다.
import * as THREE from 'three';
import { config } from './config.js';
import { toonMaterial, addSway } from './toon.js';
import { yarnTones, meshTex, stripeTex, grannyMosaic, ribTex, petalTex, drawTex } from './knit.js';
import { fuzzTex } from './craftTex.js';

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

/**
 * o.t0, o.t1  가지 위 구간
 * o.type      'mesh' 망사 / 'stripe' 줄무늬 / 'granny' 그래니 스퀘어
 * o.hue       실 색상 (0~360)
 * o.motif     그래니 무늬 ('rounds' | 'flower' | 'bobble' | 'burst')
 * o.deco      장식 ('flower' | 'pompom' | 'tassel' | null)
 * o.under     아래 나무 재질의 번호 (망사 구멍에 윤곽선을 긋지 않으려고)
 * o.state     장식의 날짜 모양 (due.js): bloom 피어난 정도, fallen 떨어진 꽃잎, len 태슬 길이, loose 풀린 가닥, sleep 잠든 퐁퐁
 */
export function makePiece(renderer, branch, o) {
  // 가는 가지에서는 두께와 단도 얇게 (같은 값이면 팔찌처럼 두꺼워 보인다)
  const meanR = branch.radius((o.t0 + o.t1) / 2);
  const sc = Math.min(Math.max(meanR / config.knit.fullR, 0.35), 1);
  const V = config.knit.looks[config.knit.look]; // 짜임 표현 안
  const K = { ...config.knit, ink: V.ink, thick: config.knit.thick * sc, hem: config.knit.hem * (0.45 + 0.55 * sc) };
  const tones = yarnTones(o.hue);
  const grp = new THREE.Group();
  const L = (o.t1 - o.t0) * branch.len;
  const hem = Math.min(K.hem, L * 0.15);
  K.hem = hem;

  // 짜임 텍스처
  const tex = knitMap(renderer, o.type, o.hue, o.motif);
  const cell = K.cell[o.type] * V.cellK;

  // 몸판 + 양쪽 단 (같은 단면 함수 → 이음매 없이 이어진다)
  const body = sleeve(branch, o.t0, o.t1, hem, L - hem, L, cell, K, 1, o.type === 'mesh' ? 5 : 2);
  // 망사도 바깥 면만 그린다 → 구멍 너머로 나무껍질이 보인다
  const bodyMat = toonMaterial({ map: tex.map, holes: tex.mask, cover: 1, ink: K.ink });
  const rib = cached('rib' + o.hue, () => ribTex(renderer, yarnTones(o.hue)));
  const ribMat = toonMaterial({ map: rib, cover: 1, ink: K.ink });
  ribMat.uniforms.uId.value = bodyMat.uniforms.uId.value; // 같은 조각 → 단과 몸판 사이에 경계선을 긋지 않는다
  // 망사는 구멍마다 윤곽선이 생기면 검은 그물처럼 보인다 → 아래 나무와 같은 번호를 쓴다
  if (o.type === 'mesh' && o.under !== undefined) bodyMat.uniforms.uId.value = o.under;
  // 짜이는 순서: 시작 단 → 몸판 → 끝 단 (grow에서 이 순서로 드러난다)
  const parts = [
    { mesh: mesh(sleeve(branch, o.t0, o.t1, 0, hem, L, K.ribCell * V.cellK, K, 0.5), ribMat), s0: 0, s1: hem },
    { mesh: mesh(body, bodyMat), s0: hem, s1: L - hem },
    { mesh: mesh(sleeve(branch, o.t0, o.t1, L - hem, L, L, K.ribCell * V.cellK, K, 0.5), ribMat), s0: L - hem, s1: L },
  ];
  for (const q of parts) grp.add(q.mesh);
  grp.userData = { L, parts, deco: null, mats: [bodyMat, ribMat] };

  // 장식: 정면(카메라 쪽)에서 잘 보이는 자리에 단다
  if (o.deco) {
    const tm = o.t0 + (o.t1 - o.t0) * (o.decoAt ?? 0.5);
    const f = branch.at(tm, {});
    const a = o.decoA ?? Math.atan2(f.bin.z, f.nrm.z); // 보이는 둘레 각도 (없으면 카메라 +z 쪽)
    const dir = f.nrm.clone().multiplyScalar(Math.cos(a)).addScaledVector(f.bin, Math.sin(a));
    const hang = o.deco === 'flower' ? 0 : config.knit.deco.tassel * 0.12; // 매달린 것은 표면에서 조금 띄운다
    const pos = f.pos.clone().addScaledVector(dir, branch.surface(tm, a, f.r) + K.thick * 1.4 + hang);
    const ph = (o.hue * 0.137) % 6.283; // 흔들림 위상 (조각마다 다르게, 시드처럼 고정)
    const st = o.state || {};
    const d = o.deco === 'flower' ? flower(renderer, tones, st) : o.deco === 'pompom' ? pompom(renderer, tones, ph, st) : tassel(renderer, tones, ph, st);
    d.position.copy(pos);
    d.userData.base = pos.clone(); // 통통 튀기, 흔들기의 기준
    d.userData.k = o.decoS ?? 1; // 매달 길이 모자란 자리는 조금 작게
    if (o.deco === 'flower') d.lookAt(pos.clone().add(dir));
    grp.add(d);
    grp.userData.deco = d;
  }
  grp.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  // 장식은 작아서 조각 그림자 속에 들면 어두운 덩어리가 된다 → 그림자는 드리우되 받지 않는다
  grp.userData.deco?.traverse((m) => { if (m.isMesh) m.receiveShadow = false; });
  return grp;
}

/**
 * 짜인 정도 p (0~1). 고리(둘레 한 바퀴) 순서대로 드러난다.
 * 다 짜이면 장식이 톡 튀어나온다 (pop 0~1).
 */
export function grow(piece, p, pop = p >= 1 ? 1 : 0) {
  const { L, parts, deco } = piece.userData;
  const now = p * L;
  for (const q of parts) {
    const g = q.mesh.geometry;
    const k = Math.min(Math.max((now - q.s0) / (q.s1 - q.s0), 0), 1);
    const quads = g.userData.rings * g.userData.rad;
    g.setDrawRange(0, Math.floor(k * quads) * 6);
    q.mesh.visible = k > 0;
  }
  if (deco) {
    // 살짝 넘쳤다 돌아오는 튀어나옴
    const s = pop <= 0 ? 0 : 1 + 0.35 * Math.sin(pop * Math.PI) * (1 - pop);
    deco.scale.setScalar(Math.max(1e-3, (deco.userData.k ?? 1) * s * Math.min(1, pop * 2.2)));
    deco.visible = pop > 0;
  }
}

// 짜임 텍스처 (같은 색, 같은 짜임은 한 번만 만든다)
function knitMap(renderer, type, hue, motif) {
  const tones = yarnTones(hue);
  return cached(type + hue + (motif || ''), () =>
    type === 'mesh' ? meshTex(renderer, tones) :
    type === 'stripe' ? stripeTex(renderer, tones) :
    grannyMosaic(renderer, hue, Math.round(hue) % 4));
}

/** 이 색의 세 짜임 텍스처를 미리 만들어 둔다 (누르는 도중 짜임이 바뀔 때 끊기지 않게) */
export function prewarm(renderer, hue) {
  for (const t of ['mesh', 'stripe', 'granny']) knitMap(renderer, t, hue);
  cached('rib' + hue, () => ribTex(renderer, yarnTones(hue)));
}

function mesh(g, m) {
  return new THREE.Mesh(g, m);
}

// 소매 한 토막: s0~s1 (조각 시작에서의 길이). 반지름 = 가지 표면 + 두께(단에서는 도톰하게 말린다)
function sleeve(branch, t0, t1, s0, s1, L, cell, K, ribK, minAround = 2) {
  const segs = Math.max(4, Math.ceil((s1 - s0) * 70));
  const rad = 64, row = rad + 1;
  const pos = new Float32Array((segs + 1) * row * 3);
  const uv = [];
  const f = {};
  const meanR = branch.radius((t0 + t1) / 2);
  const around = Math.max(minAround, Math.round((Math.PI * 2 * (meanR + K.thick)) / cell));
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const s = s0 + ((s1 - s0) * i) / segs;
    const t = t0 + (s / L) * (t1 - t0);
    branch.at(t, f);
    const e = Math.min(s, L - s); // 가까운 끝까지의 거리
    // 단: 끝에서 안으로 말려 들어가고, 조금 안쪽은 도톰하게 부푼다
    let th = 1;
    if (e < K.hem) th = 1 + K.roll * Math.sin((Math.PI * e) / K.hem);
    th *= 0.25 + 0.75 * smooth(0, K.hem * 0.22, e);
    for (let j = 0; j <= rad; j++) {
      const a = ((j % rad) / rad) * Math.PI * 2;
      n.copy(f.nrm).multiplyScalar(Math.cos(a)).addScaledVector(f.bin, Math.sin(a));
      v.copy(f.pos).addScaledVector(n, branch.surface(t, a, f.r) + K.thick * th);
      v.toArray(pos, (i * row + j) * 3);
      uv.push((j / rad) * around * ribK + 0.5 * (1 - ribK), s / cell);
    }
  }
  const idx = [];
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) {
    const a = i * row + j, c = a + row;
    idx.push(a, a + 1, c, c, a + 1, c + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.userData = { rings: segs, rad };
  g.computeVertexNormals();
  // 둘레 첫 정점과 마지막 정점의 법선을 평균 → 세로 줄 없음
  const nr = g.attributes.normal;
  for (let i = 0; i <= segs; i++) {
    const a = i * row, z = a + rad;
    v.fromBufferAttribute(nr, a).add(n.fromBufferAttribute(nr, z)).normalize();
    nr.setXYZ(a, v.x, v.y, v.z); nr.setXYZ(z, v.x, v.y, v.z);
  }
  return g;
}

function smooth(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

/** 크로셰 꽃: 둥근 꽃잎 6장 + 가운데 방울. 조각 표면에 납작하게 붙는다.
 * st.bloom 0 = 꽃잎을 오므린 봉오리, 1 = 활짝. st.fallen = 떨어진 꽃잎 수 (D-day가 지남) */
function flower(renderer, t, st = {}) {
  const g = new THREE.Group();
  const D = config.knit.deco;
  const mat = toonMaterial({ map: cached('petal' + t.accent, () => petalTex(renderer, t.accent)), side: THREE.DoubleSide });
  const bloom = st.bloom ?? 1, gone = st.fallen ? [1, 4].slice(0, st.fallen) : [];
  for (let k = 0; k < 6; k++) {
    if (gone.includes(k)) continue;
    const a = (k / 6) * Math.PI * 2;
    const p = new THREE.CircleGeometry(D.flower * 0.5, 18);
    p.scale(0.62, 1, 1);
    p.scale(0.74 + 0.26 * bloom, 0.74 + 0.26 * bloom, 1); // 봉오리는 조금 작게 (너무 작으면 매듭처럼 보인다)
    p.translate(0, D.flower * 0.55 * (0.62 + 0.38 * bloom), 0);
    p.rotateX(0.18 + (1 - bloom) * 0.95); // 오므릴수록 앞으로 접힌다 (봉오리). 너무 접으면 옆면만 보여 사라진다
    p.rotateZ(a);
    p.translate(0, 0, k * 0.0015);
    g.add(new THREE.Mesh(p, mat));
  }
  const c = new THREE.Mesh(new THREE.SphereGeometry(D.flower * 0.28, 20, 14), toonMaterial({ color: t.light, cover: 1 }));
  c.scale.set(0.75 + 0.25 * bloom, 0.75 + 0.25 * bloom, 0.6);
  c.position.z = D.flower * 0.08;
  g.add(c);
  return g;
}

/** 퐁퐁: 짧은 끈 끝에 매달린 털실 방울. 바람에 흔들린다.
 * st.sleep: 알릴 때까지 작게 웅크려 잔다 (끈도 짧게) */
function pompom(renderer, t, ph, st = {}) {
  const g = new THREE.Group();
  const D = { ...config.knit.deco };
  if (st.sleep) { D.pompom *= config.due.sleepSize; D.cord *= 0.6; }
  const len = D.cord;
  const cord = new THREE.CylinderGeometry(0.006, 0.006, len, 6);
  cord.translate(0, -len / 2, 0);
  addSway(cord, (p) => -p.y / (len + D.pompom), ph);
  g.add(new THREE.Mesh(cord, toonMaterial({ color: t.dark, sway: 1 })));
  const ball = new THREE.SphereGeometry(D.pompom, 32, 24);
  // 털실 방울: 겉이 몽글몽글 (윤곽이 매끈한 공이 아니게)
  const bp = ball.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < bp.count; i++) {
    v.fromBufferAttribute(bp, i).normalize();
    const k = 1 + 0.07 * Math.sin(v.x * 11 + ph) * Math.sin(v.y * 9) * Math.sin(v.z * 10 + 1) + 0.04 * Math.sin(v.x * 23 + v.y * 19 + v.z * 21);
    v.multiplyScalar(D.pompom * k);
    bp.setXYZ(i, v.x, v.y, v.z);
  }
  ball.computeVertexNormals();
  ball.translate(0, -len - D.pompom * 0.8, 0);
  addSway(ball, () => 1, ph); // 공 전체가 같은 세기로 → 찌그러지지 않는다
  const map = cached('pfuzz' + t.accent, () => fuzzTex(renderer, { color: t.accent, seed: 3 }));
  g.add(new THREE.Mesh(ball, toonMaterial({ map, sway: 1, cover: 1 })));
  return g;
}

/** 태슬: 통통한 실 다발 + 위를 감은 띠 + 아래로 갈라진 술. 끝이 바람에 흔들린다.
 * st.len: 마감까지 남은 시간 = 술 길이 (굵기는 그대로). st.loose: 마감이 지나 끝에서 실 한 가닥이 풀려 늘어진다 */
function tassel(renderer, t, ph, st = {}) {
  const g = new THREE.Group();
  const D = config.knit.deco;
  const R = D.tassel * 0.2; // 다발 굵기 (짧아져도 그대로)
  const len = D.tassel * (st.len ?? 1), top = D.cord, all = len + top;
  const cord = new THREE.CylinderGeometry(0.007, 0.007, top, 6);
  cord.translate(0, -top / 2, 0);
  addSway(cord, (p) => -p.y / all, ph);
  g.add(new THREE.Mesh(cord, toonMaterial({ color: t.dark, sway: 1 })));
  // 다발: 위는 둥근 머리, 띠 아래로 살짝 잘록했다가 아래로 퍼진다
  const prof = [];
  const head = [[0.001, 0], [0.55, 0.03], [0.85, 0.12], [0.95, 0.24], [0.8, 0.33], [0.72, 0.4], [0.82, 0.55], [0.95, 0.8], [1.02, 1]];
  // 아래 → 위 순서로 (거꾸로면 면이 안쪽을 향해 그림자처럼 어두워진다)
  for (const [r, y] of head.reverse()) prof.push(new THREE.Vector2(r * R, -top - y * len));
  const body = new THREE.LatheGeometry(prof, 20);
  addSway(body, (p) => Math.min(1, -p.y / all), ph);
  const map = cached('tassel' + t.accent, () => drawTex(renderer, 256, (c, k, n) => {
    c.fillStyle = t.accent; c.fillRect(0, 0, n, n);
    // 실 가닥 결 (세로) + 밝은 결
    for (let i = 0; i < 18; i++) {
      const x = (i + 0.5) * n / 18;
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = n * 0.012;
      c.beginPath(); c.moveTo(x + n * 0.012, n * 0.38); c.lineTo(x + n * 0.016, n); c.stroke();
      k.globalAlpha = 0.55; k.lineWidth = n * 0.008;
      k.beginPath(); k.moveTo(x, n * 0.42); k.lineTo(x + n * 0.004, n * 0.98); k.stroke();
    }
    k.globalAlpha = 1;
  }));
  g.add(new THREE.Mesh(body, toonMaterial({ map, sway: 1 })));
  // 감은 띠: 머리 아래 잘록한 곳
  const band = new THREE.TorusGeometry(R * 0.76, R * 0.16, 8, 20);
  band.rotateX(Math.PI / 2);
  band.translate(0, -top - len * 0.37, 0);
  addSway(band, () => (top + len * 0.37) / all, ph);
  g.add(new THREE.Mesh(band, toonMaterial({ color: t.dark, sway: 1 })));
  // 아래 술: 끝이 몇 가닥으로 갈라진다
  const mat = toonMaterial({ color: t.accent, sway: 1 });
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3;
    const r = R * 0.75, l = len * (0.1 + (k % 3) * 0.035);
    const s = new THREE.CapsuleGeometry(R * 0.2, l, 3, 6);
    s.translate(Math.cos(a) * r, -all - l * 0.4, Math.sin(a) * r);
    addSway(s, () => 1, ph);
    g.add(new THREE.Mesh(s, mat));
  }
  // 풀린 가닥: 술 끝에서 꼬불꼬불 늘어진 실 한 가닥
  if (st.loose) {
    const pts = [], L = D.tassel * 0.75;
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      pts.push(new THREE.Vector3(R * 0.5 + Math.sin(u * 9) * 0.012 + u * 0.04, -all - u * L, R * 0.5 + Math.cos(u * 11) * 0.01));
    }
    const strand = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.006, 5, false);
    addSway(strand, (p) => Math.min(1.6, -p.y / all), ph);
    g.add(new THREE.Mesh(strand, toonMaterial({ color: t.accent, sway: 1 })));
  }
  return g;
}
