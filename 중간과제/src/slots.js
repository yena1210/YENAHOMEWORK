// 슬롯: 뜨개 조각이 감길 자리 (가지 + 구간 [t0, t1])
// 얀 바밍처럼 줄기에서 큰 가지로 띠가 이어지도록, 굵은 가지를 밑에서부터 잘라 나간다.
// 갈라지는 곳은 비우고, 정면(카메라)에서 가려지는 자리는 뺀다.
import * as THREE from 'three';
import { config } from './config.js';
import { anyHit } from './bvh.js';

/** occ = 앞에 선 나무들 (가리면 자리가 아니다), avoid = 다른 나무의 자리 (화면에서 겹치지 않게) */
export function makeSlots(branches, treeMesh, eye, occ = [], avoid = []) {
  const block = [treeMesh, ...occ];
  const C = config.slots;
  const cand = [];

  for (const b of branches) {
    if (b.level > C.maxLevel || b.r0 < C.rMin) continue;
    // 부모 가지 끝 쪽에서 난 가지는 가지 끝이 빽빽한 곳이라 가려지고 찾기 어렵다
    if (b.level >= 2 && b.tp > C.maxTp) continue;
    // 크게 갈라지는 곳 (부모만큼 굵은 자식) 앞뒤는 비운다.
    // 가는 자식 가지는 뜨개를 뚫고 나온다 (실제 얀 바밍처럼 구멍을 내고 감은 것)
    const skip = b.kids
      .filter((c) => c.r0 > b.radius(c.tp) * C.bigKid)
      .map((c) => [c.tp * b.len - c.r0 * C.forkPad, c.tp * b.len + c.r0 * C.forkPad * 1.4]);
    // 시작 위치: 줄기는 뿌리 위, 갈라진 줄기(줄기를 그대로 잇는 굵은 갈래)는 갈래 바로 위, 큰 가지는 깃 지나서
    const lead = b.relief?.keep;
    let s = !b.parent ? C.trunkStart : lead ? C.leadStart : b.exit + b.r0 * C.forkPad;
    let order = 0;
    // 줄기: 뿌리 위에서 갈라지는 곳 바로 앞까지 빈틈없이 고르게 나눈다 (가운데 기둥이 비지 않게)
    if (!b.parent) {
      const fork = skip.length ? Math.min(...b.kids.filter((c) => c.r0 > b.radius(c.tp) * C.bigKid).map((c) => c.tp * b.len)) : b.len * 0.8;
      const end = fork - C.trunkTop;
      const n = Math.max(1, Math.round((end - s + C.gap) / (C.trunkLen + C.gap)));
      const L = (end - s - (n - 1) * C.gap) / n;
      for (let i = 0; i < n; i++) {
        const a = s + i * (L + C.gap);
        cand.push({ branch: b, t0: a / b.len, t1: (a + L) / b.len, r: b.radius(a / b.len), order: order++ });
      }
      continue;
    }
    while (s < b.len) {
      const r = b.radius(s / b.len);
      if (r < C.rMin) break;
      const L = THREE.MathUtils.clamp(r * 2 * C.lenK, C.minLen, b.parent ? C.maxLen : C.trunkLen);
      const e = s + L;
      // 갈라지는 곳과 겹치면 그 뒤로 건너뛴다
      const hit = skip.find(([a, z]) => e > a && s < z);
      if (hit) { s = hit[1]; continue; }
      if (e > b.len * 0.92 || b.radius(e / b.len) < C.rMin * 0.8) break;
      if (b.at(e / b.len).pos.y > C.maxY) break;
      cand.push({ branch: b, t0: s / b.len, t1: e / b.len, r, order: order++ });
      s = e + C.gap;
    }
  }

  // 정면에서 보이는지: 조각 둘레의 여러 방향(정면 ±70도)에서 표면 점을 골라 카메라로 광선을 쏜다.
  // 한 방향이라도 가리지 않으면 그 높이는 보이는 것 → 뒤쪽 갈래도 옆면이 보이면 슬롯이 된다. (광선 검사는 bvh.js 로 빠르게)
  const f = {}, p = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3();
  treeMesh.updateMatrixWorld(true);
  const toWorld = treeMesh.matrixWorld;
  const look = (b, t, a) => {
    n.copy(f.nrm).multiplyScalar(Math.cos(a)).addScaledVector(f.bin, Math.sin(a));
    p.copy(f.pos).addScaledVector(n, b.surface(t, a, f.r) + 0.05).applyMatrix4(toWorld);
    d.copy(eye).sub(p);
    if (n.dot(d) <= d.length() * 0.2) return false; // 카메라 쪽을 안 보는 면
    const dist = d.length();
    if (anyHit(block, eye, d.negate().normalize(), dist)) return false;
    // 매달린 장식: 늘어진 끝(아래로 drop만큼)도 보여야 한다
    if (!drop) return true;
    p.y -= drop;
    d.copy(eye).sub(p);
    return !anyHit(block, eye, d.clone().negate().normalize(), d.length());
  };
  let drop = 0;

  // 매달린 장식(퐁퐁, 태슬)이 내려갈 길이 비었는지: 끈과 방울이 가지나 아래 조각 속으로, 땅 밑으로 묻히지 않게.
  // 가지 표면을 촘촘히 짚어 두고, 매달린 길의 점마다 표면까지 거리를 잰다 (나무 안쪽 좌표, y 가 위)
  const KD = config.knit.deco, thick = config.knit.thick;
  const hangLen = KD.cord + Math.max(KD.pompom * 2, KD.tassel * 1.1); // 끈 + 방울(또는 술) 끝까지
  const marks = [];
  for (const b of branches) {
    const n = Math.max(2, Math.ceil(b.len / 0.05));
    for (let i = 0; i <= n; i++) {
      const f2 = b.at(i / n, {});
      let rm = 0;
      for (let k = 0; k < 8; k++) rm = Math.max(rm, b.surface(i / n, (k / 8) * Math.PI * 2, f2.r));
      marks.push({ b, t: i / n, f: f2, rm, half: b.len / n * 0.6 });
    }
  }
  const q = new THREE.Vector3();
  // 점 P 에서 가장 가까운 나무 표면(+ 조각 두께)까지의 거리
  function gap(P, near) {
    let best = Infinity;
    for (const m of marks) {
      const dx = P.x - m.f.pos.x, dy = P.y - m.f.pos.y, dz = P.z - m.f.pos.z;
      if (dx * dx + dy * dy + dz * dz > (m.rm + near + m.half) ** 2) continue;
      q.set(dx, dy, dz);
      const along = q.dot(m.f.tan);
      if (Math.abs(along) > m.half) continue;
      q.addScaledVector(m.f.tan, -along);
      const a = Math.atan2(q.dot(m.f.bin), q.dot(m.f.nrm));
      best = Math.min(best, q.length() - m.b.surface(m.t, a, m.f.r) - thick * 1.5);
    }
    return best;
  }
  const A = new THREE.Vector3(), P2 = new THREE.Vector3();
  // 붙는 자리에서 장식까지 떨어진 만큼(o0)보다 아래 길에서 표면이 더 다가오면 묻힌다
  function hangFree(b, t, a, len) {
    b.at(t, f);
    n.copy(f.nrm).multiplyScalar(Math.cos(a)).addScaledVector(f.bin, Math.sin(a));
    const lift = thick * 1.4 + KD.tassel * 0.12; // piece.js 와 같은 띄움
    A.copy(f.pos).addScaledVector(n, b.surface(t, a, f.r) + lift);
    if (A.y - len < 0.04) return false; // 땅에 닿는다
    const o0 = lift - thick * 1.5;
    for (let y = 0.06; y <= len + 1e-6; y += 0.04) {
      P2.set(A.x, A.y - y, A.z);
      if (gap(P2, o0) < o0 * 0.6) return false;
    }
    return true;
  }

  // 매달린 장식은 내려갈 길이 빈 곳만. 없으면 장식을 조금 작게(s) 해서 다시 찾는다 (밑동 가까이 등)
  const SIZES = [1, 0.75, 0.55, 0.4];
  const free = (c, t, a, dz, sc) => !dz || hangFree(c.branch, t, a, hangLen * sc);

  for (const c of cand) {
    let seen = 0;
    const N = 5;
    for (let i = 0; i < N; i++) {
      const t = c.t0 + ((c.t1 - c.t0) * (i + 0.5)) / N;
      c.branch.at(t, f);
      d.copy(eye).sub(p.copy(f.pos).applyMatrix4(toWorld));
      const a0 = Math.atan2(d.dot(f.bin), d.dot(f.nrm)); // 카메라 쪽 둘레 각도
      if ([0, -0.6, 0.6, -1.2, 1.2].some((k) => look(c.branch, t, a0 + k))) seen++;
    }
    c.seen = seen / N;
    // 정면에서 똑바로 보이는 정도 (옆면만 겨우 보이는 것은 찾기 어렵다)
    let front = 0;
    for (let i = 0; i < N; i++) {
      const t = c.t0 + ((c.t1 - c.t0) * (i + 0.5)) / N;
      c.branch.at(t, f);
      d.copy(eye).sub(p.copy(f.pos).applyMatrix4(toWorld));
      if (look(c.branch, t, Math.atan2(d.dot(f.bin), d.dot(f.nrm)))) front++;
    }
    c.front = front / N;
    // 화면 위 자리 (정면 카메라에서 본 가운데와 양 끝, 시야 각 단위)
    const scr = (t) => { c.branch.at(t, f); p.copy(f.pos).applyMatrix4(toWorld); const z = eye.z - p.z; return [(p.x - eye.x) / z, (p.y - eye.y) / z]; };
    c.scr = [scr(c.t0), scr((c.t0 + c.t1) / 2), scr(c.t1)];
    // 장식 자리: 가운데에 가까우면서 카메라에서 실제로 보이는 곳 (뒤쪽 갈래는 줄기에 가리지 않는 옆면)
    // 붙는 장식(꽃)과 매달린 장식(퐁퐁, 태슬)은 따로 찾는다 → 매달린 것은 늘어진 끝까지 보이는 곳
    const stick = spot(c, 0), hang = spot(c, C.hangDrop);
    c.deco = { stick, hang: hang.a === null ? { ...stick, s: 0.4 } : hang }; // 빈 길이 없으면 붙는 자리에 아주 작게
    c.spots = (dz) => spots(c, dz);
  }
  // 장식을 달 수 있는 보이는 자리 전부 (조각마다 이 중에서 랜덤으로 고른다). k = 정면에서 돈 각도
  function spots(c, dz) {
    const out = [];
    for (const sc of dz ? SIZES : [1]) {
      drop = dz * sc;
      for (const u of [0.3, 0.42, 0.5, 0.58, 0.7]) {
        const t = c.t0 + (c.t1 - c.t0) * u;
        c.branch.at(t, f);
        d.copy(eye).sub(p.copy(f.pos).applyMatrix4(toWorld));
        const a0 = Math.atan2(d.dot(f.bin), d.dot(f.nrm));
        for (const k of [-1.1, -0.75, -0.4, 0, 0.4, 0.75, 1.1]) {
          if (look(c.branch, t, a0 + k) && free(c, t, a0 + k, dz, sc)) out.push({ at: u, a: a0 + k, k, s: sc });
        }
      }
      if (out.length) break;
    }
    drop = 0;
    return out;
  }
  function spot(c, dz) {
    for (const sc of dz ? SIZES : [1]) {
      drop = dz * sc;
      for (const u of [0.5, 0.38, 0.62, 0.26, 0.74, 0.16, 0.84, 0.92]) {
        const t = c.t0 + (c.t1 - c.t0) * u;
        c.branch.at(t, f);
        d.copy(eye).sub(p.copy(f.pos).applyMatrix4(toWorld));
        const a0 = Math.atan2(d.dot(f.bin), d.dot(f.nrm));
        for (const k of [0, -0.45, 0.45, -0.9, 0.9, -1.3, 1.3, -1.65, 1.65]) {
          if (look(c.branch, t, a0 + k) && free(c, t, a0 + k, dz, sc)) { drop = 0; return { at: u, a: a0 + k, s: sc }; }
        }
      }
    }
    drop = 0;
    return { at: 0.5, a: null };
  }

  // 찾기 쉬운 자리만: 정면에서 똑바로 보이고, 화면에서 다른 조각과 겹치지 않을 만큼 떨어진 것.
  // 굵고 앞에 있는 것부터 고르고, 이미 고른 조각과 화면에서 너무 가까우면 뺀다 (가득 차면 새 나무로)
  const segD = (a, b) => {
    let m = Infinity;
    for (const p of a) for (const q of b) m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1]));
    return m;
  };
  const list = [];
  for (const c of cand
    // 굵은 줄기 갈래(레벨 0, 1)는 크게 보여서 정면이 조금 가려도 찾기 쉽다
    .filter((c) => c.seen >= C.minSeen && c.front >= (c.branch.level <= 1 ? C.minFrontLead : C.minFront))
    .sort((a, b) => b.r * (0.5 + b.front) - a.r * (0.5 + a.front))) {
    if (list.length >= C.max) break;
    // 같은 가지에서 이어진 조각은 붙어 있어도 괜찮다 (띠처럼 이어진다). 다른 가지와는 떨어져 있어야 한다
    // 바로 이어진 가지(줄기 → 갈라진 줄기)도 띠처럼 이어지니 괜찮다
    const linked = (o) => o.branch === c.branch || o.branch === c.branch.parent || o.branch.parent === c.branch;
    if (list.some((o) => !linked(o) && segD(o.scr, c.scr) < C.sep)) continue;
    if (avoid.some((o) => segD(o.scr, c.scr) < C.sep * 1.4)) continue; // 앞 나무 조각과도 떨어지게
    list.push(c);
  }
  // 번호는 밑동에서 위로 (줄기 → 가지)
  list.sort((a, b) => a.branch.level - b.branch.level || branches.indexOf(a.branch) - branches.indexOf(b.branch) || a.t0 - b.t0);
  list.forEach((c, i) => { c.id = i; c.memo = null; });
  return list;
}

// ?debug: 슬롯 자리를 양 끝 고리로 표시한다
export function slotMarkers(slots) {
  const grp = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: '#e0457b', depthTest: false, transparent: true, opacity: 0.8 });
  const f = {};
  for (const s of slots) {
    for (const t of [s.t0, s.t1]) {
      s.branch.at(t, f);
      const pts = [];
      for (let j = 0; j < 32; j++) {
        const a = (j / 32) * Math.PI * 2;
        const n = f.nrm.clone().multiplyScalar(Math.cos(a)).addScaledVector(f.bin, Math.sin(a));
        pts.push(f.pos.clone().addScaledVector(n, s.branch.surface(t, a, f.r) + 0.04));
      }
      grp.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }
  grp.renderOrder = 10;
  return grp;
}
