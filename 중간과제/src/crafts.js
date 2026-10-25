// 뜨개와 바느질 소재들. 각 함수는 THREE.Group을 돌려준다.
// 흔들리는 것은 aSway(뿌리 0 → 끝 1), aPhase(개체 위상) 속성을 가진다.
import * as THREE from 'three';
import { toonMaterial, addSway } from './toon.js';
import { knitTex, yarnTex, fuzzTex, buttonTex, wrapTex } from './craftTex.js';
import { drawTex } from './knit.js';

const texCache = new Map();
function cached(key, fn) {
  if (!texCache.has(key)) texCache.set(key, fn());
  return texCache.get(key);
}

/**
 * 뜨개 잎: 가운데 줄기를 따라 휘고, 가로로 오목하다. 코 크기는 실제 크기 기준으로 일정.
 * o.len 길이, o.width 폭, o.bend 앞으로 휨, o.cup 오목함, o.stripes 줄 색들
 */
export function knitLeaf(renderer, o) {
  const nu = 18, nv = 10;
  const pos = [], uv = [], idx = [];
  const stitch = o.stitch || 0.07; // 코 하나의 실제 크기
  let y = 0, z = 0, a = o.tilt || 0;
  const mid = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    mid.push([y, z, u * o.len]);
    a += (o.bend * o.len) / nu;
    y += Math.cos(a) * (o.len / nu);
    z += Math.sin(a) * (o.len / nu);
  }
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    // 잎 모양: 아래는 둥글고 끝은 뾰족하게
    const w = o.width * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.85) * (1 - 0.15 * u);
    const [my, mz, s] = mid[i];
    for (let j = 0; j <= nv; j++) {
      const v = (j / nv) * 2 - 1;
      const x = v * w;
      const cz = -o.cup * v * v * w; // 가로로 오목
      pos.push(x, my, mz + cz);
      uv.push(x / (stitch * 8) + 0.5, s / (stitch * 10));
    }
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const p = i * (nv + 1) + j, q = p + nv + 1;
      idx.push(p, q, p + 1, q, q + 1, p + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  addSway(g, (p) => Math.min(1, Math.hypot(p.y, p.z) / o.len) * (o.swayK ?? 1) + (o.swayBase || 0), o.phase || 0);

  const key = 'leaf' + o.stripes.join();
  const map = cached(key, () => knitTex(renderer, { stripes: o.stripes, seed: o.stripes.length * 7 }));
  const mat = toonMaterial({ map, sway: 1, side: THREE.DoubleSide, cover: o.cover, ink: 0.7 });
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// 곡선을 따라 가는 관 (줄기, 덩굴, 실). sway는 시작 0 → 끝 1
function tube(curve, r, segs, mat, swayFrom = 0, swayTo = 1, phase = 0) {
  const g = new THREE.TubeGeometry(curve, segs, r, 8, false);
  // 관의 uv.x = 길이 방향
  const uvs = g.attributes.uv;
  const sw = [];
  for (let i = 0; i < uvs.count; i++) sw.push(swayFrom + (swayTo - swayFrom) * uvs.getX(i));
  g.setAttribute('aSway', new THREE.Float32BufferAttribute(sw, 1));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(new Array(uvs.count).fill(phase), 1));
  // 실 꼬임 무늬가 길이에 맞게 반복되도록
  const len = curve.getLength();
  for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getY(i), uvs.getX(i) * len / (r * 9));
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

/** 단추 꽃: 줄기 + 펠트 꽃잎 + 단추 + 뜨개 잎 */
export function buttonFlower(renderer, o) {
  const grp = new THREE.Group();
  const H = o.height, ph = o.phase || 0;
  const lean = o.lean || 0.15;
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.3, H * 0.35, 0),
    new THREE.Vector3(lean * 0.8, H * 0.7, 0.02),
    new THREE.Vector3(lean, H, 0.04),
  ]);
  const stemMat = cached('stem' + o.stem, () => toonMaterial({ color: o.stem, sway: 1 }));
  grp.add(tube(stemCurve, H * 0.018, 24, stemMat, 0, 1, ph));

  const top = stemCurve.getPoint(1);
  // 펠트 꽃잎: 둥근 납작 판 여러 장
  const petalMat = cached('petal' + o.petal, () => toonMaterial({ color: o.petal, sway: 1, side: THREE.DoubleSide }));
  const n = o.petals || 6, R = o.size;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const g = new THREE.CircleGeometry(R * 0.55, 20);
    g.scale(1, 0.62, 1);
    g.translate(R * 0.62, 0, 0);
    g.rotateZ(a);
    g.rotateX(-0.25); // 살짝 하늘을 본다
    g.translate(top.x, top.y, top.z - 0.01 - k * 0.002);
    addSway(g, () => 1, ph);
    grp.add(new THREE.Mesh(g, petalMat));
  }
  // 단추
  const bmap = cached('btn' + o.button + o.thread, () => buttonTex(renderer, { color: o.button, thread: o.thread }));
  const bg = new THREE.CylinderGeometry(R * 0.5, R * 0.52, R * 0.16, 32);
  bg.rotateX(Math.PI / 2 - 0.25);
  bg.translate(top.x, top.y, top.z + R * 0.06);
  addSway(bg, () => 1, ph);
  // 원기둥 윗면 uv가 단추 무늬를 보도록 그대로 쓴다
  grp.add(new THREE.Mesh(bg, cached('btnm' + o.button, () => toonMaterial({ map: bmap, sway: 1 }))));
  // 줄기에 잎 두 장
  for (const [t, side] of [[0.35, 1], [0.6, -1]]) {
    const p = stemCurve.getPoint(t);
    const leaf = knitLeaf(renderer, {
      len: H * 0.32, width: H * 0.09, bend: 0.9, cup: 0.4, stripes: o.leaf, tilt: 0.2,
      swayK: 0.4, swayBase: t, phase: ph,
    });
    leaf.position.copy(p);
    leaf.rotation.z = -side * 1.1;
    grp.add(leaf);
  }
  grp.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return grp;
}

/** 털실 덩굴: 화면 밖(시작점)에서 늘어진다. 잎이 군데군데 달린다. */
export function yarnVine(renderer, o) {
  const grp = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(o.points.map((p) => new THREE.Vector3(...p)));
  const map = cached('vine' + o.color, () => yarnTex(renderer, { color: o.color }));
  const mat = toonMaterial({ map, sway: 1 });
  grp.add(tube(curve, o.radius, 120, mat, 0, 1, o.phase || 0));
  const count = o.leaves || 6;
  for (let k = 0; k < count; k++) {
    const t = (o.leafFrom ?? 0.15) + (k / count) * (1 - (o.leafFrom ?? 0.15));
    const p = curve.getPoint(t);
    const leaf = knitLeaf(renderer, {
      len: o.leafLen * (0.8 + 0.4 * ((k * 37) % 10) / 10), width: o.leafLen * 0.32, bend: 1.2, cup: 0.5,
      stripes: o.leaf, swayK: 0.3, swayBase: t, phase: o.phase || 0, tilt: 0.3,
    });
    leaf.position.copy(p);
    leaf.rotation.z = (k % 2 ? 1 : -1) * 1.9 + Math.sin(k) * 0.4;
    leaf.rotation.y = Math.sin(k * 2.1) * 0.6;
    grp.add(leaf);
  }
  return grp;
}

/** 털실 방울 덤불: 크기가 다른 방울들이 둥글게 모여 있다 */
export function pompomBush(renderer, o, rand) {
  const grp = new THREE.Group();
  const n = o.count;
  for (let k = 0; k < n; k++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * o.spread;
    const r = o.r * (0.6 + rand() * 0.6);
    const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.6;
    const y = r * 0.8 + (1 - d / o.spread) * o.r * 0.9 * rand();
    const color = o.colors[Math.floor(rand() * o.colors.length)];
    const map = cached('fuzz' + color, () => fuzzTex(renderer, { color, seed: color.length }));
    const g = new THREE.SphereGeometry(r, 28, 20);
    g.translate(x, y, z);
    addSway(g, (p) => Math.max(0, p.y / (o.r * 3)) * 0.5, rand() * 6.28);
    const m = new THREE.Mesh(g, cached('fuzzm' + color, () => toonMaterial({ map, sway: 1, cover: 1, fade: o.fade, fadeColor: o.fadeColor })));
    m.castShadow = m.receiveShadow = true;
    grp.add(m);
  }
  return grp;
}

/** 실패: 나무 양 끝판 + 가운데 감긴 실 */
export function spool(renderer, o) {
  const grp = new THREE.Group();
  const R = o.r, H = o.h;
  const wood = toonMaterial({ color: o.wood, cover: 1, fade: o.fade, fadeColor: o.fadeColor });
  for (const y of [0, H - R * 0.25]) {
    const g = new THREE.CylinderGeometry(R, R * 1.02, R * 0.25, 40);
    g.translate(0, y + R * 0.125, 0);
    const m = new THREE.Mesh(g, wood);
    m.castShadow = m.receiveShadow = true;
    grp.add(m);
  }
  const tmap = wrapTex(renderer, { color: o.thread, lines: 22 });
  const tg = new THREE.CylinderGeometry(R * 0.78, R * 0.78, H - R * 0.5, 40, 1, true);
  tg.translate(0, H / 2, 0);
  const tm = new THREE.Mesh(tg, toonMaterial({ map: tmap, fade: o.fade, fadeColor: o.fadeColor }));
  tm.castShadow = tm.receiveShadow = true;
  grp.add(tm);
  return grp;
}

/** 바늘꽂이: 골이 진 토마토 모양 + 꽂힌 핀 */
export function pincushion(renderer, o, rand) {
  const grp = new THREE.Group();
  const g = new THREE.SphereGeometry(o.r, 48, 32);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    const k = 1 + 0.07 * Math.cos(a * 8); // 골 8개
    p.setXYZ(i, v.x * k, v.y * 0.72, v.z * k);
  }
  g.computeVertexNormals();
  g.translate(0, o.r * 0.68, 0);
  const body = new THREE.Mesh(g, toonMaterial({ color: o.color, cover: 1, fade: o.fade, fadeColor: o.fadeColor }));
  body.castShadow = body.receiveShadow = true;
  grp.add(body);
  const pinMat = toonMaterial({ color: '#d9d6e8', fade: o.fade, fadeColor: o.fadeColor });
  for (let k = 0; k < o.pins; k++) {
    const a = rand() * Math.PI * 2, e = 0.4 + rand() * 0.8;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    const base = dir.clone().multiplyScalar(o.r * 0.9).setY(o.r * 0.68 + dir.y * o.r * 0.65);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, o.r * 0.7, 6), pinMat);
    pin.position.copy(base).addScaledVector(dir, o.r * 0.3);
    pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const head = new THREE.Mesh(new THREE.SphereGeometry(o.r * 0.07, 12, 8),
      cached('pinhead' + k % 3, () => toonMaterial({ color: o.heads[k % o.heads.length], fade: o.fade, fadeColor: o.fadeColor })));
    head.position.copy(base).addScaledVector(dir, o.r * 0.65);
    grp.add(pin, head);
  }
  return grp;
}

/** 땅에 비스듬히 꽂힌 큰 바늘과, 바늘귀에서 늘어진 실 */
export function needle(renderer, o) {
  const grp = new THREE.Group();
  const L = o.len;
  const g = new THREE.CylinderGeometry(L * 0.012, L * 0.002, L, 10);
  g.translate(0, L / 2, 0);
  const m = new THREE.Mesh(g, toonMaterial({ color: '#e4e2ef' }));
  m.castShadow = true;
  m.rotation.z = o.tilt;
  grp.add(m);
  // 바늘귀 위치에서 실이 땅으로 늘어진다
  const eye = new THREE.Vector3(0, L * 0.95, 0).applyEuler(m.rotation);
  const pts = [eye, eye.clone().add(new THREE.Vector3(0.25, -L * 0.3, 0.1)), new THREE.Vector3(eye.x + 0.6, 0.02, 0.4), new THREE.Vector3(eye.x + 1.4, 0.02, 0.2)];
  const curve = new THREE.CatmullRomCurve3(pts);
  const map = cached('vine' + o.thread, () => yarnTex(renderer, { color: o.thread }));
  grp.add(tube(curve, L * 0.008, 60, toonMaterial({ map, sway: 0.3 }), 0.6, 0, 0));
  return grp;
}

/**
 * 코바늘 바구니: 짧은뜨기 코가 줄줄이 쌓인 벽 + 도톰하게 말린 테두리.
 * 위가 열려 있어 안에 담긴 실뭉치 윗부분이 보인다.
 * o.r 위 반지름, o.h 높이, o.base 바탕 실 색, o.band 줄무늬 색, o.rim 테두리 색 (손잡이 없음)
 */
export function basket(renderer, o) {
  const grp = new THREE.Group();
  const R = o.r, H = o.h;
  // 벽 무늬: 짧은뜨기 코(둥근 V) 줄. 위쪽 두 줄은 색 줄무늬
  const rows = 8, cols = 12;
  const map = cached('basket' + o.base + o.band, () => drawTex(renderer, 512, (c, g, n) => {
    c.fillStyle = o.shade; c.fillRect(0, 0, n, n);
    const w = n / cols, h = n / rows;
    g.lineWidth = n * 0.006;
    for (let j = 0; j < rows; j++) {
      // 캔버스 첫 줄 = v 0 = 바구니 아래. 위에서 두세 번째 줄이 줄무늬
      const color = j === rows - 2 || j === rows - 3 ? o.band : o.base;
      for (let i = 0; i < cols; i++) {
        const x = (i + (j % 2) * 0.5) * w, y = j * h;
        for (const dx of [-1, 1]) {
          c.save(); c.translate(x + w * 0.5 + dx * w * 0.2, y + h * 0.5); c.rotate(dx * 0.42);
          c.fillStyle = color; c.beginPath(); c.ellipse(0, 0, w * 0.2, h * 0.46, 0, 0, 7); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.ellipse(-w * 0.04, -h * 0.1, w * 0.07, h * 0.22, 0, 0, 7); c.fill();
          c.restore();
          g.save(); g.translate(x + w * 0.5 + dx * w * 0.2, y + h * 0.5); g.rotate(dx * 0.42);
          g.beginPath(); g.ellipse(0, 0, w * 0.2, h * 0.46, 0, 0, 7); g.stroke();
          g.restore();
        }
      }
    }
  }));
  const wall = toonMaterial({ map, cover: 0.5 });
  // 바깥 벽 (아래가 조금 좁다), 안쪽 벽 (법선이 안을 보게 거꾸로)
  const prof = [[R * 0.8, 0], [R * 0.9, H * 0.3], [R * 0.97, H * 0.7], [R, H]];
  const outer = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64);
  const inner = new THREE.LatheGeometry(prof.slice().reverse().map(([x, y]) => new THREE.Vector2(x * 0.9, Math.max(y, 0.03))), 64);
  for (const g of [outer, inner]) {
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 2); // 둘레에 무늬 두 번
    grp.add(new THREE.Mesh(g, wall));
  }
  // 바닥
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R * 0.86, 40).rotateX(-Math.PI / 2).translate(0, H * o.fill, 0), toonMaterial({ color: o.shade })); // 안에 깔린 실
  grp.add(floor);
  // 테두리: 도톰하게 말린 실
  const rimMap = wrapTex(renderer, { color: '#ffffff', lines: 26, seed: 31 });
  const rimMat = toonMaterial({ map: rimMap, color: o.rim, cover: 1 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.95, R * 0.085, 14, 72).rotateX(Math.PI / 2).translate(0, H, 0), rimMat);
  grp.add(rim);
  grp.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  return grp;
}
