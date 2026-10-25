// 작은 실뭉치 = 지운 메모. 땅 위를 굴러다니고 서로 부딪힌다.
// 물리는 위에서 본 2D (Matter.js): Matter (x, y) = 땅 (x, z). 그리는 건 3D 실뭉치.
// 나무 밑동에 닿도록 굴려 보내면 실이 나무를 타고 올라가 다시 짜인다.
import * as THREE from 'three';
import { config, reduceMotion } from './config.js';
import { yarnBall } from './scene.js';
import { toonMaterial } from './toon.js';

const fast = new URLSearchParams(location.search).has('fast'); // 발표용: 눈이 빨리 쌓인다

const S = 100; // 월드 1 = Matter 100
const STEP = 1000 / 60;

export function makeBalls(renderer, scene, world) {
  const B = config.balls;
  const F = B.feels[B.feel];
  const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;
  const engine = Engine.create({ gravity: { x: 0, y: 0 }, enableSleeping: true });
  const list = [];
  const R = B.r;

  // 움직이지 않는 것: 지금 화면(쪽)에 선 나무들의 밑동과 큰 실뭉치
  function bodiesOf(t) {
    if (t.bodies) return t.bodies;
    const trunk = t.tree.branches[0], root = t.tree.group.position.clone();
    const r = trunk.radius(0.3 / trunk.len) * 1.15;
    t.root = root;
    t.trunkR = r;
    t.bodies = [
      Bodies.circle(root.x * S, root.z * S, r * S, { isStatic: true, label: 'trunk' }),
      ...(t.ownBall ? [Bodies.circle(t.ball.position.x * S, t.ball.position.z * S, config.yarnBall.r * 0.95 * S, { isStatic: true })] : []),
    ];
    return t.bodies;
  }
  let shownKey = '';
  function syncTrees() {
    const shown = world.shown, key = shown.map((t) => world.trees.indexOf(t)).join(',');
    if (key === shownKey) return;
    shownKey = key;
    for (const t of world.trees) if (t.bodies) Composite.remove(engine.world, t.bodies);
    for (const t of shown) Composite.add(engine.world, bodiesOf(t));
  }
  // 바구니: 간직하고 싶은 실뭉치만 넣는다. 넣은 것은 스며들지 않는다.
  const K = config.basket;
  const bpos = new THREE.Vector3(K.at[0], 0, K.at[1]);
  const bask = Bodies.circle(bpos.x * S, bpos.z * S, K.r * S, { isStatic: true, label: 'basket' });
  // 담기는 자리: 바닥 5개 → 그 위 4개 → 맨 위 3개 (위로 갈수록 테두리 위로 봉긋)
  const seats = [];
  const ring = (n, rr, y, a0) => { for (let i = 0; i < n; i++) seats.push(new THREE.Vector3(Math.cos(a0 + (i / n) * 6.283) * rr, y, Math.sin(a0 + (i / n) * 6.283) * rr)); };
  // 바구니 속은 실로 반쯤 차 있다고 치고 높게 → 담긴 실뭉치가 테두리 위로 봉긋 보인다
  const fl = K.h * K.fill;
  seats.push(new THREE.Vector3(0, R + fl + 0.02, 0));
  ring(4, K.r * 0.45, R + fl, 0.4);
  ring(4, K.r * 0.32, R + fl + 0.17, 1.2);
  ring(3, K.r * 0.16, R + fl + 0.3, 0.1);
  // 바구니에 든 것 (최근 것부터 보이는 자리 12개에, 나머지는 바구니 속 아래에 묻혀 창에서만 보인다)
  const kept = [];
  function reseat() {
    kept.sort((a, b) => b.keptAt - a.keptAt);
    kept.forEach((b, i) => { b.seat = i; b.wrap.visible = i < seats.length; });
  }
  const unkeep = (b) => { const i = kept.indexOf(b); if (i >= 0) kept.splice(i, 1); b.m.kept = false; reseat(); };
  Composite.add(engine.world, [bask]);
  syncTrees();

  // 땅 가장자리 (화면 크기에 맞춰 layout에서 다시 만든다)
  let walls = [];
  const box = { x0: -4, x1: 4, z0: -3, z1: 2 };
  const ray = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const v = new THREE.Vector3(), nd = new THREE.Vector2();
  function onGround(x, y, camera, out) {
    ray.setFromCamera(nd.set(x, y), camera);
    return ray.ray.intersectPlane(ground, out);
  }
  function layout(camera, placeBasket = true) {
    // 바구니: 화면 비율에 맞는 자리로 (가로는 밑동과 앞 꽃 사이, 세로는 오른쪽). 첫 나무 앞에서 정한다
    const at = K.screen[camera.aspect < 1 ? 'port' : 'land'];
    if (placeBasket && onGround(at[0], at[1], camera, v)) {
      bpos.set(v.x, 0, v.z);
      Body.setPosition(bask, { x: bpos.x * S, y: bpos.z * S });
      world.basket?.position.set(bpos.x, 0, bpos.z);
    }
    if (!onGround(0, B.nearY, camera, v)) return;
    box.z1 = v.z;
    onGround(B.sideX, B.nearY, camera, v);
    // 땅은 쪽 전체 (나란한 나무들 앞까지). 시점이 옆걸음해 있어도 같은 땅
    const px = world.panNow || 0, TR = config.trees;
    box.x1 = v.x - px;
    box.x0 = -(v.x - px);
    box.z0 = B.far;
    Composite.remove(engine.world, walls);
    const t = 2 * S, cx = (box.x0 + box.x1) / 2 * S, cz = (box.z0 + box.z1) / 2 * S;
    const w = (box.x1 - box.x0) * S, d = (box.z1 - box.z0) * S;
    const o = { isStatic: true, restitution: 0.3 };
    walls = [
      Bodies.rectangle(cx, box.z0 * S - t / 2, w + t * 2, t, o),
      Bodies.rectangle(cx, box.z1 * S + t / 2, w + t * 2, t, o),
      Bodies.rectangle(box.x0 * S - t / 2, cz, t, d + t * 2, o),
      Bodies.rectangle(box.x1 * S + t / 2, cz, t, d + t * 2, o),
    ];
    // 앞 모서리 잎과 꽃 덤불이 덮는 땅 (그 뒤로 숨지 않게)
    for (const [x, y, r] of B.corners) {
      for (const sx of [-1, 1]) {
        if (onGround(x * sx, y, camera, v)) walls.push(Bodies.circle(v.x * S, v.z * S, r * S, o));
      }
    }
    Composite.add(engine.world, walls);
    // 바뀐 경계 밖에 있던 실뭉치는 안으로
    for (const b of list) if (b.body) Body.setPosition(b.body, inside(b.body.position.x / S, b.body.position.y / S));
  }
  const inside = (x, z) => ({
    x: THREE.MathUtils.clamp(x, box.x0 + R, box.x1 - R) * S,
    y: THREE.MathUtils.clamp(z, box.z0 + R, box.z1 - R) * S,
  });

  /** 다 풀린 메모 → 손가락 자리(at)에서 실뭉치로 감기고 땅으로 툭 떨어진다 */
  function add(m, at) {
    const wrap = new THREE.Group(); // 찌그러짐 (구르지 않는다)
    const ball = yarnBall(renderer, R, m.color, B.cover); // 구르는 회전
    const mats = [];
    ball.traverse((o) => o.material && mats.push(o.material));
    wrap.add(ball);
    wrap.position.copy(at);
    wrap.scale.setScalar(0.01);
    scene.add(wrap);
    const b = { m, wrap, ball, body: null, state: 'wind', t: 0, vy: 0, hit: 0, hitA: 0, held: null, born: performance.now(), snow: 0, still: 0, rush: false, mound: null, fresh: true };
    b.mats = mats;
    m.loose = true;
    m.ball = b;
    list.push(b);
    // 너무 많으면 가장 오래된 것부터 빨리 눈에 묻힌다
    const live = list.filter((x) => x.state === 'roll' || x.state === 'fall' || x.state === 'wind');
    if (live.length > B.max) { live[0].rush = true; live[0].still = Infinity; }
    return b;
  }
  function makeBody(b) {
    const p = inside(b.wrap.position.x, b.wrap.position.z);
    b.body = Bodies.circle(p.x, p.y, R * S, { frictionAir: F.frictionAir, restitution: F.restitution, density: F.density, friction: 0.02 });
    b.body.ball = b;
    Composite.add(engine.world, b.body);
  }
  function drop(b) {
    if (b.body) Composite.remove(engine.world, b.body);
    b.body = null;
  }
  function kill(b) {
    scene.remove(b.wrap);
    b.wrap.traverse((o) => o.geometry?.dispose());
    if (b.mound) { scene.remove(b.mound); b.mound.geometry.dispose(); }
    list.splice(list.indexOf(b), 1);
  }

  // ── 눈에 묻히기 ──
  const Z = B.bury, wait = fast ? Z.fastWait : Z.wait, deep = fast ? Z.fastTime : Z.time;
  const moundMat = toonMaterial({ color: '#f8f7fd', cover: 1 });
  function snowStep(b, dt) {
    if (b.held || (b.body && b.body.speed > 0.6)) b.still = 0; // 움직이는 동안은 쌓이지 않는다
    if (b.shake) {
      // 털림: 눈이 빠르게 떨어진다
      b.snow = Math.max(0, b.snow - dt / Z.shake);
      if (b.snow === 0) b.shake = false;
    } else {
      b.still += dt;
      if (b.still > wait || b.rush) b.snow = Math.min(1, b.snow + (dt / deep) * (b.rush ? Z.rush : 1));
    }
    // 눈이 위에서부터 덮이고, 실뭉치는 눈 속으로 가라앉고, 둘레에 눈 둔덕이 솟는다
    for (const m of b.mats) m.uniforms.uCoverK.value = B.cover + b.snow * 3.8;
    if (b.snow > 0 && !b.mound) {
      b.mound = new THREE.Mesh(new THREE.SphereGeometry(R * 1.35, 24, 12, 0, 6.283, 0, Math.PI / 2), moundMat);
      b.mound.receiveShadow = true;
      scene.add(b.mound);
    }
    if (b.mound) {
      b.mound.position.set(b.wrap.position.x, 0, b.wrap.position.z);
      b.mound.scale.set(0.4 + b.snow * 0.75, Math.max(0.01, b.snow * 1.05), 0.4 + b.snow * 0.75);
      b.mound.visible = b.snow > 0.01;
    }
    if (b.body) b.body.frictionAir = F.frictionAir + b.snow * 0.3; // 묻힐수록 덜 구른다
    // 다 묻혔다 → 실뭉치는 사라지고 둔덕만 남아 녹는다
    if (b.snow >= 1) { drop(b); b.state = 'melt'; b.t = 0; b.wrap.visible = false; }
  }
  /** 톡 / 잡기: 쌓인 눈이 털린다 */
  function shake(b) {
    b.still = 0;
    b.rush = false;
    if (b.snow > 0) b.shake = true;
  }

  // 부딪히면 살짝 찌그러진다
  Events.on(engine, 'collisionStart', (ev) => {
    for (const { bodyA, bodyB, collision } of ev.pairs) {
      for (const [me, other] of [[bodyA, bodyB], [bodyB, bodyA]]) {
        const b = me.ball;
        if (!b) continue;
        const sp = Math.hypot(me.velocity.x - other.velocity.x, me.velocity.y - other.velocity.y);
        b.hit = Math.max(b.hit, Math.min(1, sp / 12));
        b.hitA = Math.atan2(collision.normal.y, collision.normal.x);
      }
    }
  });

  // 밑동으로 (t = 놓은 나무, 없으면 지금 나무): 빈 자리가 있으면 실이 되어 들어가고, 없으면 옆에 내려놓인다
  function goHome(b, t = world.trees[world.active]) {
    bodiesOf(t);
    const slot = t.memos.nextFree();
    if (!slot) { t.memos.tremble(); putDown(b, 0.5); return; } // 빈 자리가 없다: 나무가 떨고 실뭉치는 옆에 내려놓인다
    b.homeTree = t;
    drop(b);
    b.state = 'home';
    b.t = 0;
    b.slot = slot;
    slot.memo = b; // 자리를 먼저 맡아 둔다 (다른 실뭉치가 같은 자리로 오지 않게)
    b.from = b.wrap.position.clone();
  }

  // 바구니로: 빈 자리가 있으면 쏙 들어가고, 꽉 찼으면 튕겨 나온다
  function goBasket(b) {
    if (kept.length >= K.maxKeep) { putDown(b, K.r + R + 0.1); return; } // 꽉 찼다: 바구니 앞에 내려놓인다
    drop(b);
    b.keptAt = Date.now();
    kept.push(b);
    reseat();
    b.state = 'in';
    b.t = 0;
    b.from = b.wrap.position.clone();
    b.m.kept = true;
    b.keptAt = Date.now();
    api.onKeep?.(b);
  }
  const seatAt = (i, out) => out.copy(seats[Math.min(i, seats.length - 1)]).add(bpos).setY(i < seats.length ? seats[i].y : 0); // 넘치는 것은 바구니 속 아래

  const unpick = (b) => { b.pick = false; for (const m of b.mats) m.uniforms.uFade.value = 0; };
  // ── 바구니 창에서 ──
  const keptList = () => kept.slice(); // 최근에 넣은 것부터
  // 버리기: 바구니에서 아예 지운다
  function discard(b) { if (!kept.includes(b)) return; unkeep(b); unpick(b); kill(b); }
  // 다시 짜기: 바구니에서 나와 밑동으로 → 나무에. 빈 자리가 없으면 false
  function restore(b) {
    if (b.state !== 'kept' || !api.memos.nextFree()) return false;
    unkeep(b);
    unpick(b);
    goHome(b);
    return true;
  }
  // 꺼내기: 바구니 앞 땅에 내려놓는다
  function takeOut(b) {
    if (b.state !== 'kept') return;
    unkeep(b);
    unpick(b);
    b.wrap.position.set(bpos.x, K.h + R + 0.2, bpos.z);
    putDown(b, K.r + R + 0.12);
  }
  // 화면에서 누른 곳이 바구니인지 (바구니 몸통 또는 담긴 실뭉치)
  function hitBasket(r) {
    return !!world.basket && r.intersectObject(world.basket, true).length > 0;
  }

  // ── 들어서 옮기기 ──
  // 잡으면 땅 위로 살짝 떠서 손가락을 따라온다. 바구니 위에서 놓으면 담기고, 밑동 위에서 놓으면 다시 짜이고,
  // 빈 땅에서 놓으면 그 자리에 톡 내려앉는다.
  const lift = new THREE.Plane(new THREE.Vector3(0, 1, 0), -B.liftY);
  function hold(b) {
    if (b.state === 'kept' || b.state === 'in') { unkeep(b); unpick(b); b.wrap.visible = true; }
    else if (b.state !== 'roll') return false;
    shake(b);
    drop(b); // 들고 있는 동안은 다른 실뭉치와 부딪히지 않는다
    b.state = 'lift';
    b.held = b.wrap.position.clone().setY(B.liftY);
    b.over = null;
    return true;
  }
  function move(b, camera, x, y) {
    if (!b.held) return;
    ray.setFromCamera(nd.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
    // 손가락 아래가 바구니인지, 밑동인지 (그 자리의 땅은 그 뒤쪽이라 그림으로 판단한다)
    const hb = world.basket && ray.intersectObject(world.basket, true)[0];
    // 화면에 선 나무 중 손가락 아래 밑동
    let ht = null;
    if (!hb) for (const t of world.shown) {
      const h = ray.intersectObject(t.tree.mesh, false)[0];
      if (h && (!ht || h.distance < ht.distance)) { ht = h; b.homeTree = t; }
    }
    // 땅 위에서 맞은 밑동만 (광선이 땅을 뚫고 땅속 뿌리에 맞는 것은 빼고)
    b.over = hb ? 'basket' : ht && ht.point.y > 0.02 && ht.point.y < B.homeY ? 'home' : null;
    if (b.over === 'basket') { b.held.set(bpos.x, K.h + R + 0.25, bpos.z); return; }
    if (ray.ray.intersectPlane(lift, v)) {
      const p = inside(v.x, v.z);
      b.held.set(p.x / S, B.liftY, p.y / S);
    }
  }
  function release(b) {
    if (!b.held) return;
    const over = b.over;
    b.held = null;
    b.over = null;
    if (over === 'basket') return goBasket(b);
    if (over === 'home') { b.from = b.wrap.position.clone(); return goHome(b, b.homeTree); }
    putDown(b, 0);
  }
  // 지금 자리에서 땅으로 내려놓는다 (push: 바구니/밑동에서 이만큼 앞으로 비켜서)
  function putDown(b, push) {
    drop(b);
    if (push) b.wrap.position.z += push;
    b.state = 'fall';
    b.vy = 0;
  }

  // 화면에서 누른 자리의 실뭉치
  function hit(r) {
    const live = list.filter((b) => b.body || (b.state === 'kept' && b.wrap.visible));
    const h = r.intersectObjects(live.map((b) => b.wrap), true)[0];
    return h ? live.find((b) => { let ok = false; b.wrap.traverse((o) => { if (o === h.object) ok = true; }); return ok; }) : null;
  }

  // 들고 바구니 위에 오면 바구니가 살짝 밝아진다 (여기 놓으면 담긴다)
  const baskMats = [];
  world.basket?.traverse((o) => o.material && !baskMats.includes(o.material) && baskMats.push(o.material));
  let glow = 0;

  let acc = 0;
  const last = new THREE.Vector3(), axis = new THREE.Vector3();
  function update(time, dt) {
    const want = list.some((b) => b.state === 'lift' && b.over === 'basket') ? 0.3 : 0;
    glow += (want - glow) * Math.min(1, dt * 10);
    for (const m of baskMats) { m.uniforms.uFade.value = glow; m.uniforms.uFadeColor.value.set('#fffbea'); }
    syncTrees();
    acc = Math.min(acc + dt * 1000, STEP * 3);
    while (acc >= STEP) { Engine.update(engine, STEP); acc -= STEP; }

    for (const b of list.slice()) {
      const w = b.wrap;
      last.copy(w.position);
      if (b.state === 'wind') {
        // 남은 실이 감기며 커진다
        b.t = reduceMotion ? 1 : Math.min(1, b.t + dt / config.pull.windTime);
        w.scale.setScalar(Math.max(0.01, b.t));
        b.ball.rotation.y += dt * 14;
        if (b.t >= 1) { b.state = 'fall'; b.vy = 0; }
      } else if (b.state === 'lift') {
        // 손가락 아래로 부드럽게 따라온다 (살짝 흔들리며)
        w.position.lerp(b.held, Math.min(1, dt * 16));
        w.position.y += Math.sin(time * 6) * 0.004;
      } else if (b.state === 'fall') {
        // 땅으로 툭 (한 번 통 튄다)
        b.vy -= B.fall * dt;
        w.position.y += b.vy * dt;
        if (w.position.y <= R) {
          w.position.y = R;
          if (b.vy < -2) { b.vy *= -0.28; b.hit = 0.8; b.hitA = 'down'; }
          else {
            b.state = 'roll';
            makeBody(b);
            if (b.fresh) { b.fresh = false; api.onLand?.(b); } // 처음 떨어질 때만 (바구니 힌트)
          }
        }
      } else if (b.state === 'roll') {
        if (b.body) w.position.set(b.body.position.x / S, R - b.snow * R * 0.9, b.body.position.y / S);
        if (b.state === 'roll') snowStep(b, dt);
      } else if (b.state === 'home') {
        // 밑동 쪽으로 빨려 들며 작아진다 → 다 들어가면 실이 나무를 타고 올라가 짜인다
        b.t = reduceMotion ? 1 : Math.min(1, b.t + dt / B.homeTime);
        const e = b.t * b.t;
        const rt = b.homeTree.root;
        w.position.lerpVectors(b.from, v.set(rt.x, R * 0.6, rt.z), e);
        w.scale.setScalar(Math.max(0.01, 1 - e));
        if (b.t >= 1) {
          kill(b);
          b.slot.memo = null;
          const m = b.m;
          m.loose = false;
          m.ball = null;
          const back = b.homeTree.memos.start(b.slot, m.text, m.hue, m.type, false, { deco: m.deco, due: m.due, made: m.made });
          api.onHome?.(back);
          continue;
        }
      } else if (b.state === 'in') {
        // 통 튀어 올랐다가 바구니 자리에 쏙
        b.t = reduceMotion ? 1 : Math.min(1, b.t + dt / K.hopTime);
        seatAt(b.seat, v);
        w.position.lerpVectors(b.from, v, b.t);
        w.position.y += Math.sin(b.t * Math.PI) * 0.45;
        if (b.t >= 1) { b.state = 'kept'; b.hit = 0.7; b.hitA = 'down'; }
      } else if (b.state === 'kept') {
        seatAt(b.seat, w.position);
        // 바구니 창에서 고른 실뭉치는 숨 쉬듯 반짝
        const g = b.pick ? 0.25 + 0.2 * Math.sin(time * 5) : 0;
        for (const m of b.mats) { m.uniforms.uFade.value = g; m.uniforms.uFadeColor.value.set('#fffbea'); }
      } else if (b.state === 'melt') {
        // 다 묻혔다: 눈 둔덕이 천천히 녹아 낮아진다 (그 메모는 눈 속으로)
        b.t = reduceMotion ? 1 : Math.min(1, b.t + dt / Z.melt);
        if (b.mound) b.mound.scale.y = Math.max(0.01, 1.05 * (1 - b.t));
        if (b.t >= 1) { kill(b); continue; }
      }
      // 굴러간 거리만큼 실제로 구른다
      const dx = w.position.x - last.x, dz = w.position.z - last.z, d = Math.hypot(dx, dz);
      if (d > 1e-5 && b.state !== 'home') {
        axis.set(dz, 0, -dx).divideScalar(d);
        b.ball.rotateOnWorldAxis(axis, d / R);
      }
      // 찌그러짐: 부딪힌 방향으로 납작해졌다가 돌아온다
      if (b.hit > 0.001) {
        b.hit = Math.max(0, b.hit - dt * 4);
        const s = b.hit * 0.22;
        if (b.hitA === 'down') w.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5); // 땅에 떨어질 때는 위아래로
        else { w.rotation.y = -b.hitA; w.scale.set(1 - s, 1 + s * 0.5, 1 + s * 0.5); }
      } else if (b.state === 'lift') w.scale.setScalar(1.08); // 들면 살짝 커 보인다 (가까워진 느낌)
      else if (b.state === 'roll' || b.state === 'fall' || b.state === 'kept') w.scale.setScalar(1);
    }
  }

  // ── 저장과 복원 ──
  // 땅의 것은 자리와 눈, 바구니의 것은 자리 번호. 움직이는 중인 것은 지금 자리로
  function dump() {
    const out = [];
    for (const b of list) {
      if (b.state === 'melt' || b.state === 'home') continue;
      const m = b.m, w = b.wrap.position;
      const d = { text: m.text, hue: m.hue, color: m.color, type: m.type, deco: m.deco, due: m.due, made: m.made };
      if (b.state === 'kept' || b.state === 'in') Object.assign(d, { seat: b.seat, keptAt: b.keptAt });
      else Object.assign(d, { x: +w.x.toFixed(3), z: +w.z.toFixed(3), snow: +b.snow.toFixed(4), still: Math.round(b.still) });
      out.push(d);
    }
    return out;
  }
  /** 저장한 실뭉치를 그 자리에 바로 놓는다. away = 닫아 둔 시간(초) */
  function load(arr, away) {
    for (const d of arr) {
      const m = { text: d.text, hue: d.hue, color: d.color, type: d.type, deco: d.deco, due: d.due, made: d.made };
      const b = add(m, new THREE.Vector3(d.x ?? bpos.x, R, d.z ?? bpos.z + K.r + R));
      b.fresh = false;
      b.wrap.scale.setScalar(1);
      if (d.seat !== undefined) {
        Object.assign(b, { keptAt: d.keptAt || 0, state: 'kept' });
        kept.push(b);
        m.kept = true;
        reseat();
        continue;
      }
      b.state = 'roll';
      makeBody(b);
      // 닫아 둔 동안 쌓였을 눈 (가만히 있던 시간이 wait을 넘은 만큼)
      const s0 = d.still || 0, s1 = s0 + away;
      b.snow = Math.min(1, (d.snow || 0) + Math.max(0, s1 - Math.max(s0, wait)) / deep);
      b.still = s1;
    }
  }

  const api = {
    dump, load,
    list, add, hit, hold, move, release, update, layout, shake, keptList, restore, takeOut, hitBasket, discard, onHome: null, onKeep: null, onLand: null,
    basketAt: bpos,
    get count() { return list.length; },
  };
  return api;
}
