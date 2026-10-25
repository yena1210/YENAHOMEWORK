// 메모 = 가지에 감긴 뜨개 조각 하나.
// 나무를 꾹 누르면 가장 가까운 빈 자리에 큰 실뭉치의 실이 올라가 조각이 고리 순서대로 짜인다.
// 누르고 있는 시간 = 중요도: 망사 → 줄무늬 → 그래니. 손을 떼면 남은 부분을 마저 짠다.
import * as THREE from 'three';
import { config, reduceMotion } from './config.js';
import { makePiece, grow } from './piece.js';
import { toonMaterial } from './toon.js';
import { yarnTex } from './craftTex.js';
import { yarnTones } from './knit.js';
import { dueState } from './due.js';

export function makeMemos(renderer, scene, world) {
  const P = config.press;
  const { tree, slots, ball, tail } = world;
  const memos = [];
  const eye = world.eye || new THREE.Vector3(0, config.camera.lookY, 14); // 이 나무를 정면에서 보는 자리 (실을 앞쪽으로 붙인다)
  const threadMap = yarnTex(renderer, { color: '#ffffff', seed: 21 });
  let tremble = 0; // 빈 자리가 없을 때 나무가 떠는 시간
  let searching = false; // 입력 줄에 적는 중 (찾기)

  // 누른 자리(화면 px)에서 가장 가까운 슬롯. free = 빈 자리만. → { slot, d(px) }
  const v = new THREE.Vector3();
  function nearest(x, y, camera, free) {
    const f = {};
    let best = null, bd = Infinity;
    for (const s of slots) {
      if (free && s.memo) continue;
      for (let i = 0; i <= 6; i++) {
        s.branch.at(s.t0 + ((s.t1 - s.t0) * i) / 6, f);
        v.copy(f.pos);
        tree.group.localToWorld(v).project(camera);
        const d = Math.hypot((v.x + 1) / 2 * innerWidth - x, (1 - v.y) / 2 * innerHeight - y) - f.r * 120;
        if (d < bd) { bd = d; best = s; }
      }
    }
    return { slot: best, d: bd };
  }
  // 누른 자리(나무 표면의 월드 좌표) → 짤 자리.
  // 1) 누른 곳이 어느 가지의 어디(t)인지 찾는다 (잔가지면 슬롯이 있는 부모 가지로 올라간다)
  // 2) 그 자리의 슬롯이 비어 있으면 거기, 차 있으면 같은 가지의 가장 가까운 빈 자리
  // 3) 같은 가지에 빈 자리가 없으면 누른 곳에서 가장 가까운 빈 자리
  const branches = tree.branches;
  function pick(worldPoint) {
    const p = tree.group.worldToLocal(worldPoint.clone());
    let hb = null, ht = 0, hd = Infinity;
    for (const b of branches) {
      for (let i = 0; i <= b.n; i++) {
        const d = b.P[i].distanceTo(p) - b.radius(i / b.n);
        if (d < hd) { hd = d; hb = b; ht = i / b.n; }
      }
    }
    let b = hb, t = ht;
    while (b && !slots.some((s) => s.branch === b)) { t = b.tp; b = b.parent; }
    if (b) {
      const mine = slots.filter((s) => s.branch === b && !s.memo);
      const at = mine.find((s) => t >= s.t0 && t <= s.t1);
      if (at) return at;
      if (mine.length) return mine.sort((x, y) => gapT(x, t) - gapT(y, t))[0];
    }
    // 같은 가지에 빈 자리가 없다 → 가장 가까운 빈 자리 (3D 거리)
    const f = {};
    let best = null, bd = Infinity;
    for (const s of slots) {
      if (s.memo) continue;
      for (let i = 0; i <= 4; i++) {
        s.branch.at(s.t0 + ((s.t1 - s.t0) * i) / 4, f);
        const d = f.pos.distanceTo(p);
        if (d < bd) { bd = d; best = s; }
      }
    }
    return best;
  }
  const gapT = (s, t) => Math.max(0, s.t0 - t, t - s.t1);

  // 미리보기: 짜일 자리의 양 끝에 실 색 고리 (누르는 순간 보여 준다)
  let ghost = null;
  function preview(slot, color) {
    clearPreview();
    if (!slot) return;
    ghost = new THREE.Group();
    const mat = toonMaterial({ color, ink: 0 });
    const f = {};
    for (const t of [slot.t0, slot.t1]) {
      slot.branch.at(t, f);
      const pts = [];
      for (let j = 0; j < 40; j++) {
        const a = (j / 40) * Math.PI * 2;
        const n = f.nrm.clone().multiplyScalar(Math.cos(a)).addScaledVector(f.bin, Math.sin(a));
        pts.push(f.pos.clone().addScaledVector(n, slot.branch.surface(t, a, f.r) + 0.02));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      ghost.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.012 + f.r * 0.03, 6, true), mat));
    }
    tree.group.add(ghost);
  }
  function clearPreview() {
    if (!ghost) return;
    tree.group.remove(ghost);
    ghost.traverse((o) => o.geometry?.dispose());
    ghost = null;
  }

  // Enter로 짤 때: 밑동 쪽부터 다음 빈 자리
  const nextFree = () => slots.find((s) => !s.memo) || null;

  /** 짜기 시작. hold = 꾹 누르는 중이면 true (뗄 때까지 천천히 짠다). keep = 다시 짤 때 이어 갈 것 (장식, 만든 시각) */
  function start(slot, text, hue, type, hold, keep = {}) {
    hue = Math.round(hue);
    const deco = keep.deco ?? null;
    const m = { text, hue, color: yarnTones(hue).base, type, deco, slot, piece: null, p: 0, hold, flash: 0, hover: 0, hoverOn: false, match: false, glow: 0, pop: deco ? 0 : 1, decoOut: 0, thread: null, up: 0, out: 0, made: keep.made ?? Date.now(), spot: keep.spot ?? Math.random(), spots: {}, snow: keep.snow ?? 0, still: keep.still ?? 0, shake: false, due: keep.due ?? null, dueS: null, dueT: 0 };
    m.dueS = dueState(m);
    m.home = api; // 이 메모가 감긴 나무
    slot.memo = m;
    build(m);
    m.thread = makeThread(slot, yarnTones(hue).base);
    memos.push(m);
    return m;
  }

  // 장식 자리: 보이는 자리 중 살짝 옆쪽을 조각마다 랜덤으로 (한 번 정하면 그 조각은 그 자리)
  const decoSpot = (m) => {
    const s = m.slot, hang = m.deco !== 'flower', key = hang ? 'hang' : 'stick';
    if (!m.spots[key]) {
      const list = s.spots(hang ? config.slots.hangDrop : 0);
      const side = list.filter((q) => Math.abs(q.k) >= config.slots.decoSide);
      const pool = side.length ? side : list;
      m.spots[key] = pool.length ? pool[Math.floor(m.spot * pool.length)] : s.deco[key];
    }
    const q = m.spots[key];
    return { decoAt: q.at, decoA: q.a };
  };
  function build(m) {
    if (m.piece) {
      tree.group.remove(m.piece);
      m.piece.traverse((o) => o.geometry?.dispose());
    }
    const s = m.slot;
    m.piece = makePiece(renderer, s.branch, { t0: s.t0, t1: s.t1, type: m.type, hue: m.hue, deco: m.deco, state: m.dueS, ...(m.deco ? decoSpot(m) : {}), under: tree.mesh.material.uniforms.uId.value });
    tree.group.add(m.piece);
    grow(m.piece, m.p, m.p >= 1 ? m.pop : 0);
  }

  /** 장식 바꾸기: 다음 장식으로. 있던 장식은 쏙 들어가고 새 장식이 톡 튀어나온다. */
  const D = config.deco;
  function nextDeco(m) {
    const next = D.order[(D.order.indexOf(m.deco) + 1) % D.order.length];
    m.deco = next;
    m.due = null; // 장식마다 날짜는 따로 (바꾸면 다시 정한다)
    m.dueS = dueState(m);
    m.decoOut = m.piece.userData.deco ? 1 : 0; // 있던 장식을 먼저 넣는다
    if (!m.decoOut) { build(m); m.pop = 0; }
    m.flash = 0.6;
    return next;
  }
  /** 장식의 날짜를 정한다 (null = 지우기). 모양이 바로 바뀌고 톡 튀어나온다 */
  function setDue(m, due) {
    m.due = due;
    m.dueS = dueState(m);
    if (m.done) { build(m); m.pop = 0; m.flash = 0.5; }
  }
  // 날짜는 0.5초마다 살핀다: 모양이 바뀔 때(피어남, 짧아짐, 깨어남)만 조각을 다시 만든다
  function dueStep(m, dt, time) {
    m.dueT -= dt;
    if (m.dueT <= 0) {
      m.dueT = 0.5;
      const old = m.dueS, s = dueState(m);
      m.dueS = s;
      if (s.key !== old?.key && m.done && !m.pulling && !m.back && m.pop >= 1 && !m.decoOut) build(m);
      if (s.ring && !old?.ring) api.onRing?.(m);
    }
    // 매 프레임: 깨어난 퐁퐁은 통통, 오늘인 꽃과 마감 하루 전 태슬은 살랑
    const d = m.piece?.userData.deco, s = m.dueS;
    if (!d || m.pop < 1 || m.decoOut || reduceMotion) return;
    const U = config.due;
    d.position.copy(d.userData.base);
    if (s.ring) {
      d.position.y += Math.abs(Math.sin(time * 6)) * U.bounce;
      m.flash = Math.max(m.flash, 0.25 + 0.2 * Math.sin(time * 6));
    }
    if (s.urgent) {
      if (m.deco === 'tassel') d.rotation.z = Math.sin(time * 7) * U.wobble;
      else d.scale.setScalar(1 + Math.sin(time * 5) * U.wobble * 0.5);
    }
  }
  /** 읽음: 깨어난 퐁퐁은 다시 잠들지 않고 알림이 끝난다 */
  function seen(m) {
    if (m.dueS?.ring) setDue(m, { ...m.due, seen: true });
  }

  // 장식 움직임 (다 짠 조각만)
  function decoStep(m, dt) {
    if (m.decoOut > 0) {
      m.decoOut = reduceMotion ? 0 : Math.max(0, m.decoOut - dt / D.outTime);
      grow(m.piece, 1, m.decoOut);
      if (m.decoOut === 0) { build(m); m.pop = 0; }
    } else if (m.pop < 1) {
      m.pop = reduceMotion ? 1 : Math.min(1, m.pop + dt / D.popTime);
      grow(m.piece, 1, m.pop);
    }
  }

  /** 누르는 동안 짜임이 바뀐다. 바뀌는 순간 반짝. */
  function setType(m, type) {
    if (m.type === type) return;
    m.type = type;
    build(m);
    m.flash = 1;
  }

  // 실: 실 꼬리 끝(밑동)에서 줄기를 타고 정면 쪽으로 붙어 올라가 슬롯 시작점까지
  function makeThread(slot, color) {
    const pts = [tail.userData.curve.getPoint(1), ...(world.walk || [])]; // 뒤 나무: 땅을 따라 그 밑동까지
    const chain = [];
    for (let b = slot.branch; b; b = b.parent) chain.unshift(b);
    const f = {}, side = new THREE.Vector3(), e = tree.group.worldToLocal(eye.clone());
    chain.forEach((b, i) => {
      const from = i === 0 ? 0.3 / b.len : 0; // 줄기는 땅 위에서부터
      const to = i === chain.length - 1 ? slot.t0 : chain[i + 1].tp;
      const n = Math.max(2, Math.ceil(((to - from) * b.len) / 0.12));
      for (let k = i === 0 ? 0 : 1; k <= n; k++) {
        const t = from + ((to - from) * k) / n;
        b.at(t, f);
        // 카메라 쪽 둘레 각도에서 표면 바로 위
        side.copy(e).sub(f.pos);
        side.addScaledVector(f.tan, -side.dot(f.tan)).normalize();
        const a = Math.atan2(side.dot(f.bin), side.dot(f.nrm));
        const p = f.pos.clone().addScaledVector(side, b.surface(t, a, f.r) + 0.03);
        pts.push(tree.group.localToWorld(p));
      }
    });
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const len = curve.getLength();
    const segs = Math.ceil(len * 30), rad = 6;
    const g = new THREE.TubeGeometry(curve, segs, config.yarnBall.thread * 0.8, rad, false);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), (uv.getX(i) * len) / 0.25);
    g.userData = { segs, rad };
    g.setDrawRange(0, 0);
    const mesh = new THREE.Mesh(g, toonMaterial({ map: threadMap, color }));
    scene.add(mesh);
    return mesh;
  }
  // 실의 보이는 구간 [a, b] (0 = 밑동, 1 = 조각)
  function threadRange(th, a, b) {
    const { segs, rad } = th.geometry.userData;
    const i0 = Math.floor(a * segs), i1 = Math.ceil(b * segs);
    th.geometry.setDrawRange(i0 * rad * 6, Math.max(0, i1 - i0) * rad * 6);
  }

  // ── 당겨 풀기 ─────────────────────────────
  // 조각을 잡고 끌면 끝 고리부터 거꾸로 풀리고, 풀린 실이 손가락까지 꼬불꼬불 늘어난다.
  const U = config.pull;
  const af = {}, aside = new THREE.Vector3(), eL = tree.group.worldToLocal(eye.clone());
  // 지금 풀리는 끝 고리의 정면 쪽 표면 (월드). dir = 바깥 방향 (월드)
  function anchor(m, out, dir) {
    const s = m.slot, t = s.t0 + (s.t1 - s.t0) * Math.max(0.002, m.p);
    s.branch.at(t, af);
    aside.copy(eL).sub(af.pos);
    aside.addScaledVector(af.tan, -aside.dot(af.tan)).normalize();
    const a = Math.atan2(aside.dot(af.bin), aside.dot(af.nrm));
    out.copy(af.pos).addScaledVector(aside, s.branch.surface(t, a, af.r) + config.knit.thick);
    if (dir) dir.copy(aside).transformDirection(tree.group.matrixWorld);
    return tree.group.localToWorld(out);
  }
  // 풀린 실: a → b. 조각에서 먼저 바깥으로 나온 뒤(줄기를 뚫지 않게) 손가락으로 휜다.
  // 가운데가 처지고, 뜨개에서 풀린 실처럼 꼬불꼬불하다.
  const pd = new THREE.Vector3(), pp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function drawYarn(y) {
    const { a, b } = y;
    const len = a.distanceTo(b);
    pd.subVectors(b, a).normalize();
    pp.crossVectors(pd, up);
    if (pp.lengthSq() < 1e-4) pp.set(1, 0, 0);
    pp.normalize();
    const n = Math.max(6, Math.ceil(len * 26)), pts = [];
    const c = a.clone().addScaledVector(y.out, Math.min(len * 0.6, U.out));
    for (let i = 0; i <= n; i++) {
      const u = i / n, bell = Math.sin(u * Math.PI);
      const p = a.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(c, 2 * u * (1 - u)).addScaledVector(b, u * u);
      p.y -= bell * len * U.sag;
      const k = Math.sin(u * len * U.kinkN * Math.PI * 2 + y.ph) * U.kink * Math.min(1, bell * 3);
      p.addScaledVector(pp, k).addScaledVector(up, k * 0.6);
      pts.push(p);
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 3, config.yarnBall.thread * 0.8, 6, false);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), (uv.getX(i) * len) / 0.25);
    y.mesh.geometry.dispose();
    y.mesh.geometry = g;
  }
  function makeYarn(m, b) {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), toonMaterial({ map: threadMap, color: m.color }));
    scene.add(mesh);
    return { mesh, a: new THREE.Vector3(), b: b.clone(), out: new THREE.Vector3(0, 0, 1), ph: m.hue * 0.1 };
  }
  function dropYarn(y) {
    scene.remove(y.mesh);
    y.mesh.geometry.dispose();
    y.mesh.material.dispose();
  }
  const winding = []; // 다 풀리고 남은 실이 실뭉치 쪽으로 감기는 중

  /** 잡기 시작 (다 짠 조각만). 장식은 쏙 들어간다. */
  function pullStart(m, at) {
    if (!m.done || m.pulling) return false;
    if (m.back) { m.back = false; } // 다시 짜이던 중이면 그 자리에서 이어서
    else { m.p = 1; m.yarn = makeYarn(m, at); }
    m.pulling = true;
    m.pop = 0;
    m.decoOut = 0;
    grow(m.piece, m.p, 0);
    return true;
  }
  /** 당긴 정도 k (0~1), 손가락 자리 at (월드) */
  function pullTo(m, k, at) {
    if (!m.pulling) return;
    m.p = 1 - Math.min(1, Math.max(0, k));
    grow(m.piece, m.p, 0);
    m.yarn.b.copy(at);
    anchor(m, m.yarn.a, m.yarn.out);
    drawYarn(m.yarn);
  }
  /** 놓음. done = 다 풀렸으면 조각을 없애고 메모를 돌려준다 (실뭉치가 된다). 아니면 다시 짜인다. */
  function pullEnd(m, done) {
    if (!m.pulling) return null;
    m.pulling = false;
    if (!done) { m.back = true; return null; }
    winding.push({ y: m.yarn, t: 0, from: m.yarn.a.clone() });
    m.yarn = null;
    remove(m);
    return m;
  }
  function remove(m) {
    m.slot.memo = null;
    m.slot = null;
    tree.group.remove(m.piece);
    m.piece.traverse((o) => o.geometry?.dispose());
    m.piece = null;
    m.done = false;
    memos.splice(memos.indexOf(m), 1);
  }
  function pullStep(m, dt) {
    // 중간에 놓았다: 실이 조각으로 되감기며 다시 짜인다
    m.p = reduceMotion ? 1 : Math.min(1, m.p + dt / U.backTime);
    grow(m.piece, m.p, 0);
    anchor(m, m.yarn.a, m.yarn.out);
    m.yarn.b.lerp(m.yarn.a, Math.min(1, dt * 12));
    drawYarn(m.yarn);
    if (m.p >= 1) { m.back = false; dropYarn(m.yarn); m.yarn = null; m.pop = 0; m.flash = 0.4; }
  }

  // 큰 실뭉치가 실을 풀어 주며 돈다 (나무 쪽으로 굴러가는 방향)
  const spinAxis = new THREE.Vector3();
  {
    const to = tree.group.position.clone().sub(ball.position).setY(0).normalize();
    spinAxis.set(to.z, 0, -to.x);
  }

  // 시간의 흔적: 다 짠 조각을 가만히 두면 눈이 쌓인다. 톡(읽기)하면 털린다.
  const T = config.trace;
  const fast = new URLSearchParams(location.search).has('fast');
  const tWait = fast ? T.fastWait : T.wait, tTime = fast ? T.fastTime : T.time;
  function traceStep(m, dt) {
    if (m.shake) {
      m.snow = Math.max(0, m.snow - dt / T.shake);
      if (!m.snow) m.shake = false;
    } else if (m.dueS?.soon) {
      m.snow = Math.max(0, m.snow - dt / T.shake); // 날짜가 다가온 조각은 눈이 쌓이지 않는다 (급한 건 또렷하게)
    } else if (m.done && !m.pulling && !m.back) {
      m.still += dt;
      if (m.still > tWait) m.snow = Math.min(1, m.snow + dt / tTime);
    }
  }
  /** 톡: 쌓인 눈이 털리고, 처음부터 다시 센다 */
  function shake(m) {
    m.still = 0;
    if (m.snow > 0) m.shake = true;
  }

  function update(time, dt) {
    for (const m of memos) {
      traceStep(m, dt);
      // 밝기: 짜임이 바뀐 순간 반짝 + 마우스를 올리면 살짝
      m.flash = Math.max(0, m.flash - dt / P.flashTime);
      m.hover += ((m.hoverOn || m.reading ? 1 : 0) - m.hover) * Math.min(1, dt * 12);
      // 찾기: 맞는 조각은 숨 쉬듯 반짝, 나머지는 종이색으로 흐려진다
      const F = config.find;
      const want = m.match ? F.glow * (1 - F.pulse * (0.5 + 0.5 * Math.cos(time * F.speed))) : searching ? F.dim : 0;
      m.glow += (want - m.glow) * Math.min(1, dt * 8);
      for (const mat of m.piece.userData.mats) {
        mat.uniforms.uFade.value = Math.max(m.flash * 0.55, m.hover * config.read.hover, m.glow, m.dueS?.checked ? 0.32 : 0);
        mat.uniforms.uCoverK.value = 1 + m.snow * T.amount;
        mat.uniforms.uFadeColor.value.set('#fffbea');
      }
      if (m.pulling) continue;
      if (m.back) { pullStep(m, dt); continue; }
      if (m.done) { decoStep(m, dt); dueStep(m, dt, time); continue; }
      // 1) 실이 밑동에서 슬롯까지 올라간다
      if (m.up < 1) {
        m.up = reduceMotion ? 1 : Math.min(1, m.up + dt / P.threadUp);
        threadRange(m.thread, 0, m.up);
        continue;
      }
      // 2) 짠다: 누르는 동안은 천천히(끝까지는 안 감), 떼면 남은 부분을 빠르게
      const old = m.p;
      if (m.hold) m.p = Math.min(P.holdCap, m.p + dt / P.holdKnit);
      else m.p = reduceMotion ? 1 : Math.min(1, m.p + dt / (m.p < P.holdCap ? P.knitTime : P.finish));
      ball.rotateOnWorldAxis(spinAxis, (m.p - old) * P.ballSpin);
      grow(m.piece, m.p, 0);
      // 3) 다 짰으면 실이 조각 속으로 감겨 들어간다 (밑동 쪽부터 사라짐)
      if (m.p >= 1) {
        m.out = reduceMotion ? 1 : Math.min(1, m.out + dt / P.threadOut);
        threadRange(m.thread, m.out, 1);
        if (m.out >= 1) {
          scene.remove(m.thread);
          m.thread.geometry.dispose();
          m.thread = null;
          m.done = true;
          api.onDone?.(m);
        }
      }
    }
    // 남은 실이 실뭉치로 감겨 들어간다 (조각 쪽 끝이 손가락 쪽으로)
    for (const w of winding.slice()) {
      w.t = reduceMotion ? 1 : Math.min(1, w.t + dt / U.windTime);
      w.y.a.lerpVectors(w.from, w.y.b, w.t * w.t);
      if (w.t < 1) drawYarn(w.y);
      else { dropYarn(w.y); winding.splice(winding.indexOf(w), 1); }
    }
    // 빈 자리가 없을 때: 나무가 살짝 떤다
    if (tremble > 0) {
      tremble = Math.max(0, tremble - dt);
      const k = tremble / P.trembleTime;
      tree.group.rotation.z = Math.sin(time * 70) * P.trembleAmp * k;
    }
  }

  // 조각의 가운데(월드)와 굵기
  const cf = {};
  function center(m, out) {
    if (m.loose) { out.copy(m.ball.wrap.position); return config.balls.r; } // 땅의 작은 실뭉치
    const s = m.slot;
    s.branch.at((s.t0 + s.t1) / 2, cf);
    out.copy(cf.pos);
    tree.group.localToWorld(out);
    return cf.r + 0.05;
  }
  // 광선에 맞은 물체 → 그 조각의 메모
  function byObject(o) {
    return memos.find((m) => { let hit = false; m.piece.traverse((x) => { if (x === o) hit = true; }); return hit; }) || null;
  }

  // 찾기: 글에 q가 들어간 메모에 표시. 몇 개인지 돌려준다.
  let lastQ = '';
  function find(q) {
    lastQ = q;
    q = q.trim().toLowerCase();
    let n = 0;
    searching = !!q;
    for (const m of memos) {
      m.match = !!q && m.text.toLowerCase().includes(q);
      if (m.match) n++;
    }
    return n;
  }

  // ── 저장과 복원 ──
  // 저장할 것: 글, 색, 짜임, 장식과 그 자리, 슬롯 번호, 만든 시각, 흔적
  const dump = () => memos.map((m) => ({ text: m.text, hue: m.hue, type: m.type, deco: m.deco, due: m.due, slot: m.slot.id, made: m.made, spot: m.spot, snow: m.snow, still: m.still }));
  /** 저장한 조각을 다 짠 상태로 바로 놓는다. away = 닫아 둔 시간(초). 자리가 없으면 돌려준다 */
  function load(list, away) {
    const left = [];
    for (const d of list) {
      const slot = slots.find((s) => s.id === d.slot && !s.memo) || nextFree();
      if (!slot) { left.push(d); continue; }
      const m = start(slot, d.text, d.hue, d.type, false, { deco: d.deco, due: d.due, made: d.made, spot: d.spot, snow: d.snow, still: (d.still || 0) + away });
      scene.remove(m.thread);
      m.thread.geometry.dispose();
      m.thread = null;
      m.p = m.up = m.out = 1;
      m.pop = 1;
      m.done = true;
      grow(m.piece, 1, 1);
      // 닫아 둔 동안 쌓였을 눈
      const over = Math.max(0, m.still - Math.max(d.still || 0, tWait));
      m.snow = Math.min(1, m.snow + over / tTime);
    }
    return left;
  }

  const api = {
    tree, // 이 메모들이 감긴 나무
    dump, load, shake, setDue, seen, onRing: null,
    // 색으로 모아 보기: 물레를 돌리는 동안 바늘 색과 가까운 조각만 밝게. null → 글 찾기로 돌아간다
    findHue(h) {
      if (h === null) return find(lastQ);
      let n = 0;
      searching = true;
      for (const m of memos) {
        const d = Math.abs(((m.hue - h + 540) % 360) - 180);
        m.match = d <= config.find.hueRange;
        if (m.match) n++;
      }
      return n;
    },
    memos, update, start, setType, find, nextDeco, pullStart, pullTo, pullEnd, nearest, nextFree, pick, preview, clearPreview, center, byObject, onDone: null,
    release(m) { m.hold = false; },
    tremble() { tremble = P.trembleTime; },
  };
  return api;
}
