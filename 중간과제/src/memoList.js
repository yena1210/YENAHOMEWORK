// 메모 목록: 큰 실뭉치를 길게 누르면 나무에 짜인 메모가 종이 위에 목록으로 뜬다 (최근 것부터).
// 하나를 누르면 그 조각으로 다가가 읽는다 (다른 나무에 있으면 그 나무로 넘겨서).
import { config } from './config.js';
import { dueState } from './due.js';

export function makeMemoList(world, anchor, pick) {
  const el = document.createElement('div');
  el.className = 'basketview memolist';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', '메모 목록');
  document.body.appendChild(el);
  let open = false;

  function render() {
    const all = [];
    world.trees.forEach((t, i) => { for (const m of t.memos.memos) all.push({ m, i }); });
    // 오늘인 것, 깨어난 알림, 지난 마감이 맨 위. 나머지는 최근 것부터
    const hot = (m) => { const s = dueState(m); return s.ring || s.urgent || s.loose ? 0 : 1; };
    all.sort((a, b) => hot(a.m) - hot(b.m) || b.m.made - a.m.made);
    el.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'head';
    head.textContent = all.length ? `메모 ${all.length}개` : '메모';
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'x';
    x.setAttribute('aria-label', '닫기');
    x.textContent = '×';
    x.addEventListener('click', hide);
    head.append(x);
    el.append(head);
    if (!all.length) {
      const p = document.createElement('div');
      p.className = 'empty';
      p.textContent = '아직 짠 메모가 없어요';
      el.append(p);
    }
    const box = document.createElement('div');
    box.className = 'list';
    for (const { m, i } of all) {
      const r = document.createElement('div');
      r.className = 'row';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = m.color;
      const body = document.createElement('div');
      body.className = 'body';
      const t = document.createElement('div');
      t.textContent = m.text;
      const d = new Date(m.made), st = dueState(m), name = st.label || config.deco.names[m.deco];
      if (st.ring || st.urgent || st.loose) r.classList.add('soon');
      const day = document.createElement('div');
      day.className = 'day';
      day.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일` + (name ? ` · ${name}` : '') + (world.trees.length > 1 ? ` · 나무 ${i + 1}` : '');
      body.append(t, day);
      r.append(dot, body);
      r.addEventListener('click', () => { hide(); pick(m, i); });
      box.append(r);
    }
    el.append(box);
    // 창 높이는 고정, 넘치면 안에서 스크롤
    const rows = [...box.children], k = config.basket.viewRows;
    box.style.maxHeight = rows.length > k ? rows.slice(0, k).reduce((h, x) => h + x.offsetHeight, 0) + 'px' : '';
    box.classList.toggle('more', rows.length > k);
    place();
  }
  // 큰 실뭉치 위쪽에
  function place() {
    if (!open) return;
    const a = anchor(), w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.min(Math.max(16, a.x - w / 2), innerWidth - 16 - w);
    const y = Math.min(Math.max(16, a.y - a.r - h - 18), innerHeight - 90 - h);
    el.style.transform = `translate(${x}px, ${y}px)`;
  }
  function show() { open = true; el.classList.add('on'); render(); }
  function hide() { open = false; el.classList.remove('on'); }
  return { show, hide, place, get open() { return open; } };
}
