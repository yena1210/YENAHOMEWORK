// 바구니 창: 바구니를 톡 누르면 간직한 메모가 종이 위에 목록으로 뜬다.
// 바구니 안에서 뒤에 가리거나 아래 깔린 것도 여기서 다 보인다. 줄마다 "다시 짜기"(나무로) / "꺼내기"(땅으로).
import * as THREE from 'three';
import { config } from './config.js';

export function makeBasketView(camera, balls, on) {
  const el = document.createElement('div');
  el.className = 'basketview';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', '간직한 메모');
  document.body.appendChild(el);
  let open = false, pick = null, msg = '';
  const v = new THREE.Vector3();

  // 줄 하나: 실 색 점 + 글 + 날짜·장식 뜻 + 버튼 둘
  function row(b) {
    const m = b.m;
    const r = document.createElement('div');
    r.className = 'row' + (b === pick ? ' pick' : '');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = m.color;
    const body = document.createElement('div');
    body.className = 'body';
    const t = document.createElement('div');
    t.textContent = m.text;
    const d = new Date(m.made), name = config.deco.names[m.deco];
    const day = document.createElement('div');
    day.className = 'day';
    day.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일` + (name ? ` · ${name}` : '');
    body.append(t, day);
    const btns = document.createElement('div');
    btns.className = 'btns';
    for (const [label, act] of [['다시 짜기', 'restore'], ['꺼내기', 'out'], ['버리기', 'discard']]) {
      const k = document.createElement('button');
      k.type = 'button';
      k.textContent = label;
      k.addEventListener('click', (e) => {
        e.stopPropagation();
        // 버리기는 한 번 더 눌러야 (실수로 지우지 않게)
        if (act === 'discard' && !k.dataset.sure) { k.dataset.sure = '1'; k.textContent = '정말 버려요?'; setTimeout(() => { delete k.dataset.sure; k.textContent = label; }, 2500); return; }
        on[act]?.(b);
      });
      btns.append(k);
    }
    r.append(dot, body, btns);
    // 줄을 누르면 바구니 속 그 실뭉치가 반짝인다
    r.addEventListener('click', () => { pick = pick === b ? null : b; render(); });
    return r;
  }

  function render() {
    const list = balls.keptList();
    if (pick && !list.includes(pick)) pick = null;
    for (const b of balls.list) b.pick = b === pick;
    const top = el.querySelector('.list')?.scrollTop || 0; // 다시 그려도 스크롤 자리는 그대로
    el.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'head';
    head.textContent = list.length ? `간직한 실뭉치 ${list.length}개` : '간직한 실뭉치';
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'x';
    x.setAttribute('aria-label', '닫기');
    x.textContent = '×';
    x.addEventListener('click', hide);
    head.append(x);
    el.append(head);
    if (msg) {
      const p = document.createElement('div');
      p.className = 'msg';
      p.textContent = msg;
      el.append(p);
    }
    if (!list.length) {
      const p = document.createElement('div');
      p.className = 'empty';
      p.textContent = '실뭉치를 들어서 바구니에 넣으면 여기에 모여요';
      el.append(p);
    }
    const box = document.createElement('div');
    box.className = 'list';
    for (const b of list) box.append(row(b));
    el.append(box);
    // 창은 4줄 높이로 고정, 5개부터는 안에서 스크롤 (아래가 흐려져서 더 있다는 걸 알려 준다)
    const rows = [...box.children];
    const many = rows.length > config.basket.viewRows;
    box.style.maxHeight = many ? rows.slice(0, config.basket.viewRows).reduce((h, r) => h + r.offsetHeight, 0) + 'px' : '';
    box.classList.toggle('more', many);
    box.scrollTop = top;
    place();
  }

  // 바구니 위쪽에 띄운다 (화면 밖으로 나가지 않게)
  function place() {
    if (!open) return;
    v.copy(balls.basketAt).setY(config.basket.h + 0.2).project(camera);
    const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
    const w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.min(Math.max(16, sx - w / 2), innerWidth - 16 - w);
    const y = Math.min(Math.max(16, sy - h - 24), innerHeight - 90 - h);
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function show(b = null) {
    open = true;
    pick = b;
    msg = '';
    el.classList.add('on');
    render();
  }
  function hide() {
    open = false;
    pick = null;
    for (const b of balls.list) b.pick = false;
    el.classList.remove('on');
  }

  return {
    show, hide, render, place,
    say(t) { msg = t; render(); },
    get open() { return open; },
  };
}
