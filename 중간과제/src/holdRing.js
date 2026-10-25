// 꾹 누르는 동안 손가락 둘레에 감기는 실 고리.
// 오래 누를수록 고리가 차오르고, 칸(줄무늬, 그래니)을 넘을 때마다 톡 튀며 가운데 견본이 바뀐다.
// 처음 두 번만 "더 오래 누르면 촘촘해져요" 힌트.
import { config } from './config.js';

const NS = 'http://www.w3.org/2000/svg';
const R = 30; // 고리 반지름 (px)
const C = 2 * Math.PI * R;

// 가운데 견본 3종 (잉크 선으로 그린 작은 뜨개 조각)
const SWATCH = {
  mesh: '<path d="M-11 -11 L11 11 M11 -11 L-11 11 M-11 0 L0 -11 L11 0 L0 11 Z" />',
  stripe: '<path d="M-11 -7 H11 M-11 0 H11 M-11 7 H11" /><path d="M-8 -10 l2 3 l2 -3 M2 -10 l2 3 l2 -3 M-8 -3 l2 3 l2 -3 M2 -3 l2 3 l2 -3 M-8 4 l2 3 l2 -3 M2 4 l2 3 l2 -3" stroke-width="1.2" />',
  granny: '<rect x="-11" y="-11" width="22" height="22" rx="2" /><rect x="-6.5" y="-6.5" width="13" height="13" rx="1.5" /><circle r="2.6" />',
};

export function makeHoldRing() {
  const P = config.press;
  const el = document.createElement('div');
  el.className = 'holdring';
  el.innerHTML = `
    <svg width="${R * 2 + 24}" height="${R * 2 + 24}" viewBox="${-R - 12} ${-R - 12} ${R * 2 + 24} ${R * 2 + 24}">
      <circle class="paper" r="${R + 9}" />
      <circle class="track" r="${R}" />
      <circle class="yarn" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90)" />
      <g class="ticks"></g>
      <g class="swatch"></g>
    </svg>
    <div class="hint">더 오래 누르면 촘촘해져요</div>`;
  document.body.appendChild(el);
  const yarn = el.querySelector('.yarn');
  const swatch = el.querySelector('.swatch');
  const hint = el.querySelector('.hint');

  // 칸 표시: 줄무늬, 그래니가 되는 지점에 작은 매듭
  const ticks = el.querySelector('.ticks');
  for (const at of [P.stripeAt, P.grannyAt]) {
    const a = (at / P.grannyAt) * Math.PI * 2 - Math.PI / 2;
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', (Math.cos(a) * R).toFixed(1));
    c.setAttribute('cy', (Math.sin(a) * R).toFixed(1));
    c.setAttribute('r', '3.2');
    ticks.appendChild(c);
  }

  let type = null;
  function setType(t) {
    if (t === type) return;
    const first = type === null;
    type = t;
    swatch.innerHTML = SWATCH[t];
    if (!first) { // 칸을 넘었다: 톡
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
  }

  return {
    // x, y: 누른 자리. 짜이는 조각과 손가락을 가리지 않게 오른쪽 위로 비켜 띄운다 (화면 안에서).
    show(x, y, touch, color) {
      const off = touch ? R * 2.6 : R * 2.1;
      const m = R + 16;
      el.style.left = Math.min(innerWidth - m, Math.max(m, x + off)) + 'px';
      el.style.top = Math.min(innerHeight - m - 30, Math.max(m, y - off)) + 'px';
      el.style.setProperty('--ring', color);
      type = null;
      setType('mesh');
      yarn.setAttribute('stroke-dashoffset', C);
      // 힌트는 처음 두 번만
      let n = 0;
      try { n = Number(localStorage.getItem('memo.holdHint')) || 0; } catch (e) { /* 저장 못 해도 괜찮다 */ }
      hint.hidden = n >= 2;
      try { localStorage.setItem('memo.holdHint', String(n + 1)); } catch (e) { /* 무시 */ }
      el.classList.add('on');
    },
    // sec: 누른 시간, t: 지금 짜임
    set(sec, t) {
      const k = Math.min(1, sec / P.grannyAt);
      yarn.setAttribute('stroke-dashoffset', (C * (1 - k)).toFixed(1));
      setType(t);
    },
    hide() {
      el.classList.remove('on', 'pop');
    },
  };
}
