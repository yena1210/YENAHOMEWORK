// 뜨개방: 메모를 쓰는 따로 된 화면. 왼쪽은 나무 틀에 걸린 큰 뜨개 천, 오른쪽은 뜨개 글씨 제목과 실 색 휠.
// 글자를 치면 코로 떠지고, 바늘이 지금 줄을 따라 내려가며 천이 자란다. 다 뜨면 정원으로 돌아가 가지를 꾹.
import { config, reduceMotion } from './config.js';
import { drawFabric, layout, fabricColors, wob } from './knitText.js';
import { yarnTones } from './knit.js';
import { makeYarnBasket } from './yarnBasket.js';

export function makeKnitRoom(input, on) {
  const P = config.pad, R = config.room;
  const el = document.createElement('div');
  el.className = 'room';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', '뜨개방: 메모 뜨기');
  el.innerHTML = `
    <canvas class="deco"></canvas><div class="grain"></div>
    <div class="loom"><canvas class="cloth"></canvas></div>
    <div class="side">
      <div class="label">실 색 고르기</div>
      <div class="wheelbox"></div>
      <div class="found" aria-live="polite"></div>
      <div class="btns"><button type="button" class="done"><span>다 떴어요</span></button><button type="button" class="quit">그만두기</button></div>
      <div class="hint">다 뜨면 정원에서 가지를 꾹! 오래 누를수록 촘촘하게 짜여요<br>짠 조각을 톡톡 두 번 누르면 날짜 · 알림 · 체크 장식을 달 수 있어요</div>
    </div>`;
  document.body.appendChild(el);
  const loom = el.querySelector('.loom'), cv = el.querySelector('.cloth');
  const foundEl = el.querySelector('.found');
  loom.appendChild(input); // 글은 천 위에 겹친 투명한 입력 칸이 받는다 (키보드, 한글 조합 그대로)
  input.placeholder = '';
  input.setAttribute('aria-label', '메모');
  const wheel = makeYarnBasket((h) => on.setHue(h)); // 실 바구니 (실뭉치 7개)
  el.querySelector('.wheelbox').appendChild(wheel.el);
  el.querySelector('.done').addEventListener('click', () => done());
  el.querySelector('.quit').addEventListener('click', () => close(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); done(); }
    if (e.key === 'Escape') close(false);
  });

  // 글자마다 뜬 정도 (0~1). 지운 글자는 잠깐 남아 풀린다
  let live = [], ghosts = [], open = false, s = P.stitch, cols = 40, lines = 4;
  function sync() {
    const next = [...input.value];
    let k = 0;
    while (k < next.length && k < live.length && live[k].ch === next[k]) k++;
    ghosts = next.length < live.length ? live.slice(k).map((c) => ({ ...c })) : [];
    live = live.slice(0, k).concat(next.slice(k).map((ch) => ({ ch, r: reduceMotion ? 1 : 0 })));
    draw();
    on.input?.(input.value);
  }
  input.addEventListener('input', sync);

  // 자리 나누기: 가로 화면은 왼쪽 틀 + 오른쪽 판, 세로 화면은 위 틀 + 아래 판. 키보드가 올라오면 보이는 만큼만
  let box = { w: 600, h: 400 };
  function layoutRoom() {
    const vv = window.visualViewport;
    const W = vv ? vv.width : innerWidth, H = vv ? vv.height : innerHeight;
    Object.assign(el.style, { left: (vv ? vv.offsetLeft : 0) + 'px', top: (vv ? vv.offsetTop : 0) + 'px', width: W + 'px', height: H + 'px' });
    const wide = W > H * 0.95;
    el.classList.toggle('tall', !wide);
    const m = R.margin;
    if (wide) {
      const side = Math.min(R.side, W * 0.36);
      box = { w: W - side - m * 2 - 34 - R.plate * 2, h: H - m * 2 - R.plate * 2 }; // 34 = 판 사이
      wheel.resize(Math.max(110, Math.min(R.wheel, side - 80, H * 0.36)));
    } else {
      // 아래 판을 먼저 그리고, 남은 높이를 뜨개틀에 (판이 화면 밖으로 넘치지 않게)
      wheel.resize(Math.max(96, Math.min(R.wheel, H * 0.2, W * 0.4)));
      box = { w: W - m * 2 - R.plate * 2, h: H - el.querySelector('.side').offsetHeight - m * 2 - 34 - R.plate * 2 };
    }
    fit();
    draw();
    // 옆(아래) 판을 뜨개틀 장식 틀과 같은 높이(폭)로 맞춘다
    const side = el.querySelector('.side'), lw = cv.offsetWidth + R.plate * 2, lh = cv.offsetHeight + R.plate * 2;
    side.style.height = wide ? lh + 'px' : '';
    side.style.width = wide ? '' : lw + 'px';
    requestAnimationFrame(deco); // 자리가 정해진 뒤 장식 틀을 그린다
  }
  // 코 크기: 화면 크기로 한 번만 정한다 (쓰는 동안 글자 수에 따라 천이 바뀌지 않게).
  // 가장 긴 메모(입력 칸 최대 글자 수)가 들어가는 가장 큰 코. 천은 틀을 꽉 채운다
  function fit() {
    const F = P.frame, longest = '가'.repeat(Number(input.maxLength) > 0 ? input.maxLength : 60);
    for (const k of R.sizes) {
      s = k;
      cols = Math.floor((box.w - F * 2) / s);
      lines = Math.floor(((box.h - F * 2 - s * 3.8) / s - 2) / (P.rows + 2));
      if (lines >= layout(longest, P.rows, cols).lines.length + 1) break; // 한 줄 여유 (낱말 줄바꿈)
    }
  }
  function draw() {
    const all = live.concat(ghosts);
    drawFabric(cv, all.map((c) => c.ch).join(''), {
      s, rows: P.rows, cols, minLines: Math.max(1, lines), frame: P.frame, knot: true, center: true, needle: P.needle, // 처음부터 다 뜬 천 (글자만 진한 코로)
      ...fabricColors(yarnTones(on.hue())), reveal: all.map((c) => c.r),
    });
  }
  // 장식 틀: 레퍼런스처럼 종이 위에 손으로 그은 이중선 판 (뜨개틀 둘레 + 오른쪽 아치 판)
  const dc = el.querySelector('.deco');
  function deco() {
    const W = el.clientWidth, H = el.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    dc.width = W * dpr; dc.height = H * dpr;
    dc.style.width = W + 'px'; dc.style.height = H + 'px';
    const c = dc.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#efe9dc';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round';
    // 자리는 offset으로 잰다 (열릴 때 뜨개방이 살짝 커졌다 줄어드는 동안에도 어긋나지 않게)
    const box = (q, g) => ({ x: q.offsetLeft - g, y: q.offsetTop - g, w: q.offsetWidth + g * 2, h: q.offsetHeight + g * 2 });
    // 뜨개틀 둘레: 또렷한 이중선 + 모서리 장식 원
    plate(c, box(loom, R.plate), 0);
    // 옆(아래) 판: 위가 둥근 아치 이중선 + 양옆 좁은 기둥
    const b = box(el.querySelector('.side'), 0);
    const rr = Math.min(b.w / 2, b.h / 2, 70);
    for (const [g, lw] of [[0, 1.6], [7, 1]]) {
      c.lineWidth = lw;
      arch(c, b.x + g, b.y + g, b.w - g * 2, b.h - g * 2, rr - g);
      c.stroke();
    }
    // 기둥: 연한 남색 색면 + 이중선
    for (const x of [b.x + 16, b.x + b.w - 26]) {
      const y0 = b.y + rr + 18, y1 = b.y + b.h - 18;
      c.fillStyle = '#d9d6e8'; c.fillRect(x, y0, 10, y1 - y0);
      c.lineWidth = 1; wob(c, [[x, y0], [x + 10, y0], [x + 10, y1], [x, y1]], true); c.stroke();
      wob(c, [[x + 5, y0 + 6], [x + 5, y1 - 6]]); c.stroke();
    }
  }
  const INK = '#3a3766';
  function arch(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x, y + h); c.lineTo(x, y + r);
    c.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    c.lineTo(x + w - r, y); c.arc(x + w - r, y + r, r, Math.PI * 1.5, 0);
    c.lineTo(x + w, y + h); c.closePath();
  }
  function plate(c, a) {
    c.lineWidth = 1.6; wob(c, [[a.x, a.y], [a.x + a.w, a.y], [a.x + a.w, a.y + a.h], [a.x, a.y + a.h]], true); c.stroke();
    c.lineWidth = 1; wob(c, [[a.x + 6, a.y + 6], [a.x + a.w - 6, a.y + 6], [a.x + a.w - 6, a.y + a.h - 6], [a.x + 6, a.y + a.h - 6]], true); c.stroke();
    for (const [x, y] of [[a.x, a.y], [a.x + a.w, a.y], [a.x, a.y + a.h], [a.x + a.w, a.y + a.h]]) {
      c.fillStyle = '#efe9dc'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.lineWidth = 1.4; c.stroke();
      c.fillStyle = '#d9d6e8'; c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill(); c.lineWidth = 1; c.stroke();
    }
  }
  window.visualViewport?.addEventListener('resize', () => open && layoutRoom());
  addEventListener('resize', () => open && layoutRoom());

  let hue = -1;
  function update(dt) {
    if (!open) return;
    wheel.update(dt);
    let moving = false;
    for (const c of live) if (c.r < 1) { c.r = Math.min(1, c.r + dt / P.charTime); moving = true; }
    for (const c of ghosts) { c.r = Math.max(0, c.r - dt / P.unravelTime); moving = true; }
    if (ghosts.length && ghosts.every((c) => c.r <= 0)) ghosts = [];
    const h = Math.round(on.hue()); // 실 색을 바꾸면 천 색이 바로 바뀐다
    if (moving || h !== hue) { hue = h; draw(); }
  }

  /** 뜨개방 열기. text = 쓰다 만 글 (다시 고칠 때) */
  function show(text = input.value) {
    input.value = text;
    live = [];
    ghosts = [];
    open = true;
    el.classList.add('on');
    wheel.setHue(on.hue());
    on.setHue(wheel.hue()); // 실 색을 가장 가까운 실뭉치 색으로 맞춘다
    layoutRoom();
    sync();
    for (const c of live) c.r = 1; // 다시 열 때는 이미 떠 있다
    draw();
    input.focus({ preventScroll: true });
  }
  function close(discard) {
    if (!open) return;
    open = false;
    el.classList.remove('on');
    input.blur();
    if (discard) input.value = '';
    on.close?.(discard ? '' : input.value.trim());
    on.input?.('');
  }
  // 다 떴어요: 글이 없으면 틀이 흔들린다
  function done() {
    const text = input.value.trim();
    if (!text) { loom.classList.remove('shake'); void loom.offsetWidth; loom.classList.add('shake'); input.focus(); return; }
    open = false;
    el.classList.remove('on');
    el.classList.add('leave');
    setTimeout(() => el.classList.remove('leave'), 600);
    input.blur();
    input.value = '';
    on.input?.('');
    on.done(text);
  }

  // 종이 결 (정원 후처리와 같은 섬유 + 점)
  el.querySelector('.grain').style.backgroundImage = `url(${paper()})`;

  return {
    el, show, close, update,
    found(t) { foundEl.textContent = t; },
    get open() { return open; },
  };
}

function paper() {
  const n = 256, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const c = cv.getContext('2d');
  let r = 99;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const x = rand() * n, y = rand() * n, a = rand() * Math.PI, l = 2 + rand() * 9, g = 120 + rand() * 80;
    c.strokeStyle = `rgba(${g},${g - 6},${g + 20},${0.12 + rand() * 0.2})`;
    c.lineWidth = 0.5 + rand() * 0.6;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      c.beginPath(); c.moveTo(x + ox, y + oy); c.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); c.stroke();
    }
  }
  for (let i = 0; i < 2600; i++) { c.fillStyle = rand() < 0.5 ? 'rgba(58,55,102,0.08)' : 'rgba(255,255,255,0.25)'; c.fillRect(rand() * n, rand() * n, 1, 1); }
  return cv.toDataURL();
}
