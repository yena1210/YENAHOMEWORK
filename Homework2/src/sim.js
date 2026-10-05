// 테스트용 가짜 터치
(() => {
  const q = new URLSearchParams(location.search);
  const mode = q.get('sim');
  const ev = {};
  const at = (f, fn) => (ev[f] = ev[f] || []).push(fn);
  const fire = (type, id, x, y, mouse) => {
    const el = document.querySelector('canvas');
    const pt = mouse ? 'mouse' : 'touch';
    el.dispatchEvent(
      new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, pointerType: pt, bubbles: true, cancelable: true }),
    );
  };
  // 드래그
  const drag = (id, x0, y0, x1, y1, frames, start) => {
    at(start, () => fire('pointerdown', id, x0, y0));
    for (let i = 1; i <= frames; i++) {
      const k = i / frames;
      at(start + i, () => fire('pointermove', id, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k));
    }
    at(start + frames + 1, () => fire('pointerup', id, x1, y1));
  };
  let ready = false;
  window.simTick = (f) => {
    if (!ready) {
      ready = true;
      const W = innerWidth;
      const H = innerHeight;
      const wx = lay.wickX;
      const wy = lay.wickY - lay.flameH * 0.3;
      const s = +(q.get('start') || 30);
      if (mode === 'l1') {
        at(s, () => fire('pointerdown', 1, W * 0.25, H * 0.88));
        at(s + 6, () => fire('pointerdown', 2, wx + 10, wy));
        at(s + 12, () => {
          fire('pointerup', 2, wx + 10, wy);
          fire('pointerup', 1, W * 0.25, H * 0.88);
        });
      }
      if (mode === 'l1mouse') at(s, () => fire('pointerdown', 1, wx, wy, true));
      if (mode === 'l1one') at(s, () => fire('pointerdown', 1, wx, wy));
      if (mode === 'l2w') drag(1, W * 0.3, H * 0.5, W * 0.5, H * 0.5, 14, s);
      if (mode === 'l2s') drag(1, W * 0.1, H * 0.5, W * 0.9, H * 0.48, 9, s);
      if (mode === 'l3') {
        at(s, () => fire('pointerdown', 1, wx, wy));
        at(+(q.get('up') || 99999), () => fire('pointerup', 1, wx, wy));
      }
      if (mode === 'tap') {
        at(s, () => fire('pointerdown', 1, W / 2, H / 2));
        at(s + 2, () => fire('pointerup', 1, W / 2, H / 2));
      }
    }
    (ev[f] || []).forEach((fn) => fn());
    // 추가 탭
    if (f === +q.get('tapAt')) {
      fire('pointerdown', 9, innerWidth / 2, innerHeight * 0.3);
      fire('pointerup', 9, innerWidth / 2, innerHeight * 0.3);
    }
  };
})();
