// 손 입력 판단: 톡 / 꾹 / 끌기 (마우스, 트랙패드, 터치를 포인터 하나로)
// 톡 = 짧게 누르고 뗌, 꾹 = 움직이지 않고 holdMs 이상, 끌기 = dragPx 이상 움직임
// 톡톡 = 톡 뒤 doubleMs 안에 같은 자리를 또 톡 (첫 톡은 기다리지 않고 바로 tap으로 보낸다)
import { config } from './config.js';

export function makeGesture(el, on) {
  let p = null; // 지금 누르고 있는 손가락
  let last = null; // 마지막 톡 (톡톡 판단용)

  el.addEventListener('pointerdown', (e) => {
    if (p || (e.pointerType === 'mouse' && e.button !== 0)) return;
    p = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), state: 'down', e };
    el.setPointerCapture(e.pointerId);
    p.timer = setTimeout(() => {
      if (p && p.state === 'down') { p.state = 'hold'; on.holdStart?.(p.e, p); }
    }, config.input.holdMs);
  });

  el.addEventListener('pointermove', (e) => {
    if (!p || e.pointerId !== p.id) return;
    p.e = e;
    const d = Math.hypot(e.clientX - p.x, e.clientY - p.y);
    if (p.state === 'down' && d > config.input.dragPx) {
      clearTimeout(p.timer);
      p.state = 'drag';
      on.dragStart?.(e, p);
    }
    if (p.state === 'drag') on.drag?.(e, p);
    if (p.state === 'hold') on.holdMove?.(e, p);
  });

  const end = (e) => {
    if (!p || e.pointerId !== p.id) return;
    clearTimeout(p.timer);
    const held = (performance.now() - p.t) / 1000;
    if (p.state === 'down') {
      const I = config.input, now = performance.now();
      if (last && now - last.t < I.doubleMs && Math.hypot(e.clientX - last.x, e.clientY - last.y) < I.doublePx) {
        last = null;
        on.doubleTap?.(e, p);
      } else {
        last = { t: now, x: e.clientX, y: e.clientY };
        on.tap?.(e, p);
      }
    } else last = null;
    if (p.state === 'hold') on.holdEnd?.(e, p, held);
    if (p.state === 'drag') on.dragEnd?.(e, p);
    p = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  return { get pressing() { return p; } };
}
