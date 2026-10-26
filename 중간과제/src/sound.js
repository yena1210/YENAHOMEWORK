// 소리: 파일 없이 Web Audio 로 만든 오르골 배경 음악.
// 3/4박 느린 왈츠(F장조)를 오르골 소리로.
// 브라우저는 사람이 한 번 누르기 전에는 소리를 못 내므로 첫 톡에서 시작한다.
import { config } from './config.js';

const S = config.sound;
const hz = (m) => 440 * 2 ** ((m - 69) / 12); // 미디 번호 → 주파수
// F장조 음계 (미디 번호): 멜로디가 고르는 음
const SCALE = [65, 67, 69, 70, 72, 74, 76, 77, 79, 81, 82, 84, 86, 88, 89];
// 화음 진행 (한 마디에 하나): F - Dm - B♭ - C - F - Am - B♭ - C
const CHORDS = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55], [53, 57, 60], [45, 48, 52], [46, 50, 53], [48, 52, 55]];
// 한 마디 리듬 (박자 위치, 3박)
const RHYTHMS = [[0, 1, 2], [0, 2], [0, 1.5, 2], [0, 1, 1.5, 2], [0], [0, 1]];

export function makeSound() {
  let ctx = null, master = null, music = null, verb = null;
  let on = true, started = false;
  try { on = localStorage.getItem('memo.sound') !== 'off'; } catch (e) { /* 무시 */ }

  // 처음 한 번: 소리 길 만들기 (오르골 → 울림(잔향) → 부드럽게 깎기 → 스피커)
  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); // 여러 음이 겹쳐도 찢어지지 않게
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = S.bright;
    master = ctx.createGain();
    master.gain.value = on ? S.volume : 0;
    soft.connect(comp).connect(master).connect(ctx.destination);
    // 잔향: 점점 작아지는 잡음을 울림 모양으로 쓴다 (방 안 오르골처럼)
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * S.verbSec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    verb.buffer = buf;
    const wet = ctx.createGain();
    wet.gain.value = S.wet;
    verb.connect(wet).connect(soft);
    music = ctx.createGain();
    music.gain.value = 0;
    music.connect(soft);
    music.connect(verb);
    return true;
  }

  // 오르골 음 하나: 맑은 기본음 + 살짝 어긋난 겹음(반짝임) + 아주 짧은 쇳소리
  function bell(t, m, vel, out, ring = 1) {
    const f = hz(m), dec = S.decay * ring * (523 / f) ** 0.35; // 높은 음일수록 짧게
    const parts = [[1, 1, 1], [1.0017, 0.35, 1], [2, 0.16, 0.5], [5.4, 0.05, 0.08]]; // [배수, 크기, 길이]
    for (const [k, a, l] of parts) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f * k;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel * a, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, dec * l / 4);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dec * l * 2 + 0.05);
    }
  }
  // ── 배경 왈츠: 8마디 가락을 만들어 A A B A 로 되풀이 (B는 돌 때마다 새로) ──
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  function phrase() {
    const out = []; // [마디 안 박, 마디, 음, 세기]
    let at = 7; // SCALE 안 위치 (C6 근처에서 시작)
    for (let bar = 0; bar < 8; bar++) {
      const chord = CHORDS[bar];
      // 마지막 마디는 길게 쉬어 숨을 쉰다
      const rh = bar === 7 ? [0] : RHYTHMS[Math.floor(rnd() * RHYTHMS.length)];
      for (const b of rh) {
        if (b === 0) {
          // 센박: 화음 음으로 (가까운 것)
          const fits = SCALE.map((m, i) => [m, i]).filter(([m]) => chord.some((c) => (m - c) % 12 === 0));
          fits.sort((p, q) => Math.abs(p[1] - at) - Math.abs(q[1] - at) + (rnd() - 0.5) * 2);
          at = fits[0][1];
        } else {
          at = Math.max(2, Math.min(SCALE.length - 2, at + [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)])); // 이웃 음으로 걸음
        }
        out.push([b, bar, SCALE[at], b === 0 ? 0.32 : 0.22]);
      }
    }
    return out;
  }
  const A = phrase();
  let B = phrase(), part = 0, bar0 = 0; // part: A A B A 중 몇 번째
  const beat = 60 / S.bpm;
  let queue = [];
  function fill(t0) {
    const body = [A, A, B, A][part];
    part = (part + 1) % 4;
    if (part === 0) B = phrase();
    for (const [b, bar, m, v] of body) queue.push({ t: t0 + (bar * 3 + b) * beat, m, v, ring: 1 });
    // 왼손: 마디 첫 박에 뿌리음, 2·3박에 화음 (작게)
    for (let bar = 0; bar < 8; bar++) {
      const c = CHORDS[bar], t = t0 + bar * 3 * beat;
      queue.push({ t, m: c[0] + 12, v: 0.2, ring: 1.6 });
      if (bar < 7) for (const k of [1, 2]) queue.push({ t: t + k * beat, m: c[k] + 12, v: 0.1, ring: 0.8 });
    }
    queue.sort((p, q) => p.t - q.t);
    return t0 + 24 * beat;
  }
  let next = 0;
  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (!next || next < now) next = now + 0.1;
    if (queue.length < 4) next = fill(next);
    while (queue.length && queue[0].t < now + 0.3) {
      const e = queue.shift();
      if (e.t >= now) bell(e.t, e.m, e.v, music, e.ring);
    }
  }

  // 첫 톡: 소리 시작 (음악은 천천히 커진다)
  // 아이패드/아이폰: 무음 모드에서도 들리게 하고, 깨우기에 실패하면 다음 톡에서 다시 시도한다
  function start() {
    if (!ctx) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 무시 */ }
      if (!init()) return;
    }
    if (ctx.state !== 'running') {
      ctx.resume?.();
      // 빈 소리를 한 번 틀어야 깨어나는 기기가 있다
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      src.connect(ctx.destination);
      src.start(0);
    }
    if (started) return;
    started = true;
    const t = ctx.currentTime;
    music.gain.setValueAtTime(0, t);
    music.gain.linearRampToValueAtTime(S.music, t + S.fadeIn);
    setInterval(tick, 80);
  }
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, start, { capture: true });
  // 다른 탭으로 가면 멈춘다
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  // 켜고 끄기: 오른쪽 위 작은 쪽지 (음표)
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'soundbtn';
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V6l10-2v11.5" /><circle cx="6.5" cy="17.5" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" /><path class="off" d="M4 4l16 16" /></svg>';
  const show = () => {
    btn.classList.toggle('muted', !on);
    btn.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기');
    btn.setAttribute('aria-pressed', String(!on));
  };
  show();
  btn.addEventListener('click', () => {
    on = !on;
    try { localStorage.setItem('memo.sound', on ? 'on' : 'off'); } catch (e) { /* 무시 */ }
    show();
    if (!ctx) return;
    master.gain.setTargetAtTime(on ? S.volume : 0, ctx.currentTime, 0.15);
    if (on) tick();
  });
  document.body.appendChild(btn);
}

