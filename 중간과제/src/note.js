// 읽기: 메모 글이 조각 옆 종이 위에 떠오른다. 상자 없이 종이색 번짐 + 조각과 잇는 실 색 점선.
// 조각을 가리지 않는 쪽(화면에 자리가 더 많은 쪽)에 두고, 화면 밖으로 나가지 않게 한다.
import * as THREE from 'three';
import { config } from './config.js';
import { dueState, choices, pickType, fromInput } from './due.js';

export function makeNote(camera, memos) {
  const el = document.createElement('div');
  el.className = 'note';
  el.setAttribute('role', 'status'); // 화면 읽기 프로그램이 읽어 준다
  document.body.appendChild(el);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('noteline');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  svg.appendChild(line);
  document.body.appendChild(svg);

  let memo = null, until = 0;
  const c = new THREE.Vector3(), e = new THREE.Vector3();

  // 처음 두 번 읽을 때만 힌트: "톡톡 → 장식", "실 끝을 당기면 풀려요"
  const H = [
    { key: 'memo.decoHint', text: '톡톡 두 번 누르면 장식이 달려요 (날짜, 알림, 체크)', n: 0 },
    { key: 'memo.pullHint', text: '실 끝을 잡아당기면 풀려요', n: 0 },
  ];
  for (const h of H) {
    try { h.n = Number(localStorage.getItem(h.key)) || 0; } catch (err) { /* 저장 못 해도 괜찮다 */ }
  }
  const count = (h, n) => {
    h.n = n;
    try { localStorage.setItem(h.key, String(n)); } catch (err) { /* 무시 */ }
  };

  /** tip = 다 짠 직후 잠깐 보여 줄 안내 (장식 기능) */
  function show(m, sec = 0, tip = '') {
    const again = memo === m && el.classList.contains('on'); // 같은 조각을 다시 그림 (장식이 바뀜)
    const had = H.map((h) => again && [...el.querySelectorAll('.hint')].some((x) => x.textContent === h.text));
    memo = m;
    until = sec ? performance.now() + sec * 1000 : 0; // 0 = 다른 곳을 누를 때까지
    // 글 + 짠 날짜 (작게)
    const d = new Date(m.made);
    el.innerHTML = '';
    // 글: 종이 위에 글자로만
    const t = document.createElement('div');
    t.className = 'text';
    t.textContent = m.text;
    if (dueState(m).checked) t.classList.add('done'); // 체크한 할 일은 줄을 긋는다
    const day = document.createElement('div');
    day.className = 'day';
    // 장식 날짜를 정했으면 그 날을 (D-3, 오늘 마감, 내일 오전 9시에 알려 줄게요), 아니면 장식 뜻을
    const label = dueState(m).label || config.deco.names[m.deco];
    day.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일` + (label ? ` · ${label}` : '');
    const st = dueState(m);
    if (st.urgent || st.ring || st.loose) day.classList.add('soon');
    el.append(t, day);
    // 날짜 고르기: 직접 읽을 때, 장식이 있으면 빠른 선택 칩. 아직 안 정했으면 장식 뜻을 알려 준다
    if (!sec && !m.loose && choices[m.deco] && memos.setDue) {
      if (!m.due) {
        const tip = document.createElement('div');
        tip.className = 'duetip';
        tip.textContent = config.deco.tips[m.deco];
        el.append(tip);
      }
      el.append(chips(m));
    }
    // 힌트: 다 짠 직후가 아니라 직접 읽을 때, 처음 두 번만
    H.forEach((h, i) => {
      if (sec || m.loose || !(again ? had[i] : h.n < 2)) return;
      if (i === 0 && m.deco && !m.due) return; // 장식 안내가 이미 있다
      const x = document.createElement('div');
      x.className = 'hint';
      x.textContent = h.text;
      el.append(x);
      if (!again) count(h, h.n + 1);
    });
    if (tip) {
      const x = document.createElement('div');
      x.className = 'knittip';
      x.textContent = tip;
      el.append(x);
    }
    el.classList.toggle('faint', !!m.loose); // 땅의 실뭉치: 흐릿한 손글씨
    el.style.setProperty('--yarn-note', m.color);
    svg.style.setProperty('--yarn-note', m.color);
    el.classList.add('on');
    svg.classList.add('on');
    place();
  }
  // 빠른 선택 칩: 오늘 / 내일 / ... / 날짜 고르기 (+ 꽃은 매년, 정했으면 지우기)
  function chips(m) {
    const box = document.createElement('div');
    box.className = 'chips';
    const set = (due) => { memos.setDue(m, due); show(m); };
    const chip = (label, on, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (on) b.classList.add('on');
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      box.append(b);
      return b;
    };
    // 태슬 = 체크: 다 했어요 한 칸만
    if (m.deco === 'tassel') {
      const done = !!m.due?.done;
      chip(done ? '✓ 다 했어요' : '다 했어요', done, () => set(done ? null : { done: true, at: Date.now() }));
      return box;
    }
    for (const [label, fn] of choices[m.deco]) chip(label, false, () => set({ at: fn(), set: Date.now() }));
    // 직접 고르기: 칩 위에 투명한 날짜 칸을 겹친다 (아이패드에서 바로 달력이 뜨게)
    const pick = chip(m.deco === 'pompom' ? '시간 고르기' : '날짜 고르기', false, () => {});
    pick.classList.add('pick');
    const inp = document.createElement('input');
    inp.type = pickType[m.deco];
    inp.setAttribute('aria-label', pick.textContent);
    inp.addEventListener('change', () => { const at = fromInput(m.deco, inp.value); if (at) set({ at, set: Date.now() }); });
    pick.append(inp);
    if (m.deco === 'flower' && m.due) chip('매년', !!m.due.yearly, () => set({ ...m.due, yearly: !m.due.yearly }));
    if (m.due) chip('지우기', false, () => set(null));
    return box;
  }

  function hide() {
    memo = null;
    el.classList.remove('on');
    svg.classList.remove('on');
  }

  // 조각의 화면 위치에 맞춰 글 자리를 정한다 (시점이 움직이니 매 프레임)
  function place() {
    if (!memo) return;
    const W = innerWidth, H = innerHeight;
    const r = memos.center(memo, c);
    // 화면 위 조각 중심과 반지름(px)
    e.copy(c).project(camera);
    const sx = (e.x + 1) / 2 * W, sy = (1 - e.y) / 2 * H;
    const d = camera.position.distanceTo(c);
    const rp = (r / d) * (H / 2) / Math.tan((camera.fov * Math.PI) / 360);
    el.style.maxWidth = Math.min(config.read.width, W - 32) + 'px';
    const bw = el.offsetWidth, bh = el.offsetHeight;
    // 조각 바로 옆, 자리가 더 많은 쪽에 (화면 밖으로 나가지 않게)
    const side = sx < W / 2;
    let x = side ? sx + rp + config.read.gap : sx - rp - config.read.gap - bw;
    let y = sy - bh / 2;
    x = Math.min(Math.max(16, x), W - 16 - bw);
    y = Math.min(Math.max(56, y), H - 16 - bh);
    el.style.transform = `translate(${x}px, ${y}px)`;
    // 점선: 조각 가장자리 → 틀 가장자리
    const right = x > sx;
    line.setAttribute('x1', sx + (right ? rp * 0.8 : -rp * 0.8));
    line.setAttribute('y1', sy);
    line.setAttribute('x2', right ? x - 6 : x + bw + 6);
    line.setAttribute('y2', Math.min(Math.max(y + 20, sy), y + bh - 20));
  }

  function update() {
    if (memo && until && performance.now() > until) hide();
    place();
  }

  // 직접 풀어 봤으면 풀기 힌트는 그만
  const pulled = () => count(H[1], 2);

  return { show, hide, update, pulled, get memo() { return memo; }, get pinned() { return memo && !until; } };
}
