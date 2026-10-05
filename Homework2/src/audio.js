// 소리
const SFX = {
  ctx: null,
  master: null,
  noise: null,
  muted: false,
  blow: null,
  o2: null,
};

const userActive = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;

function audioInit() {
  if (!userActive()) return;
  if (SFX.ctx) {
    if (SFX.ctx.state === 'suspended') SFX.ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  SFX.ctx = ctx;
  SFX.master = ctx.createGain();
  SFX.master.gain.value = SFX.muted ? 0 : CONFIG.sense.volume;
  SFX.master.connect(ctx.destination);

  // 노이즈
  const len = ctx.sampleRate * 2;
  SFX.noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = SFX.noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  // 입김
  const bSrc = loopNoise();
  const bF = ctx.createBiquadFilter();
  bF.type = 'bandpass';
  bF.frequency.value = 600;
  bF.Q.value = 0.7;
  const bG = ctx.createGain();
  bG.gain.value = 0;
  bSrc.connect(bF).connect(bG).connect(SFX.master);
  SFX.blow = { f: bF, g: bG };

  // 산소 부족
  const oSrc = loopNoise();
  const oF = ctx.createBiquadFilter();
  oF.type = 'lowpass';
  oF.frequency.value = 260;
  const oG = ctx.createGain();
  oG.gain.value = 0;
  oSrc.connect(oF).connect(oG).connect(SFX.master);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 170;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 4;
  lfo.connect(lfoG).connect(osc.frequency);
  const sG = ctx.createGain();
  sG.gain.value = 0;
  osc.connect(sG).connect(SFX.master);
  osc.start();
  lfo.start();
  SFX.o2 = { f: oF, g: oG, osc, sG, lfo };
}

function loopNoise() {
  const src = SFX.ctx.createBufferSource();
  src.buffer = SFX.noise;
  src.loop = true;
  src.start();
  return src;
}

function setMuted(m) {
  SFX.muted = m;
  if (SFX.master) {
    SFX.master.gain.setTargetAtTime(m ? 0 : CONFIG.sense.volume, SFX.ctx.currentTime, 0.05);
  }
}

// 입김
function sfxBlow(v) {
  if (!SFX.ctx) return;
  const t = SFX.ctx.currentTime;
  SFX.blow.g.gain.setTargetAtTime(Math.pow(v, 1.4) * 0.55, t, 0.05);
  SFX.blow.f.frequency.setTargetAtTime(400 + v * 1100, t, 0.08);
}

// 산소
function sfxO2(v, on) {
  if (!SFX.ctx) return;
  const t = SFX.ctx.currentTime;
  SFX.o2.g.gain.setTargetAtTime(on ? 0.04 + v * 0.22 : 0, t, on ? 0.1 : 0.25);
  SFX.o2.sG.gain.setTargetAtTime(on ? v * 0.05 : 0, t, on ? 0.1 : 0.25);
  SFX.o2.osc.frequency.setTargetAtTime(170 - v * 80, t, 0.1);
  SFX.o2.lfo.frequency.setTargetAtTime(5 + v * 9, t, 0.1);
  SFX.o2.f.frequency.setTargetAtTime(260 - v * 140, t, 0.1);
}

function burst(type, freq, q, gain, att, dec, delay = 0) {
  const ctx = SFX.ctx;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = SFX.noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
  src.connect(f).connect(g).connect(SFX.master);
  src.start(t, Math.random() * 1.5);
  src.stop(t + att + dec + 0.05);
}

// 치직
function sfxSizzle() {
  if (!SFX.ctx) return;
  burst('highpass', 3200, 0.7, 0.35, 0.004, 0.32);
  burst('bandpass', 6000, 2, 0.2, 0.002, 0.12, 0.03);
  for (let i = 0; i < 5; i++) {
    burst('bandpass', 2500 + Math.random() * 4000, 4, 0.3, 0.001, 0.02, 0.05 + Math.random() * 0.3);
  }
}

// 훅
function sfxPuff() {
  if (!SFX.ctx) return;
  burst('lowpass', 700, 0.5, 0.5, 0.01, 0.35);
}

// 성냥
function sfxStrike() {
  if (!SFX.ctx) return;
  burst('bandpass', 2200, 1.2, 0.45, 0.005, 0.14);
  burst('bandpass', 3500, 3, 0.25, 0.002, 0.05, 0.06);
  burst('lowpass', 380, 0.7, 0.4, 0.25, 0.7, 0.1);
}

function buzz(ms) {
  if (navigator.vibrate && userActive()) {
    try {
      navigator.vibrate(ms);
    } catch (e) {}
  }
}
