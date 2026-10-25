// 장면 층 구성: 맨 뒤(하늘) / 뒤(덤불, 실패, 바늘꽂이, 먼 나무) / 가운데(메모 나무, 바닥, 큰 실뭉치) / 맨 앞(뜨개 잎, 단추 꽃, 덩굴)
import * as THREE from 'three';
import { config, isDebug } from './config.js';
import { makeRandom } from './random.js';
import { shared, toonMaterial } from './toon.js';
import { groundTex, wrapTex, yarnTex } from './craftTex.js';
import { makeBark } from './bark.js';
import { growTree } from './tree.js';
import { makeTreeMesh } from './treeMesh.js';
import { knitLeaf, buttonFlower, pompomBush, spool, pincushion, needle, basket } from './crafts.js';
import { makeParticles } from './particles.js';
import { makeSlots, slotMarkers } from './slots.js';
import { makeMemos } from './memos.js';
import { makeBalls } from './balls.js';

export function makeScene(renderer, scene, opt) {
  const S = config.seasons[config.season];
  const rand = makeRandom(config.seed + 100);
  const far = S.sky[1];

  // 맨 뒤: 하늘 (화면에 고정된 색연필 그라데이션)
  scene.background = skyTexture(S.sky);

  // 눈/이끼 쌓임
  shared.uCover.value = S.cover;
  shared.uCoverColor.value.set(S.coverColor);
  shared.uCoverShade.value.set(S.coverShade);

  // 해 (그림자를 만드는 용도. 명암 색은 툰 셰이더가 정한다)
  const sun = new THREE.DirectionalLight('#ffffff', 1);
  sun.position.set(...config.look.sunDir).normalize().multiplyScalar(20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 2;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  const sc = sun.shadow.camera;
  sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 50;
  sun.target.position.set(0, 0, -2);
  scene.add(sun, sun.target);

  // 가운데: 바닥 (색면 + 바느질 땀)
  const gmap = groundTex(renderer, { base: S.ground, thread: S.thread, seed: 3 });
  const gg = new THREE.PlaneGeometry(140, 90);
  gg.rotateX(-Math.PI / 2);
  gg.translate(0, 0, -30);
  const uv = gg.attributes.uv, gp = gg.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, gp.getX(i) / 7, gp.getZ(i) / 7); // 땀 크기가 일정하도록 월드 기준
  const ground = new THREE.Mesh(gg, toonMaterial({ map: gmap, ink: 0.8 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // 가운데: 메모 나무들. 정원 한 화면(쪽)에 나란히 최대 3그루. 꽉 차면 옆에 새 나무가 자라고, 그 이상은 다음 쪽으로 넘긴다.
  // 나무마다 제 큰 실뭉치와 실 꼬리가 있다. 시점은 지금 나무 쪽으로 옆걸음한다.
  const style = { ...config.tree.styles[config.tree.pick], prune: config.tree.twigs[config.tree.twig] };
  const bark = makeBark(renderer);
  const home = new THREE.Vector3(0.2, 0, 0);
  const Y = config.yarnBall;
  const spot = Y.spots[Y.pick];
  const TR = config.trees;
  const pages = [];
  const trees = [];
  const pageOf = (i) => Math.floor(i / TR.perPage);
  const spotOf = (i) => TR.spots[i % TR.perPage]; // 쪽 안 자리: 앞 가운데, 뒤 왼쪽, 뒤 오른쪽
  function growOne(i) {
    const p = pageOf(i);
    if (!pages[p]) { pages[p] = new THREE.Group(); pages[p].visible = p === 0; scene.add(pages[p]); }
    const page = pages[p], [x, z] = spotOf(i), lead = i % TR.perPage === 0;
    const firstT = trees[p * TR.perPage]; // 이 쪽의 앞 나무
    // 뒤 나무는 잔가지를 많이 덜어 낸 단순한 실루엣 (화면이 복잡해지지 않게)
    const branches = growTree(lead ? style : { ...style, prune: TR.backPrune }, (opt.seed || style.seed) + i * TR.seedStep);
    // 뒤 나무는 한 톤 어둡게 (앞 나무가 먼저 보이고, 깊이가 생긴다)
    const col = lead ? S.tree : '#' + new THREE.Color(S.tree).multiply(new THREE.Color(TR.backTint)).getHexString();
    const tree = makeTreeMesh(branches, bark, { color: col });
    tree.branches = branches;
    // 뒤 나무: 윤곽선은 가늘게(번호 + 2 → 후처리가 가는 선으로), 껍질 결 선도 옅게
    if (!lead) { const u = tree.mesh.material.uniforms; u.uId.value += 2; u.uInkK.value *= TR.backInk; }
    tree.group.position.set(home.x + x, 0, home.z + z);
    tree.group.rotation.y = lead ? 0 : (i % 2 ? 0.9 : -1.3); // 뒤 나무는 다른 쪽을 보여 준다
    page.add(tree.group);
    page.updateMatrixWorld(true);
    // 슬롯: 정면 카메라에서 보이는 가지에만. 뒤 나무는 앞 나무에 가리지 않고, 앞 나무 조각과 겹치지 않는 곳만
    const eye = new THREE.Vector3(0, config.camera.lookY, 14);
    const same = trees.filter((t) => t.page === p);
    const slots = makeSlots(branches, tree.mesh, eye, same.map((t) => t.tree.mesh), same.flatMap((t) => t.slots));
    if (isDebug) tree.group.add(slotMarkers(slots));
    // 큰 실뭉치 + 실 꼬리: 앞 나무에만. 뒤 나무의 실은 앞 나무 밑동에서 땅을 따라 뒤로 간다
    if (!lead) {
      const end = firstT.tail.userData.curve.getPoint(1), lie = Y.thread * 0.9;
      const base = tree.group.position, tr = branches[0].radius(0.3 / branches[0].len) * 1.1;
      const to = new THREE.Vector3(base.x - end.x, 0, base.z - end.z).normalize();
      const walk = [
        new THREE.Vector3(end.x - 0.25, lie, end.z + 0.35),
        new THREE.Vector3((end.x + base.x) / 2 + (base.x < 0 ? -1.2 : 1.2), lie, (end.z + base.z) / 2 + 0.6),
        new THREE.Vector3(base.x - to.x * tr, lie, base.z - to.z * tr + 0.2),
      ];
      return { tree, slots, ball: firstT.ball, tail: firstT.tail, walk, eye, x: 0, page: p };
    }
    const ball = yarnBall(renderer, Y.r, world?.yarnColor || S.thread[1]);
    ball.position.set(spot[0] + x, Y.r * 0.92, spot[1] + z);
    page.add(ball);
    const tail = threadTail(renderer, ball.position, Y.r, tree, world?.yarnColor || S.thread[1], makeRandom(config.seed + 9 + i));
    page.add(tail);
    return { tree, slots, ball, tail, eye, x: 0, page: p, ownBall: true };
  }
  let world = null;
  const first = growOne(0);
  const tree = first.tree;

  // 가운데: 바구니 (간직하고 싶은 작은 실뭉치를 넣는다)
  const K = config.basket;
  const bask = basket(renderer, K);
  bask.position.set(K.at[0], 0, K.at[1]);
  scene.add(bask);

  // 뒤: 털실 방울 덤불, 실패, 바늘꽂이, 바늘
  const back = new THREE.Group();
  const B = config.back[config.back.pick];
  const bushes = B.bushes;
  for (const [x, z, s] of bushes) {
    const fade = THREE.MathUtils.clamp((-z - 5) / 30, 0, 0.55);
    const b = pompomBush(renderer, { count: 9, r: 0.55 * s, spread: 1.6 * s, colors: S.bush, fade, fadeColor: far }, rand);
    b.position.set(x, 0, z);
    back.add(b);
  }
  const sp1 = spool(renderer, { r: 0.42, h: 1.0, wood: '#f2dcae', thread: S.thread[0] });
  sp1.position.set(-6.0, 0, -2.4); // 뒤 왼쪽 나무 자리를 비킨다
  const sp2 = spool(renderer, { r: 0.32, h: 0.75, wood: '#f2dcae', thread: S.thread[3] });
  sp2.position.set(-5.3, 0, -3.3);
  sp2.rotation.y = 0.5;
  const sp3 = spool(renderer, { r: 0.5, h: 1.25, wood: '#efd6a4', thread: S.thread[2], fade: 0.25, fadeColor: far });
  sp3.position.set(9.5, 0, -11);
  const pc = pincushion(renderer, { r: 0.75, color: '#e9a3b2', pins: 9, heads: ['#a7b6ec', '#fff0b0', '#ffffff'], fade: 0.15, fadeColor: far }, rand);
  pc.position.set(6.6, 0, -4.2);
  const nd = needle(renderer, { len: 2.4, tilt: -0.35, thread: S.thread[1] });
  nd.position.set(2.8, 0, -1.2);
  back.add(sp1, sp2, sp3, pc);
  if (B.needle) back.add(nd);
  scene.add(back);

  // 봄: 바닥에 작은 단추 꽃이 핀다
  if (config.season === 'b') {
    for (let k = 0; k < 9; k++) {
      const f = buttonFlower(renderer, {
        height: 0.5 + rand() * 0.4, size: 0.16, stem: '#86a873', petal: S.petal[k % 3], button: '#fff7ea',
        thread: S.thread[k % 4], leaf: S.leaf[0], phase: rand() * 6.28,
      });
      f.position.set((rand() - 0.5) * 9, 0, -1 - rand() * 5);
      scene.add(f);
    }
  }

  // 맨 앞: 화면 가장자리를 감싸는 뜨개 잎, 단추 꽃, 털실 덩굴 (layout에서 화면 모서리에 붙인다)
  const front = makeFront(renderer, S, rand);
  scene.add(front.group);

  // 공기: 눈송이 또는 보풀
  const air = makeParticles(S.air === 'snow'
    ? { count: 60, box: [26, 12, 16], z: -2, color: S.airColor, size: 7, fall: 0.45 }
    : { count: 26, box: [24, 9, 14], z: -1, color: S.airColor, size: 5, fall: -0.12, curl: true });
  scene.add(air);
  // 함박눈: 하늘을 톡 누르면 잠깐 펑펑 (겨울만)
  const F = config.flurry;
  const flurry = S.air === 'snow' ? makeParticles({ count: F.count, box: [18, 12, 12], z: 1, color: S.airColor, size: F.size, fall: F.fall, seed: 9 }) : null;
  if (flurry) { flurry.material.uniforms.uAmount.value = 0; scene.add(flurry); }
  let flurryT = -1;
  function flurryStep(dt) {
    if (!flurry || flurryT < 0) return;
    flurryT += dt;
    const a = Math.min(1, flurryT / F.rise), b = 1 - Math.max(0, (flurryT - F.rise - F.hold) / F.fade);
    flurry.material.uniforms.uAmount.value = Math.max(0, Math.min(a, b));
    if (b <= 0) flurryT = -1;
  }

  // 나무들: world.tree / slots / memos 는 지금 보고 있는 나무
  let active = 0;
  const addTree = () => {
    const t = trees.length ? growOne(trees.length) : first;
    t.memos = makeMemos(renderer, scene, { tree: t.tree, slots: t.slots, ball: t.ball, tail: t.tail, eye: t.eye, walk: t.walk });
    trees.push(t);
    // 같은 쪽에 새로 자란 나무는 땅에서 쑥 자라 오른다
    if (trees.length > 1 && t.page === pageOf(active)) t.grow = 0;
    world.onTree?.(t);
    return t;
  };
  // 넘기기: 같은 쪽이면 시점이 옆걸음하고, 다른 쪽이면 지금 쪽이 옆으로 밀려 나가고 새 쪽이 들어온다
  let slide = null;
  function go(i, done) {
    if (i === active || !trees[i] || slide) return false;
    const a = pageOf(active), b = pageOf(i);
    active = i;
    if (a === b) { done?.(); return true; }
    const dir = b > a ? 1 : -1;
    slide = { from: pages[a], to: pages[b], dir, t: 0, done };
    slide.to.visible = true;
    return true;
  }
  function slideStep(dt) {
    for (const t of trees) {
      if (t.grow === undefined) continue;
      t.grow = Math.min(1, t.grow + dt / TR.growTime);
      const e = 1 - (1 - t.grow) ** 3;
      t.tree.group.scale.set(0.3 + 0.7 * e, Math.max(0.01, e), 0.3 + 0.7 * e);
      if (t.grow >= 1) { t.tree.group.scale.setScalar(1); delete t.grow; }
    }
    if (!slide) return;
    slide.t = Math.min(1, slide.t + dt / TR.slideTime);
    const e = slide.t < 0.5 ? 4 * slide.t ** 3 : 1 - (-2 * slide.t + 2) ** 3 / 2; // 부드럽게 출발, 부드럽게 도착
    const g = TR.gap + 8;
    slide.from.position.x = -slide.dir * g * e;
    slide.to.position.x = slide.dir * g * (1 - e);
    if (slide.t >= 1) {
      slide.from.visible = false;
      slide.from.position.x = 0;
      slide.to.position.x = 0;
      const done = slide.done;
      slide = null;
      done?.();
    }
  }

  world = {
    ground, sun, front, basket: bask, trees, addTree, go, pageOf, yarnColor: null,
    /** 하늘을 톡: 함박눈 (내리는 중이면 더 오래) */
    snow() { if (flurryT < 0) flurryT = 0; else flurryT = Math.min(flurryT, F.rise); },
    get tree() { return trees[active].tree; },
    get slots() { return trees[active].slots; },
    get memos() { return trees[active].memos; },
    get ball() { return trees[active].ball; },
    get tail() { return trees[active].tail; },
    get active() { return active; },
    get sliding() { return !!slide; },
    get panX() { return trees[active].x; }, // 시점이 옆걸음할 곳
    /** 지금 화면(쪽)에 보이는 나무들 */
    get shown() { const p = pageOf(active); return trees.filter((t) => t.page === p); },
    get pages() { return pages.length; },
    get page() { return pageOf(active); },
  };
  addTree();
  // 땅의 작은 실뭉치 (지운 메모). 다시 짤 때는 지금 보고 있는 나무로
  world.balls = makeBalls(renderer, scene, world);
  Object.defineProperty(world.balls, 'memos', { get: () => world.memos });
  world.update = (t, dt) => {
    slideStep(dt);
    flurryStep(dt);
    // 해와 눈송이도 시점을 따라 옆으로 (그림자 범위 안에 지금 나무가 들도록)
    const px = world.panNow ?? 0;
    sun.position.set(...config.look.sunDir).normalize().multiplyScalar(20).add(new THREE.Vector3(px, 0, 0));
    sun.target.position.set(px, 0, -2);
    air.position.x = px;
    for (const x of trees) x.memos.update(t, dt);
    world.balls.update(t, dt);
  };
  return world;
}

// 하늘: 세로 그라데이션 + 아주 옅은 가로 색연필 결
export function skyTexture(cols) {
  const w = 512, h = 1024;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, cols[0]);
  g.addColorStop(0.55, cols[1]);
  g.addColorStop(1, cols[2]);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const rand = makeRandom(77);
  c.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const y = rand() * h * 0.7, x = rand() * w, l = 30 + rand() * 120;
    c.strokeStyle = rand() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(150,160,215,0.07)';
    c.lineWidth = 2 + rand() * 5;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y + (rand() - 0.5) * 6); c.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 실 꼬리: 실뭉치 표면(나무 쪽)에서 풀려 바닥에 내려앉고, 구불구불 기어가 나무 밑동 뿌리 사이로 들어간다
function threadTail(renderer, c, r, tree, color, rand) {
  const Y = config.yarnBall;
  const trunk = tree.branches[0];
  const root = tree.group.position;
  // 실뭉치 → 나무 방향 (바닥 평면에서)
  const dir = new THREE.Vector3(root.x - c.x, 0, root.z - c.z);
  const total = dir.length();
  dir.normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const lie = Y.thread * 0.9; // 바닥에 누운 실의 중심 높이

  const pts = [];
  // 1) 실뭉치 옆면에서 시작해 바닥으로 흘러내린다
  pts.push(c.clone().addScaledVector(dir, r * 0.86).add(new THREE.Vector3(0, r * 0.35, 0)));
  pts.push(c.clone().addScaledVector(dir, r * 1.02).add(new THREE.Vector3(0, -r * 0.35, 0)));
  pts.push(c.clone().addScaledVector(dir, r * 1.3).setY(lie));
  // 2) 바닥을 구불구불 (끝으로 갈수록 덜 구불)
  const trunkR = trunk.radius(0.3 / trunk.len) * Y.reach;
  const run = total - r * 1.3 - trunkR;
  const n = Math.max(3, Math.round(run / 0.55));
  const ph = rand() * 6.28;
  for (let i = 1; i <= n; i++) {
    const u = i / (n + 1);
    const wig = Math.sin(u * Math.PI * Y.wiggleN + ph) * Y.wiggle * (1 - u * 0.6) + (rand() - 0.5) * 0.08;
    pts.push(c.clone().addScaledVector(dir, r * 1.3 + run * u).addScaledVector(side, wig).setY(lie));
  }
  // 3) 밑동에 닿아 뿌리 사이로 살짝 올라가며 들어간다
  const end = root.clone().addScaledVector(dir, -trunkR);
  pts.push(end.clone().addScaledVector(dir, -0.25).setY(lie));
  pts.push(end.clone().setY(0.1));
  pts.push(end.clone().addScaledVector(dir, 0.2).setY(0.2));

  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const len = curve.getLength();
  const g = new THREE.TubeGeometry(curve, Math.ceil(len * 40), Y.thread, 8, false);
  // 꼬임 무늬가 실 길이에 맞게 반복되도록 uv를 바꾼다 (x = 둘레, y = 길이)
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), (uv.getX(i) * len) / (Y.thread * 9));
  const map = yarnTex(renderer, { color: '#ffffff', seed: 12 });
  const m = new THREE.Mesh(g, toonMaterial({ map, color, cover: 0.6 }));
  m.castShadow = m.receiveShadow = true;
  m.userData.curve = curve; // 7단계에서 메모를 짤 때 여기서 실이 이어진다
  return m;
}

// 큰 실뭉치: 감긴 실 무늬 공 + 다른 방향으로 감긴 띠 두 개
// 무늬는 흰색으로 굽고 색은 재질에 곱한다 → setColor로 바로 바꿀 수 있다
export function yarnBall(renderer, r, color, cover = 1) {
  const grp = new THREE.Group();
  const map = wrapTex(renderer, { color: '#ffffff', lines: 30, seed: 4 });
  const mats = [];
  const core = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), toonMaterial({ map, color, cover }));
  mats.push(core.material);
  grp.add(core);
  for (const [rx, rz, k] of [[1.1, 0.3, 1.012], [-0.5, 1.2, 1.024]]) {
    const band = new THREE.Mesh(new THREE.SphereGeometry(r * k, 48, 32),
      toonMaterial({ map, color, band: 0.13, cover }));
    band.rotation.set(rx, 0, rz);
    mats.push(band.material);
    grp.add(band);
  }
  grp.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  grp.userData.setColor = (c) => { for (const m of mats) m.uniforms.uColor.value.set(c); };
  return grp;
}

// 맨 앞 층. 모서리마다 묶음을 만들고, 화면 크기에 맞춰 모서리에 붙인다.
function makeFront(renderer, S, rand) {
  const group = new THREE.Group();
  const corners = {}; // bl, br, tl, tr → 각 묶음

  // 아래 왼쪽: 큰 뜨개 잎 여러 장 + 단추 꽃
  const bl = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const leaf = knitLeaf(renderer, {
      len: 0.9 + rand() * 0.5, width: 0.32 + rand() * 0.12, bend: 0.5 + rand() * 0.6, cup: 0.35,
      stripes: S.leaf[k % S.leaf.length], phase: rand() * 6.28, tilt: 0.1,
    });
    leaf.position.set(0.1 + k * 0.28, -0.05, -k * 0.05);
    leaf.rotation.set(0, 0.4 - k * 0.15, 0.7 - k * 0.32);
    bl.add(leaf);
  }
  const f1 = buttonFlower(renderer, { height: 1.0, size: 0.2, stem: '#86a873', petal: S.petal[0], button: '#fff7ea', thread: S.thread[2], leaf: S.leaf[0], phase: 1.3, lean: 0.12 });
  f1.position.set(0.95, -0.1, -0.35); // 잎 뒤에서 자란다 (줄기가 잎을 뚫지 않게)
  bl.add(f1);
  corners.bl = bl;

  // 아래 오른쪽: 잎 + 단추 꽃 두 송이
  const br = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const leaf = knitLeaf(renderer, {
      len: 0.8 + rand() * 0.5, width: 0.3 + rand() * 0.1, bend: 0.6 + rand() * 0.5, cup: 0.35,
      stripes: S.leaf[(k + 1) % S.leaf.length], phase: rand() * 6.28, tilt: 0.1,
    });
    leaf.position.set(-0.1 - k * 0.3, -0.05, -k * 0.05);
    leaf.rotation.set(0, -0.4 + k * 0.15, -0.6 + k * 0.35);
    br.add(leaf);
  }
  for (const [x, h, c] of [[-0.75, 1.15, 1], [-1.25, 0.8, 2]]) {
    const f = buttonFlower(renderer, { height: h, size: 0.18, stem: '#86a873', petal: S.petal[c], button: '#f2e2a8', thread: S.thread[0], leaf: S.leaf[1], phase: x * 3, lean: -0.15 });
    f.position.set(x, -0.1, -0.35); // 잎 뒤에서 자란다
    br.add(f);
  }
  corners.br = br;

  // (위에서 늘어지던 털실 덩굴은 뺐다: 화면 위가 답답해 보여서)

  for (const k in corners) group.add(corners[k]);
  // 맨 앞 층은 그림자를 받지 않는다 (얇은 잎끼리 그림자가 지글거리는 것 방지, 앞은 늘 밝게)
  group.traverse((m) => { if (m.isMesh) m.receiveShadow = false; });

  // 카메라 앞 d 거리의 화면 모서리에 붙인다. 단위 크기는 화면 반높이에 맞춘다.
  function layout(camera, dist, panX = 0) {
    const d = config.front.depth;
    const v = Math.tan((camera.fov * Math.PI) / 360);
    const hh = v * d, hw = hh * camera.aspect;
    const z = dist - d; // 카메라는 z = dist 근처
    const y0 = camera.position.y;
    // 크기는 화면의 짧은 쪽 기준 → 세로 화면에서 덩굴이 나무를 덮지 않는다
    const tall = camera.aspect < 1;
    const s = Math.min(hh * (tall ? config.front.tall : 1), hw * 1.25) * config.front.scale;
    // 세로 화면: 잎은 더 내려 입력 줄과 밑동을 비운다
    const low = tall ? hh * 1.08 : hh * 1.03;
    corners.bl.position.set(-hw * 1.02, y0 - low, z);
    corners.br.position.set(hw * 1.02, y0 - low, z);
    for (const k in corners) corners[k].scale.setScalar(s);
    // 옆걸음해 있으면 그 자리 기준으로
    corners.bl.position.x += panX;
    corners.br.position.x += panX;
    base.copy(camera.position);
    baseX = panX;
  }

  // 앞 층은 카메라에 아주 가까워서 그대로 두면 시점이 조금만 움직여도 크게 밀린다.
  // 카메라 이동을 일부 따라가게 해서 "가운데 층보다 조금 더" 움직이게 한다.
  const base = new THREE.Vector3();
  function follow(camera, panX = 0) {
    // 옆걸음은 그대로 따라간다 (앞 층은 화면 모서리에 붙어 있다)
    group.position.copy(camera.position).sub(base);
    group.position.x -= panX - baseX;
    group.position.multiplyScalar(config.front.follow);
    group.position.x += panX - baseX;
  }
  let baseX = 0;

  return { group, layout, follow };
}
