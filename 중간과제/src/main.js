// 시작점: 렌더러, 장면, 카메라를 만들고 매 프레임 그린다
import * as THREE from 'three';
import { config, isDebug, reduceMotion } from './config.js';
import { makePost } from './post.js';
import { makeControls } from './controls.js';
import { shared, applyLook } from './toon.js';
import { makeScene } from './scene.js';
import { makeKnitLab } from './lab.js';
import { makeGesture } from './gesture.js';
import { prewarm } from './piece.js';
import { yarnTones } from './knit.js';
import { makeNote } from './note.js';
import { makeHoldRing } from './holdRing.js';
import { makeBasketView } from './basketView.js';
import { makeStorage } from './storage.js';
import { makePager } from './pager.js';
import { makeMemoList } from './memoList.js';
import { makeKnitRoom } from './knitRoom.js';
import { fontReady } from './knitText.js';
import { makeSound } from './sound.js';

// 주소로 고르기: ?season=b, ?tree=2, ?seed=5
const q = new URLSearchParams(location.search);
if (config.seasons[q.get('season')]) config.season = q.get('season');
if (config.tree.styles[q.get('tree')]) config.tree.pick = q.get('tree');
if (['a', 'b'].includes(q.get('back'))) config.back.pick = q.get('back');
if (q.get('twig') in config.tree.twigs) config.tree.twig = q.get('twig');
if (config.balls.feels[q.get('feel')]) config.balls.feel = q.get('feel');
if (config.yarnBall.spots[q.get('ball')]) config.yarnBall.pick = q.get('ball');
if (config.knit.looks[q.get('knit')]) config.knit.look = q.get('knit');

// 렌더러: 툰 색을 그대로 내보내기 위해 톤 매핑은 끈다
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // 또렷한 그림자 색면
renderer.localClippingEnabled = true;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(config.camera.fov, 1, 0.1, 120);

applyLook();
// ?scene=knit 이면 뜨개 조각 테스트 화면
const lab = q.get('scene') === 'knit';
const world = lab ? makeKnitLab(renderer, scene) : makeScene(renderer, scene, { seed: Number(q.get('seed')) || 0 });
const post = makePost(renderer, scene, camera);
const controls = makeControls(renderer.domElement, camera);

// 물레 + 입력 줄 (나무 장면에서만). 물레는 카메라에 붙여 화면에 고정한다.
// 큰 실뭉치를 톡 누르면 물레가 실뭉치에서 튀어나온다.
const input = document.getElementById('memo');
// 실 색: 정원 물레와 뜨개방 휠이 같은 색을 바꾼다 → 큰 실뭉치, 실 꼬리, 밑줄
function setYarn(hue, color = yarnTones(hue).base) {
  // 정원의 모든 나무 실뭉치와 실 꼬리
  world.yarnColor = color;
  for (const t of world.trees) { t.ball.userData.setColor(color); t.tail.material.uniforms.uColor.value.set(color); }
  document.documentElement.style.setProperty('--yarn', color);
  app.yarn = { hue, color };
  // 색을 잠깐 멈추면 이 색의 짜임 텍스처를 미리 만들어 둔다
  clearTimeout(warmT);
  warmT = setTimeout(() => prewarm(renderer, Math.round(hue)), 350);
}
let ballKey = null, warmT = 0, hintEl = null;
const ballScreen = { x: 0, y: 0, r: 0 };
if (!lab) makeSound(); // 오르골 배경 음악
if (!lab) {
  scene.add(camera);
  // 큰 털실 위에 겹친 투명한 손잡이: 톡 / Enter / Space → 뜨개방(메모 쓰기), 길게 누르기 → 메모 목록
  ballKey = document.createElement('div');
  ballKey.className = 'ballkey';
  ballKey.tabIndex = 0;
  ballKey.setAttribute('role', 'button');
  ballKey.setAttribute('aria-label', '메모 뜨기 (길게 누르면 메모 목록)');
  document.body.appendChild(ballKey);
  let longT = 0, longed = false;
  ballKey.addEventListener('pointerdown', () => {
    longed = false;
    clearTimeout(longT);
    longT = setTimeout(() => { longed = true; memoList?.show(); }, config.list.holdMs);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) ballKey.addEventListener(ev, () => clearTimeout(longT));
  ballKey.addEventListener('click', () => { if (longed) { longed = false; return; } openRoom?.(); });
  ballKey.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRoom?.(); }
  });
} else input.hidden = true;

// ── 꾹 눌러 짜기 ─────────────────────────────
// 적고 나서 나무를 꾹 → 가장 가까운 빈 가지에 조각이 짜인다. 누르는 시간 = 중요도.
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function rayAt(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray;
}
// 화면에 선 나무들 중 누른 곳 → { point, memo, t(그 나무) }
function hitTree(e) {
  rayAt(e);
  let best = null;
  for (const t of world.shown) {
    const hit = ray.intersectObjects([t.tree.mesh, ...t.memos.memos.map((m) => m.piece)], true)[0];
    if (hit && (!best || hit.distance < best.hit.distance)) best = { hit, t };
  }
  if (!best) return null;
  const { hit, t } = best;
  const memo = hit.object === t.tree.mesh ? null : t.memos.byObject(hit.object);
  return { point: hit.point, onPiece: !!memo, memo, t };
}
const own = (m) => m?.home || world.memos; // 그 메모가 감긴 나무의 메모들
const allMemos = () => world.trees.flatMap((t) => t.memos.memos);
// 쓰면서 찾기: 적는 말이 든 조각이 반짝이고, 입력 줄 위에 몇 개인지 작게
const found = document.createElement('div');
found.className = 'found';
found.setAttribute('aria-live', 'polite');
document.body.appendChild(found);
function findText() {
  let n = 0;
  for (const t of world.trees) n += t.memos.find(input.value);
  room?.found(n ? `같은 말이 든 메모 ${n}개` : '');
}
function nudge(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // 애니메이션을 처음부터 다시
  el.classList.add(cls);
}
// 짜기를 시작할 수 있는지: 글자가 없으면 입력 줄이 흔들리고, 빈 자리가 없으면 나무가 떤다
function canKnit(slot) {
  if (!slot) {
    // 꽉 찼다: 나무가 떨고, 옆 나무로 넘겨 보라고 알려 준다
    world.memos.tremble();
    ensureNext?.();
    if (world.trees.length > 1) {
      pager?.nudge();
      found.textContent = '이 나무는 꽉 찼어요 · 옆으로 넘겨 보세요';
      found.classList.add('on');
      clearTimeout(canKnit.t);
      canKnit.t = setTimeout(findText, 2200);
    }
    return false;
  }
  return true;
}
let gesture = null, hoverCheck = null, placeTip = null, basketView = null, room = null;
let pending = ''; // 뜨개방에서 다 뜬 글 (정원에서 가지를 꾹 누르면 짜인다)
const ring = lab ? null : makeHoldRing(); // 꾹 누르는 동안 손가락 옆에 차오르는 실 고리
// 누르는 시간 = 짜임: 짧게 = 성근 망사, 1초쯤 = 줄무늬, 2초 이상 = 그래니
function knitType(sec) {
  const P = config.press;
  return sec >= P.grannyAt ? 'granny' : sec >= P.stripeAt ? 'stripe' : 'mesh';
}
let pager = null, goTree = null, ensureNext = null, swipe = null, memoList = null, openRoom = null; // 나무 여러 그루, 메모 목록
// 지금 보는 나무 기준. 장식 날짜를 정하면 퐁퐁 알림을 위해 브라우저 알림 허락을 한 번 묻는다
const note = lab ? null : makeNote(camera, {
  center: (m, c) => own(m).center(m, c),
  setDue(m, due) {
    own(m).setDue(m, due);
    if (due && m.deco === 'pompom' && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  },
});

// 읽기: 조각을 톡 → 그 조각 쪽으로 다가가며 글이 떠오른다. 다른 곳을 톡 → 사라지고 돌아온다.
function read(memo) {
  for (const m of allMemos()) m.reading = false;
  if (memo && memo.done && note.memo !== memo) {
    memo.reading = true; // 읽는 조각은 살짝 밝게
    own(memo).shake(memo); // 쌓인 눈이 털린다
    note.show(memo);
    own(memo).seen(memo); // 깨어난 퐁퐁: "지금 알려 드려요"를 보여 준 뒤 알림 끝
    const c = new THREE.Vector3();
    own(memo).center(memo, c);
    controls.focus(c);
  } else {
    note.hide();
    controls.focus(null);
  }
}
if (!lab) {
  const cv = renderer.domElement;
  // 누른 곳 → 짤 자리. 나무 표면을 눌렀으면 그 자리, 가지 근처(reach px 안)를 눌렀으면 화면에서 가장 가까운 자리
  function target(e) {
    const h = hitTree(e);
    if (h?.onPiece) return null; // 조각 위 꾹은 F4, F5에서
    // 뒤 나무를 눌렀다 → 그 나무가 지금 나무 (시점은 그대로)
    if (h && h.t !== world.trees[world.active]) goTree(world.trees.indexOf(h.t));
    if (h) return { slot: world.memos.pick(h.point) };
    const near = world.memos.nearest(e.clientX, e.clientY, camera, false);
    if (near.d > config.press.reach) return null; // 하늘, 땅
    return { slot: world.memos.nearest(e.clientX, e.clientY, camera, true).slot };
  }
  let tapped = null, closing = 0; // 톡톡: 첫 톡에서 맞힌 조각, 닫기 대기
  let aim = null; // 누르는 순간 정한 자리 (미리보기 고리로 보여 준다)
  let grab = null; // 누른 곳의 다 짠 조각 { memo } 또는 땅의 실뭉치 { ball }
  cv.addEventListener('pointerdown', (e) => {
    controls.freeze(true);
    grab = null;
    const b = world.balls.hit(rayAt(e));
    if (b) grab = { ball: b };
    else {
      const m = hitTree(e)?.memo;
      if (m?.done) grab = { memo: m };
    }
    aim = grab ? null : target(e);
    // 다 뜬 글이 있으면 누르는 순간 짜일 자리에 실 색 고리
    if (pending && aim?.slot) world.memos.preview(aim.slot, app.yarn.color); // 지금 나무일 때만 (옆 나무는 other)
  });
  const unfreeze = () => { controls.freeze(false); world.memos.clearPreview(); };
  cv.addEventListener('pointerup', unfreeze);
  cv.addEventListener('pointercancel', unfreeze);
  // ── 당겨 풀기, 실뭉치 굴리기 ─────────────────
  // 조각을 잡고 끌면 실이 손가락을 따라 늘어나며 풀린다. 화면 짧은 변의 36%를 당기면 작은 실뭉치가 되어 떨어진다.
  const pl = new THREE.Plane(), pv = new THREE.Vector3();
  // 그 나무 밑동 앞면 (실이 줄기 속으로 들어가지 않게)
  const trunkFront = (T) => { const tr = T.branches[0]; return T.group.position.z + tr.radius(0.3 / tr.len) * 1.3 + config.pull.front; };
  const fingerAt = (e, out) => rayAt(e).ray.intersectPlane(pl, out);
  function grabStart(e, p) {
    if (!grab || p.grab) return;
    if (grab.ball) { if (world.balls.hold(grab.ball)) p.grab = 'ball'; return; }
    const m = grab.memo;
    // 손가락이 움직이는 판: 조각 앞면보다 조금 더 앞, 카메라를 보는 면 (실이 줄기 속으로 들어가지 않게)
    // 아래로 당기면 굵은 밑동 앞을 지나므로, 밑동 앞면보다도 앞에 둔다
    const M = own(m);
    const r = M.center(m, pv);
    const n = camera.getWorldDirection(new THREE.Vector3()).negate();
    pv.addScaledVector(n, r + config.pull.front);
    pv.z = Math.max(pv.z, trunkFront(M.tree));
    pl.setFromNormalAndCoplanarPoint(n, pv);
    if (!fingerAt(e, pv) || !M.pullStart(m, pv)) return;
    // 읽던 글은 닫는다 (시점은 놓을 때 돌아온다)
    clearTimeout(closing);
    note.hide();
    m.reading = false;
    p.grab = 'memo';
    grabMove(e, p);
  }
  function grabMove(e, p) {
    if (p.grab === 'ball') return world.balls.move(grab.ball, camera, e.clientX, e.clientY);
    if (p.grab !== 'memo' || !fingerAt(e, pv)) return;
    const k = Math.hypot(e.clientX - p.x, e.clientY - p.y) / (config.pull.full * Math.min(innerWidth, innerHeight));
    pv.y = Math.max(pv.y, config.balls.r);
    own(grab.memo).pullTo(grab.memo, k, pv);
    if (k < 1) return;
    // 다 풀렸다 → 남은 실이 감겨 실뭉치가 되고 땅으로 툭
    world.balls.add(own(grab.memo).pullEnd(grab.memo, true), pv);
    note.pulled();
    controls.focus(null);
    p.grab = 'done';
  }
  function grabEnd(p) {
    if (p.grab === 'ball') world.balls.release(grab.ball);
    if (p.grab === 'memo') { own(grab.memo).pullEnd(grab.memo, false); controls.focus(null); }
    p.grab = null;
    grab = null;
  }
  // 바구니 창: 바구니(또는 담긴 실뭉치)를 톡 → 간직한 메모 목록
  const view = makeBasketView(camera, world.balls, {
    restore(b) {
      if (world.balls.restore(b)) view.render();
      else { world.memos.tremble(); view.say('나무에 빈 자리가 없어요'); }
    },
    out(b) { world.balls.takeOut(b); view.render(); },
    discard(b) { world.balls.discard(b); view.render(); },
  });
  basketView = view;

  // 작은 실뭉치를 톡: 눈이 털리고, 그 메모가 흐릿한 손글씨로 잠깐
  function peek(b) {
    world.balls.shake(b); // 쌓인 눈이 털린다
    read(null);
    note.show(b.m, config.balls.peek);
  }

  gesture = makeGesture(cv, {
    // 가지를 꾹: 다 뜬 글이 있으면 그 가지에 짜기 (누르는 동안 짜임이 바뀐다), 없으면 뜨개방으로
    holdStart(e, p) {
      if (grab || !aim) return; // 조각, 실뭉치 위 꾹은 끌기를 기다린다
      if (aim.other !== undefined) return goTree(aim.other);
      if (pending) holdKnit(e, p, aim.slot);
      // (쪽지가 없으면 가지 꾹은 아무것도 하지 않는다: 메모 쓰기는 털실을 톡)
    },
    // 조각 위에서 잠깐 머문 뒤 끌어도 풀린다
    holdMove(e, p) {
      if (!grab) return;
      if (p.grab) grabMove(e, p);
      else if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > config.input.dragPx) grabStart(e, p);
    },
    dragStart(e, p) { grabStart(e, p); },
    drag(e, p) { grabMove(e, p); },
    dragEnd(e, p) { if (!p.grab && !grab) swipe(e, p); grabEnd(p); },
    tap(e) {
      // 바구니 창, 메모 목록이 열려 있으면 바깥 톡은 창만 닫는다
      if (view.open || memoList.open) { view.hide(); memoList.hide(); tapped = null; return; }
      if (grab?.ball?.state === 'kept' || (!grab && world.balls.hitBasket(rayAt(e)))) {
        tapped = null;
        read(null);
        return view.show(grab?.ball || null);
      }
      if (grab?.ball) { tapped = null; return peek(grab.ball); }
      const hh = hitTree(e);
      const m = hh?.memo || null;
      tapped = m;
      // 옆 나무의 조각 → 그 나무로 옆걸음하며 읽는다
      if (m && hh.t !== world.trees[world.active]) { const i = world.trees.indexOf(hh.t); return goTree(i, () => read(m)); }
      // 빈 가지를 톡 → 다 뜬 글이 있으면 보통(줄무늬)으로 바로 짜고, 없으면 털실을 톡 해 보라고 실뭉치가 통 튄다
      if (!m) {
        const a = target(e);
        if (a?.other !== undefined) return goTree(a.other); // 옆 나무 → 그 나무로 옆걸음
        if (a) return pending ? quickKnit(a.slot) : hopBall();
        // 빈 하늘을 톡 → 함박눈
        if (!hh && rayAt(e).ray.direction.y > 0) { read(null); return world.snow?.(); }
      }
      // 읽는 중인 조각을 또 톡: 톡톡일 수 있으니 잠깐 기다렸다 닫는다 (바로 닫으면 시점이 물러나 두 번째 톡이 빗나간다)
      clearTimeout(closing);
      if (m && note.memo === m) closing = setTimeout(() => read(null), config.input.doubleMs);
      else read(m);
    },
    // 톡톡: 조각의 장식을 바꾼다 (첫 톡에서 읽기가 열려 있다)
    doubleTap(e) {
      clearTimeout(closing);
      if (grab?.ball) return peek(grab.ball);
      const m = tapped || hitTree(e)?.memo; // 첫 톡에서 맞힌 조각
      if (!m?.done) return read(null);
      own(m).nextDeco(m);
      if (note.memo !== m) read(m);
      else note.show(m);
    },
    holdEnd(e, p) {
      if (p.memo) { own(p.memo).release(p.memo); ring.hide(); }
      grabEnd(p);
    },
  });
  // 바구니 힌트: 실뭉치가 처음 땅에 떨어질 때 두 번만 "바구니에 넣으면 간직돼요"
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.textContent = '바구니에 넣으면 간직돼요';
  document.body.appendChild(tip);
  let tips = 0, tipUntil = 0;
  try { tips = Number(localStorage.getItem('memo.basketHint')) || 0; } catch (err) { /* 저장 못 해도 괜찮다 */ }
  const saveTips = (n) => { tips = n; try { localStorage.setItem('memo.basketHint', String(n)); } catch (err) { /* 무시 */ } };
  world.balls.onLand = () => {
    if (tips >= config.basket.hintTimes) return;
    saveTips(tips + 1);
    tipUntil = performance.now() + 3800;
  };
  world.balls.onKeep = () => { saveTips(config.basket.hintTimes); tipUntil = 0; };
  const tv = new THREE.Vector3();
  placeTip = () => {
    const on = performance.now() < tipUntil && !world.balls.list.some((b) => b.state === 'lift'); // 들고 있으면 가리지 않게 숨김
    tip.classList.toggle('on', on);
    if (!on) return;
    tv.copy(world.balls.basketAt).setY(config.basket.h + 0.35).project(camera);
    tip.style.transform = `translate(${(tv.x + 1) / 2 * innerWidth}px, ${(1 - tv.y) / 2 * innerHeight}px) translate(-50%, -100%)`;
  };

  // 다 짠 직후: 글을 잠깐 보여 준다 (다른 조각을 읽는 중이면 그대로). 나무가 꽉 차면 새 나무를 준비한다
  const hook = (t) => {
    const M = t.memos;
    if (world.yarnColor) { t.ball.userData.setColor(world.yarnColor); t.tail.material.uniforms.uColor.value.set(world.yarnColor); }
    // 다 짠 직후: 처음 몇 번은 조각 옆에 장식 안내 (톡톡 → 꽃 D-day, 퐁퐁 알림, 태슬 마감)
    M.onDone = (m) => {
      ensureNext();
      let n = 0;
      try { n = Number(localStorage.getItem('memo.knitTip')) || 0; } catch (err) { /* 무시 */ }
      if (n >= config.deco.knitTipTimes || note.pinned) return;
      try { localStorage.setItem('memo.knitTip', String(n + 1)); } catch (err) { /* 무시 */ }
      note.show(m, config.deco.knitTipTime, '톡톡 두 번 누르면 장식이 달려요 · 꽃은 날짜, 퐁퐁은 알림, 태슬은 체크');
    };
    // 퐁퐁 알림 시간: 페이지가 열려 있으면 브라우저 알림도
    M.onRing = (m) => {
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification('You memo? I memo!', { body: m.text }); } catch (err) { /* 무시 */ }
    };
  };
  world.onTree = hook;
  for (const t of world.trees) hook(t);

  // ── 나무 여러 그루 ──
  pager = makePager((i) => goTree(i));
  goTree = (i, done) => {
    if (world.sliding || i < 0 || i >= world.trees.length || i === world.active) return;
    read(null);
    world.memos.clearPreview();
    world.go(i, () => { findText(); done?.(); });
    pager.update(i, world.trees.length);
  };
  // 지금 나무가 꽉 찼고 마지막 나무면 옆에 새 나무를 만들어 둔다
  ensureNext = () => {
    const T = world.trees;
    if (T[T.length - 1].memos.nextFree() || T.length >= config.trees.max) return;
    world.addTree();
    pager.update(world.active, T.length);
    pager.nudge();
  };
  // 오늘 챙길 것 수 (1초마다)
  setInterval(() => {
    let k = 0;
    for (const t of world.trees) for (const m of t.memos.memos) { const s = m.dueS; if (s && (s.ring || (s.urgent && s.label !== null))) k++; }
    pager.badge(k);
  }, 1000);
  // 빈 곳을 옆으로 쓸면 넘긴다
  swipe = (e, p) => {
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (Math.abs(dx) > config.trees.swipe && Math.abs(dx) > Math.abs(dy) * 1.4) goTree(world.active + (dx < 0 ? 1 : -1));
  };

  // 메모 목록: 고르면 그 나무로 넘겨서 그 조각을 읽는다
  memoList = makeMemoList(world, () => ballScreen, (m, i) => {
    if (i === world.active) return read(m);
    goTree(i, () => read(m));
  });

  // 마우스를 올리면 조각이 살짝 밝아진다 (데스크톱, 한 프레임에 한 번만 검사)
  let hoverE = null;
  cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !gesture.pressing) hoverE = e; });
  cv.addEventListener('pointerleave', () => { hoverE = { gone: true }; });
  hoverCheck = () => {
    if (!hoverE) return;
    const b = hoverE.gone ? null : world.balls.hit(rayAt(hoverE));
    const m = hoverE.gone || b ? null : hitTree(hoverE)?.memo;
    hoverE = null;
    for (const x of allMemos()) x.hoverOn = x === m && x.done;
    cv.style.cursor = b ? 'grab' : m?.done ? 'pointer' : '';
  };

  // ── 뜨개방 ──
  // 빈 가지를 톡 → 화면이 뜨개방으로. 다 뜨면 정원으로 돌아와 가지를 꾹 (누르는 시간 = 짜임)
  // 꾹 짜기: 누르는 동안 조각이 짜이며 망사 → 줄무늬 → 그래니로 바뀌고, 떼면 그 짜임으로 마저
  function holdKnit(e, p, slot) {
    world.memos.clearPreview();
    if (!canKnit(slot)) return;
    p.memo = world.memos.start(slot, pending, app.yarn.hue, knitType(0), true);
    ring.show(e.clientX, e.clientY, e.pointerType === 'touch', app.yarn.color);
    setPending('');
    startHint.done();
  }
  // 톡: 보통(줄무늬)으로 바로
  function quickKnit(slot) {
    if (!canKnit(slot)) return;
    world.memos.start(slot, pending, app.yarn.hue, 'stripe', false);
    setPending('');
    startHint.done();
  }
  room = makeKnitRoom(input, {
    input: findText,
    hue: () => app.yarn.hue,
    setHue(h) { setYarn(h); },
    done(text) { setPending(text); },
    close(text) { setPending(text); }, // 닫기(Esc)는 쓰던 글을 남기고, 그만두기는 버린다
  });
  openRoom = () => {
    read(null);
    view.hide();
    memoList.hide();
    const t = pending;
    setPending('');
    room.show(t);
  };
  // 다 뜬 글 쪽지: 정원 아래 가운데. 말린 천 + 글 + "가지를 꾹". 누르면 뜨개방에서 고치고, ×는 버린다
  const chip = document.createElement('div');
  chip.className = 'pending';
  chip.innerHTML = '<button type="button" class="roll" aria-label="다시 고치기"><span class="cloth"></span><span class="txt"></span></button><span class="how">가지를 꾹 누르면 짜여요 · 오래 누를수록 촘촘해요</span><button type="button" class="x" aria-label="버리기">×</button>';
  document.body.appendChild(chip);
  chip.querySelector('.roll').addEventListener('click', () => openRoom());
  chip.querySelector('.x').addEventListener('click', () => setPending(''));
  function setPending(t) {
    pending = t;
    chip.querySelector('.txt').textContent = t;
    chip.classList.toggle('on', !!t);
  }
  // 키보드로: 정원에서 글자를 치기 시작하면 뜨개방이 열린다
  addEventListener('keydown', (e) => {
    if (room.open || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1 || document.activeElement?.closest?.('.basketview, .note, .pending, button')) return;
    openRoom();
  });

  // 처음 안내: 털실 위 말풍선 "털실을 톡 누르면 메모를 뜰 수 있어요" (처음 세 번 짤 때까지). 보이는 동안 털실이 가끔 통 튄다
  const startHint = (() => {
    const h = hintEl = document.createElement('div');
    h.className = 'starthint';
    h.textContent = '털실을 톡 누르면 메모를 뜰 수 있어요';
    document.body.appendChild(h);
    let n = 0, k = 0;
    try { n = Number(localStorage.getItem('memo.startHint')) || 0; } catch (err) { /* 무시 */ }
    const sync = () => {
      const off = n >= 3 || room.open || !!pending || !!gesture?.pressing?.memo; // 쓰는 중, 꾹 짜는 중엔 숨김
      h.classList.toggle('off', off);
      if (!off && !reduceMotion && ++k % 12 === 4) hopBall(); // 약 3.6초마다
    };
    sync();
    setInterval(sync, 300);
    return { done() { n++; try { localStorage.setItem('memo.startHint', String(n)); } catch (err) { /* 무시 */ } sync(); } };
  })();
}
// 꾹 누르는 동안: 누른 시간에 따라 짜임이 바뀐다
function pressing() {
  for (const h of [gesture?.pressing]) {
    if (!h?.memo) continue;
    const sec = (performance.now() - h.t) / 1000;
    own(h.memo).setType(h.memo, knitType(sec));
    ring.set(sec, knitType(sec));
  }
}

// 털실이 통 튄다 (여기를 누르면 메모를 쓸 수 있다는 신호)
let hopT = 1;
const hopBall = () => { hopT = 0; };
function hopStep(dt) {
  if (lab || hopT >= 1) return;
  hopT = Math.min(1, hopT + dt / 0.55);
  const b = world.ball, base = config.yarnBall.r * 0.92;
  b.position.y = base + Math.abs(Math.sin(hopT * Math.PI * 2)) * (1 - hopT) * 0.35;
}

// 실뭉치의 화면 위치 (매 프레임: 패럴랙스로 조금씩 움직인다)
const tmp = new THREE.Vector3();
function placeBallKey() {
  if (!ballKey) return;
  const b = world.ball.position;
  tmp.copy(b).project(camera);
  ballScreen.x = (tmp.x + 1) / 2 * innerWidth;
  ballScreen.y = (1 - tmp.y) / 2 * innerHeight;
  const d = camera.position.distanceTo(b);
  ballScreen.r = (config.yarnBall.r / d) * (innerHeight / 2) / Math.tan((camera.fov * Math.PI) / 360);
  const s = ballScreen.r * 2.2;
  Object.assign(ballKey.style, { left: ballScreen.x - s / 2 + 'px', top: ballScreen.y - s / 2 + 'px', width: s + 'px', height: s + 'px' });
  // 처음 안내 말풍선은 털실 바로 위에
  if (hintEl) Object.assign(hintEl.style, { left: ballScreen.x + 'px', top: ballScreen.y - ballScreen.r * 1.35 + 'px' });
}

// 나무 크기 (뜨개 조각은 빼고 나무만 잰다)
const box = new THREE.Box3().setFromObject(world.tree.mesh || world.tree.group);
const treeH = box.max.y, treeW = Math.max(box.max.x - box.min.x, 4);
const lookY = world.lookY ?? config.camera.lookY;

// 화면 크기
let dpr = Math.min(devicePixelRatio, config.quality.maxDpr);
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // 세로 화면은 시야를 넓혀 나무 폭이 들어오게
  camera.fov = w < h ? config.camera.fov * 1.3 : config.camera.fov;
  camera.updateProjectionMatrix();
  controls.frame(treeH, treeW, lookY);
  controls.set(0, 0);
  world.balls?.layout(camera, Math.abs(controls.panX) < 1e-3); // 실뭉치가 굴러다닐 땅 (바구니 자리는 첫 나무 앞에서)
  world.front?.layout(camera, controls.dist, controls.panX);
  controls.update(0);
  placeBallKey();
  post.resize(w, h, dpr);
}
addEventListener('resize', resize);
resize();

// 돌풍: 가끔 장면을 왼쪽에서 오른쪽으로 가로지른다
const W = config.wind;
let nextGust = 2, gustT = -1;
function wind(t, dt) {
  if (reduceMotion) { shared.uGustK.value = 0; return; }
  if (gustT < 0 && t > nextGust) gustT = 0;
  if (gustT >= 0) {
    gustT += dt;
    shared.uGustX.value = -18 + gustT * W.gustSpeed;
    shared.uGustK.value = W.gustPower * Math.sin(Math.min(1, gustT / 4) * Math.PI);
    if (shared.uGustX.value > 22) {
      gustT = -1;
      nextGust = t + W.gustEvery[0] + Math.random() * (W.gustEvery[1] - W.gustEvery[0]);
    }
  }
}

// 성능 자동 조절: 처음 몇 초 재고 느리면 그림자, 픽셀 비율을 낮춘다
let level = 0, frames = 0, t0 = 0;
const fixed = q.get('q') === 'high';
function checkQuality(now) {
  if (fixed || level >= 2) return;
  if (frames === 0) t0 = now;
  if (++frames < config.quality.checkFrames) return;
  const fps = (frames - 1) / ((now - t0) / 1000);
  frames = 0;
  if (fps >= config.quality.lowFps) { level = 9; return; }
  level++;
  if (level === 1) {
    world.sun.shadow.mapSize.set(1024, 1024);
    world.sun.shadow.map?.dispose();
    world.sun.shadow.map = null;
  } else {
    dpr = Math.min(dpr, 1.5);
    resize();
  }
  console.info('quality →', level, Math.round(fps) + 'fps');
}

// 뜨개 글씨 글꼴을 미리 받아 둔다 (쓰기 창을 처음 열 때 글자가 바뀌지 않게)
fontReady();

// 저장: 열 때 불러오고, 바뀌면 저장 (?fresh 이면 빈 나무로 시작하고 저장하지 않는다)
const storage = !lab && !q.has('fresh') ? makeStorage(world) : null;
if (pager) { pager.update(world.active, world.trees.length); ensureNext(); }

// 스크린샷 스크립트와 디버그에서 쓰는 손잡이
const app = (window.app = {
  camera, storage,
  paused: false, controls, shared, world, yarn: null, hitTree,
  // 돌풍을 특정 위치에 둔다 (연속 스크린샷용)
  gust(x, k) { gustT = -1; nextGust = 1e9; shared.uGustX.value = x; shared.uGustK.value = k; },
  step(s) { time += s; },
  get time() { return time; },
});

// 처음 실 색 (뜨개방 실 바구니에서 바꾼다)
if (!lab) setYarn(config.wheel.hue);

let time = Number(q.get('t')) || 0; // ?t=초 : 스크린샷용 시작 시간
function loop(now) {
  const dt = Math.min((now - (loop.last ?? now)) / 1000, 0.05);
  loop.last = now;
  if (!app.paused) time += dt;
  shared.uTime.value = reduceMotion ? 0 : time;
  wind(time, app.paused ? 0 : dt);
  room?.update(app.paused ? 0 : dt);
  pressing();
  hoverCheck?.();
  world.update?.(time, app.paused ? 0 : dt);
  if (world.panX !== undefined) { controls.pan(world.panX); world.panNow = controls.panX; }
  const wasPan = controls.panning;
  controls.update(app.paused ? 0 : dt);
  if (wasPan && !controls.panning) world.balls?.layout(camera, false); // 옆걸음이 끝나면 앞 꽃 덤불 자리를 다시
  placeBallKey();
  hopStep(app.paused ? 0 : dt);
  note?.update();
  placeTip?.();
  basketView?.place();
  memoList?.place();
  world.front?.follow(camera, controls.panX);
  if (!room?.open) post.render(); // 뜨개방에서는 정원을 그리지 않는다 (가려져 있다)
  checkQuality(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 개발용 패널 (?debug 일 때만)
if (isDebug) import('./debug.js').then((m) => m.makeDebug({ post, renderer, resize }));
