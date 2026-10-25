// 빠른 가림 검사: 나무 메시의 삼각형을 상자 나무(BVH)로 묶어 두고, 광선이 지나는 상자 속 삼각형만 본다.
// three.js Raycaster 와 같은 답(앞면만, 0 ~ far 사이에 하나라도 맞으면 가림)을 수백 배 빨리 낸다.
import * as THREE from 'three';

const cache = new WeakMap(); // 지오메트리 → 상자 나무
const LEAF = 8; // 상자 하나에 삼각형 몇 개까지

function build(geo) {
  const pos = geo.attributes.position.array;
  const idx = geo.index ? geo.index.array : null;
  const n = (idx ? idx.length : pos.length / 3) / 3;
  // 삼각형마다 세 꼭짓점 (평평하게 펼쳐 둔다)
  const tri = new Float32Array(n * 9);
  const mid = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      const v = idx ? idx[i * 3 + k] : i * 3 + k;
      for (let c = 0; c < 3; c++) tri[i * 9 + k * 3 + c] = pos[v * 3 + c];
    }
    for (let c = 0; c < 3; c++) mid[i * 3 + c] = (tri[i * 9 + c] + tri[i * 9 + 3 + c] + tri[i * 9 + 6 + c]) / 3;
  }
  const order = new Uint32Array(n).map((_, i) => i);
  const nodes = []; // { box: [minx,miny,minz,maxx,maxy,maxz], a, b(자식) 또는 s, e(삼각형 범위) }
  function node(s, e) {
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = s; i < e; i++) {
      const t = order[i] * 9;
      for (let k = 0; k < 9; k++) {
        const c = k % 3, v = tri[t + k];
        if (v < box[c]) box[c] = v;
        if (v > box[c + 3]) box[c + 3] = v;
      }
    }
    const me = { box };
    nodes.push(me);
    if (e - s <= LEAF) { me.s = s; me.e = e; return me; }
    // 가장 긴 축의 가운데에서 둘로 가른다 (정렬 없이 앞뒤로 옮기기만)
    const ax = [0, 1, 2].sort((p, q) => (box[q + 3] - box[q]) - (box[p + 3] - box[p]))[0];
    const cut = (box[ax] + box[ax + 3]) / 2;
    let m = s;
    for (let i = s; i < e; i++) {
      if (mid[order[i] * 3 + ax] < cut) { const t = order[i]; order[i] = order[m]; order[m] = t; m++; }
    }
    if (m === s || m === e) m = (s + e) >> 1; // 한쪽으로 몰리면 반으로
    me.a = node(s, m);
    me.b = node(m, e);
    return me;
  }
  return { tri, order, root: node(0, n) };
}

// 광선이 상자를 0 ~ far 안에서 지나는지
function hitBox(b, o, inv, far) {
  let t0 = 0, t1 = far;
  for (let c = 0; c < 3; c++) {
    let a = (b[c] - o[c]) * inv[c], z = (b[c + 3] - o[c]) * inv[c];
    if (a > z) [a, z] = [z, a];
    if (a > t0) t0 = a;
    if (z < t1) t1 = z;
    if (t0 > t1) return false;
  }
  return true;
}

// 앞면 삼각형과 만나는 거리 (없으면 -1). three.js Ray.intersectTriangle(backfaceCulling) 과 같은 식
function hitTri(T, i, o, d, far) {
  const ax = T[i], ay = T[i + 1], az = T[i + 2];
  const e1x = T[i + 3] - ax, e1y = T[i + 4] - ay, e1z = T[i + 5] - az;
  const e2x = T[i + 6] - ax, e2y = T[i + 7] - ay, e2z = T[i + 8] - az;
  const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
  const DdN = d[0] * nx + d[1] * ny + d[2] * nz;
  if (DdN >= 0) return -1; // 뒷면이거나 나란함
  const sx = o[0] - ax, sy = o[1] - ay, sz = o[2] - az;
  // d · (s × e2), d · (e1 × s)
  const qx = sy * e2z - sz * e2y, qy = sz * e2x - sx * e2z, qz = sx * e2y - sy * e2x;
  const b1 = -(d[0] * qx + d[1] * qy + d[2] * qz) / -DdN;
  if (b1 < 0) return -1;
  const rx = e1y * sz - e1z * sy, ry = e1z * sx - e1x * sz, rz = e1x * sy - e1y * sx;
  const b2 = -(d[0] * rx + d[1] * ry + d[2] * rz) / -DdN;
  if (b2 < 0 || b1 + b2 > 1) return -1;
  const t = (sx * nx + sy * ny + sz * nz) / -DdN;
  return t >= 0 && t <= far ? t : -1;
}

const inv4 = new THREE.Matrix4(), lo = new THREE.Vector3(), ld = new THREE.Vector3();
/** 광선(origin, 길이 1인 dir)이 0 ~ far 사이에서 meshes 중 하나라도 맞히는지 */
export function anyHit(meshes, origin, dir, far) {
  for (const m of meshes) {
    let B = cache.get(m.geometry);
    if (!B) { B = build(m.geometry); cache.set(m.geometry, B); }
    // 광선을 메시 안쪽 좌표로 (거리 t 는 그대로 쓸 수 있게 방향은 정규화하지 않는다)
    inv4.copy(m.matrixWorld).invert();
    lo.copy(origin).applyMatrix4(inv4);
    ld.copy(origin).add(dir).applyMatrix4(inv4).sub(lo);
    const o = [lo.x, lo.y, lo.z], d = [ld.x, ld.y, ld.z], inv = d.map((v) => 1 / v);
    const stack = [B.root];
    while (stack.length) {
      const nd = stack.pop();
      if (!hitBox(nd.box, o, inv, far)) continue;
      if (nd.a) { stack.push(nd.a, nd.b); continue; }
      for (let k = nd.s; k < nd.e; k++) if (hitTri(B.tri, B.order[k] * 9, o, d, far) >= 0) return true;
    }
  }
  return false;
}
