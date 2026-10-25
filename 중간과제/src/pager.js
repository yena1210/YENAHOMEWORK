import { config } from './config.js';
// 나무 넘기기 표시: 화면 위 가운데 작은 종이 쪽지 "‹ 나무 1 / 2 ›". 나무가 두 그루 이상일 때만.
export function makePager(go) {
  const el = document.createElement('div');
  el.className = 'pager';
  el.innerHTML = '<button type="button" class="prev" aria-label="앞 나무">‹</button><span></span><button type="button" class="next" aria-label="다음 나무">›</button>';
  document.body.appendChild(el);
  const label = el.querySelector('span'), prev = el.querySelector('.prev'), next = el.querySelector('.next');
  let at = 0, n = 1;
  prev.addEventListener('click', () => go(at - 1));
  next.addEventListener('click', () => go(at + 1));

  let today = 0;
  function update(i, count) {
    at = i;
    n = count;
    // 한 그루면 화살표 없이 "오늘 챙길 것"만
    // 정원이 여러 쪽이면 "정원 2 · 나무 1/3", 한 쪽이면 "나무 2 / 3"
    const per = config.trees.perPage, pg = Math.floor(i / per), pages = Math.ceil(n / per);
    const inPage = Math.min(per, n - pg * per), k = i - pg * per;
    const where = pages > 1 ? `정원 ${pg + 1} · 나무 ${k + 1}/${inPage}` : `나무 ${i + 1} / ${n}`;
    label.textContent = n > 1 ? where + (today ? ` · 오늘 ${today}` : '') : `오늘 챙길 것 ${today}개`;
    prev.hidden = next.hidden = n <= 1;
    prev.disabled = i <= 0;
    next.disabled = i >= n - 1;
    el.classList.toggle('on', n > 1 || today > 0);
  }
  // 옆 나무로 넘겨 보라고 화살표가 톡톡
  function nudge() {
    next.classList.remove('nudge');
    void next.offsetWidth;
    next.classList.add('nudge');
  }
  // 오늘 챙길 것 (오늘인 꽃, 오늘 마감, 깨어난 알림) 수. 나무가 한 그루여도 있으면 쪽지를 띄운다
  function badge(k) {
    if (k === today) return;
    today = k;
    update(at, n);
    el.classList.toggle('on', n > 1 || k > 0);
  }
  return { update, nudge, badge };
}
