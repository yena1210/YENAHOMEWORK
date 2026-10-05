// 렌더
const R = {
  sh: {},
  fb: {},
  bg: null,
  cand: null,
};

function initRender() {
  R.sh.flame = buildFilterShader(flameSrc);
  R.sh.bright = buildFilterShader(brightSrc);
  R.sh.blur = buildFilterShader(blurSrc);
  R.sh.comp = buildFilterShader(compSrc);
  resizeRender();
}

function makeFb(w, h) {
  return createFramebuffer({
    width: Math.max(2, Math.round(w)),
    height: Math.max(2, Math.round(h)),
    density: 1,
    depth: false,
    antialias: false,
  });
}

function resizeRender(scale) {
  if (scale) CONFIG.flameRes = scale;
  const pd = pixelDensity();
  const W = width * pd;
  const H = height * pd;
  for (const k in R.fb) R.fb[k].remove();
  const f = CONFIG.flameRes;
  const b = CONFIG.bloomRes;
  R.fb = {
    flame: makeFb(W * f, H * f),
    bA: makeFb(W * b, H * b),
    tA: makeFb(W * b, H * b),
    tB: makeFb(W * b * 0.5, H * b * 0.5),
    bB: makeFb(W * b * 0.5, H * b * 0.5),
    tC: makeFb(W * b * 0.25, H * b * 0.25),
    bC: makeFb(W * b * 0.25, H * b * 0.25),
  };
}

function runPass(sh, fb, set) {
  fb.draw(() => {
    clear();
    noStroke();
    shader(sh);
    sh.setUniform('canvasSize', [fb.width, fb.height]);
    sh.setUniform('texelSize', [1 / fb.width, 1 / fb.height]);
    set(sh);
    plane(fb.width, fb.height);
  });
}

function blurPass(src, tmp, dst, spread) {
  runPass(R.sh.blur, tmp, (s) => {
    s.setUniform('uSrc', src);
    s.setUniform('uDir', [spread / tmp.width, 0]);
  });
  runPass(R.sh.blur, dst, (s) => {
    s.setUniform('uSrc', tmp);
    s.setUniform('uDir', [0, spread / dst.height]);
  });
}

function renderFrame(st, fx) {
  const t = now();
  const fb = R.fb;
  const F = CONFIG.flame;

  // 1) 불꽃
  runPass(R.sh.flame, fb.flame, (s) => {
    s.setUniform('uTime', t);
    s.setUniform('uBase', [lay.wickX / width, lay.flameY / height]);
    s.setUniform('uH', lay.flameH / height);
    s.setUniform('uAspect', width / height);
    s.setUniform('uScale', [st.sx, st.sy]);
    s.setUniform('uLean', st.lean);
    s.setUniform('uCut', st.cut);
    s.setUniform('uInt', st.inten);
    s.setUniform('uWidth', F.width);
    s.setUniform('uFlick', F.flicker * st.flick);
    s.setUniform('uNScale', F.noiseScale);
    s.setUniform('uNSpeed', F.noiseSpeed);
    s.setUniform('uCore', st.cCore);
    s.setUniform('uMid', st.cMid);
    s.setUniform('uOut', st.cOut);
    s.setUniform('uBlueCol', CONFIG.color.blue);
    s.setUniform('uBlue', st.blue);
    s.setUniform('uEmber', st.ember);
  });
  if (fx) {
    fb.flame.draw(() => {
      push();
      resetShader();
      scale(fb.flame.width / width, fb.flame.height / height);
      translate(-width / 2, -height / 2);
      blendMode(ADD);
      fx();
      pop();
    });
  }

  // 2) 블룸
  runPass(R.sh.bright, fb.bA, (s) => {
    s.setUniform('uSrc', fb.flame);
    s.setUniform('uSrcTexel', [1 / fb.flame.width, 1 / fb.flame.height]);
    s.setUniform('uTh', CONFIG.bloom.threshold);
  });
  blurPass(fb.bA, fb.tA, fb.bA, 1.2);
  blurPass(fb.bA, fb.tB, fb.bB, 1.6);
  blurPass(fb.bB, fb.tC, fb.bC, 2.0);
  blurPass(fb.bC, fb.tC, fb.bC, 2.6);

  // 3) 합성
  const B = CONFIG.bloom;
  const Lc = CONFIG.light;
  const pulse = st.pulse;
  const k = Math.max(st.light, 0.0);
  push();
  noStroke();
  shader(R.sh.comp);
  const s = R.sh.comp;
  s.setUniform('canvasSize', [width, height]);
  s.setUniform('uTime', t);
  s.setUniform('uBg', R.bg);
  s.setUniform('uCand', R.cand);
  s.setUniform('uFlame', fb.flame);
  s.setUniform('uB1', fb.bA);
  s.setUniform('uB2', fb.bB);
  s.setUniform('uB3', fb.bC);
  s.setUniform('uBloomK', [B.k1 * pulse, B.k2 * pulse, B.k3 * pulse]);
  s.setUniform('uLightPos', [st.lx / width, st.ly / height]);
  s.setUniform('uAspect', width / height);
  s.setUniform('uLight', k);
  s.setUniform('uExpo', st.expo);
  s.setUniform('uWarm', st.warm);
  s.setUniform('uMoon', CONFIG.color.moon);
  s.setUniform('uLRad', Lc.lightRadius * pulse);
  s.setUniform('uHaze', Lc.haze);
  s.setUniform('uFGain', Lc.flameGain);
  s.setUniform('uCandTop', lay.candTop / height);
  s.setUniform('uGlass', st.glass);
  s.setUniform('uGlassA', st.glassA);
  s.setUniform('uRes', [width, height]);
  s.setUniform('uFrost', st.frost);
  s.setUniform('uDrops', CONFIG.l3.drops);
  plane(width, height);
  pop();
}
