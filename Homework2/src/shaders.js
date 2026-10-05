// 셰이더

// 불꽃
function flameSrc() {
  const time = uniformFloat('uTime');
  const base = uniformVec2('uBase');
  const fh = uniformFloat('uH');
  const aspect = uniformFloat('uAspect');
  const scale = uniformVec2('uScale');
  const lean = uniformFloat('uLean');
  const cut = uniformFloat('uCut');
  const inten = uniformFloat('uInt');
  const wid = uniformFloat('uWidth');
  const flick = uniformFloat('uFlick');
  const nScale = uniformFloat('uNScale');
  const nSpeed = uniformFloat('uNSpeed');
  const cCore = uniformVec3('uCore');
  const cMid = uniformVec3('uMid');
  const cOut = uniformVec3('uOut');
  const cBlue = uniformVec3('uBlueCol');
  const blueAmt = uniformFloat('uBlue');
  const ember = uniformFloat('uEmber');

  filterColor.begin();
  let uv = filterColor.texCoord;
  let p = (uv - base) * vec2(aspect, -1.0) / fh;

  // 심지 불씨
  let ep = p - vec2(0.0, 0.02);
  let emb = exp(-dot(ep, ep) * 1400.0) * ember;

  // 기울기
  let a = lean * 0.5;
  let ca = cos(a);
  let sa = sin(a);
  p = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);
  let x = p.x / scale.x;
  let y = p.y / scale.y;
  let yb = max(y, 0.0);
  x = x - tan(lean * 0.5) * yb * yb * 0.9;

  // 일렁임
  let t = time * nSpeed;
  let yn = (y + 0.1) / 1.1;
  let up = clamp(yn, 0.0, 1.0);
  let n1 = noise(vec3(1.7, y * nScale * 0.6 - t * 0.7, time * 0.25));
  let n2 = noise(vec3(x * nScale * 1.5, y * nScale * 1.3 - t * 1.3, time * 0.5));
  let wob = (n1 - 0.5) * 0.2 + sin(time * 1.3 + y * 1.6) * 0.025 + sin(time * 0.47) * 0.02;
  x = x + wob * pow(up, 1.7) * flick;
  x = x + (n2 - 0.5) * 0.05 * up * up * flick;
  yn = yn * (1.0 + (noise(vec3(time * 0.9, 4.2, 0.0)) - 0.5) * 0.14 * flick);

  // 폭
  let yc = clamp(yn, 0.0, 1.0);
  let w = wid * pow(yc, 0.5) * pow(1.0 - yc, 1.15) * 1.25 + 0.0001;
  let f = 1.0 - abs(x) / w;
  let inY = step(0.0, yn) * (1.0 - step(1.0, yn));

  // 밝기
  let edge = smoothstep(-0.3, 0.45, f) * inY;
  let vlum = smoothstep(0.05, 0.3, yn);
  let lum = edge * mix(0.06, 1.0, vlum);
  // 어두운 영역
  let dz = (1.0 - smoothstep(0.1, 0.32, yn)) * smoothstep(0.3, 0.9, f);
  lum = lum * (1.0 - dz * 0.45);

  // 색
  let col = mix(cOut, cMid, smoothstep(-0.2, 0.4, f));
  let core = smoothstep(0.35, 0.95, f) * smoothstep(0.16, 0.4, yn) * (1.0 - smoothstep(0.45, 0.85, yn));
  col = mix(col, cCore, core);
  col = mix(col, cOut, smoothstep(0.7, 1.0, yn) * 0.55);

  // 푸른 기운
  let rim = smoothstep(-0.3, 0.1, f) * (1.0 - smoothstep(0.3, 0.8, f));
  let bm = (1.0 - smoothstep(0.02, 0.26, yn)) * rim * inY * blueAmt;
  let rgb = col * lum * (1.0 + core * 0.5);
  rgb = rgb + cBlue * bm * 0.4;

  // 잘림
  let keep = 1.0 - smoothstep(1.0 - cut - 0.08, 1.0 - cut + 0.02, yn) * step(0.001, cut);
  rgb = rgb * keep;

  // 후광
  let hp = vec2(x * 1.3, (y - 0.32) * 0.75);
  let halo = exp(-dot(hp, hp) * 7.0) * 0.12;
  rgb = rgb + mix(cOut, cMid, 0.5) * halo;

  rgb = rgb * inten + vec3(1.0, 0.32, 0.06) * emb;
  filterColor.set(vec4(rgb, 1.0));
  filterColor.end();
}

// 블룸: 추출
function brightSrc() {
  const src = uniformTexture('uSrc');
  const st = uniformVec2('uSrcTexel');
  const th = uniformFloat('uTh');
  filterColor.begin();
  let uv = filterColor.texCoord;
  let c = getTexture(src, uv + st * vec2(-0.5, -0.5)).rgb;
  c = c + getTexture(src, uv + st * vec2(0.5, -0.5)).rgb;
  c = c + getTexture(src, uv + st * vec2(-0.5, 0.5)).rgb;
  c = c + getTexture(src, uv + st * vec2(0.5, 0.5)).rgb;
  c = c * 0.25;
  let l = max(c.r, max(c.g, c.b));
  let k = max(l - th, 0.0) / max(l, 0.0001);
  filterColor.set(vec4(c * k, 1.0));
  filterColor.end();
}

// 블룸: 블러
function blurSrc() {
  const src = uniformTexture('uSrc');
  const dir = uniformVec2('uDir');
  filterColor.begin();
  let uv = filterColor.texCoord;
  let o1 = dir * 1.3846153846;
  let o2 = dir * 3.2307692308;
  let c = getTexture(src, uv).rgb * 0.227027027;
  c = c + (getTexture(src, uv + o1).rgb + getTexture(src, uv - o1).rgb) * 0.3162162162;
  c = c + (getTexture(src, uv + o2).rgb + getTexture(src, uv - o2).rgb) * 0.0702702703;
  filterColor.set(vec4(c, 1.0));
  filterColor.end();
}

// 합성
function compSrc() {
  const time = uniformFloat('uTime');
  const bgTex = uniformTexture('uBg');
  const candTex = uniformTexture('uCand');
  const flameTex = uniformTexture('uFlame');
  const b1 = uniformTexture('uB1');
  const b2 = uniformTexture('uB2');
  const b3 = uniformTexture('uB3');
  const bk = uniformVec3('uBloomK');
  const lpos = uniformVec2('uLightPos');
  const aspect = uniformFloat('uAspect');
  const light = uniformFloat('uLight');
  const expo = uniformFloat('uExpo');
  const warm = uniformVec3('uWarm');
  const moon = uniformVec3('uMoon');
  const lrad = uniformFloat('uLRad');
  const haze = uniformFloat('uHaze');
  const fgain = uniformFloat('uFGain');
  const candTop = uniformFloat('uCandTop');
  const glass = uniformVec4('uGlass');
  const ga = uniformFloat('uGlassA');
  const res = uniformVec2('uRes');
  const frost = uniformFloat('uFrost');
  const drops = uniformFloat('uDrops');

  filterColor.begin();
  let uv = filterColor.texCoord;

  // 유리컵
  let suv = uv;
  let gMul = vec3(1.0);
  let gAdd = vec3(0.0);
  let fog = 0.0;
  if (ga > 0.002) {
    let P = uv * res;
    let W = glass.z;
    let rr = W * 0.45;
    let thick = max(2.0, W * 0.08);
    // 바깥 벽
    let gc = vec2(glass.x, (glass.y + glass.w + rr) * 0.5);
    let hs = vec2(W, (glass.w + rr - glass.y) * 0.5);
    let q = abs(P - gc) - hs + vec2(rr);
    let sd = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - rr;
    // 안쪽 벽
    let bt = thick * 2.4;
    let gc2 = gc + vec2(0.0, bt * 0.5);
    let hs2 = hs - vec2(thick, bt * 0.5);
    let q2 = abs(P - gc2) - hs2 + vec2(rr - thick);
    let sd2 = length(max(q2, vec2(0.0))) + min(max(q2.x, q2.y), 0.0) - (rr - thick);

    let above = 1.0 - smoothstep(glass.w - 1.0, glass.w + 1.0, P.y);
    let ins = (1.0 - smoothstep(-1.0, 1.0, sd)) * above;
    let wall = ins * smoothstep(-1.0, 1.0, sd2);
    let gxn = (P.x - glass.x) / W;
    let ax = min(abs(gxn), 1.0);
    let vy = clamp((P.y - glass.y) / max(glass.w - glass.y, 1.0), 0.0, 1.0);
    let lp = lpos * res;
    let gl = vec3(0.55, 0.62, 0.72) * 0.35 + warm * light;
    let nearF = 0.3 + 0.7 * exp(-pow((P.y - lp.y) / (W * 1.6), 2.0));

    // 굴절
    suv = uv - vec2(sign(gxn) * pow(ax, 4.0) * 0.009 * ins * ga, 0.0);

    // 프레넬
    let fr = clamp(exp(sd / (W * 0.22)), 0.0, 1.0) * ins;
    // 벽 색
    let innerDark = exp(-pow((sd2 + 1.8) / 1.3, 2.0)) * above;
    gMul = mix(vec3(1.0), vec3(0.86, 0.95, 0.93), wall * 0.6) * (1.0 - innerDark * 0.4 * ga) * (1.0 - ins * 0.06 * ga);

    // 윤곽
    let edge = exp(-sd * sd / 1.4) * above;
    let inner = exp(-pow((sd2 - 0.6) / 0.9, 2.0)) * above;

    // 반사광
    let body = smoothstep(0.06, 0.2, vy) * (1.0 - smoothstep(0.88, 1.0, vy)) * ins;
    let soft = exp(-pow((gxn + 0.6) / 0.16, 2.0)) * 0.12;
    let sharp = exp(-pow((gxn + 0.7) / 0.022, 2.0)) * 0.55 + exp(-pow((gxn - 0.84) / 0.018, 2.0)) * 0.3;
    let streak = (soft + sharp * (0.6 + 0.4 * sin(vy * 3.14))) * body;

    // 모서리 하이라이트
    let nq = max(q, vec2(0.0));
    let nv = vec2(sign(P.x - gc.x) * nq.x, sign(P.y - gc.y) * nq.y) + vec2(0.0, -0.0001);
    let nn = nv / max(length(nv), 0.0001);
    let band = exp(-pow((sd + thick * 0.5) / (thick * 0.22), 2.0)) * above;
    let arc = band * smoothstep(0.7, 0.97, dot(nn, vec2(-0.6, -0.8)));
    arc = arc + band * smoothstep(0.75, 0.99, dot(nn, vec2(0.7, -0.7))) * 0.35;

    // 불꽃 반사
    let xl = glass.x - W * 0.8;
    let xr = glass.x + W * 0.8;
    let ml = exp(-pow((P.x - xl) / (W * 0.07), 2.0));
    let mr = exp(-pow((P.x - xr) / (W * 0.05), 2.0));
    let srl = vec2(lp.x - (P.x - xl) * 6.0, P.y) / res;
    let srr = vec2(lp.x - (P.x - xr) * 7.0, P.y) / res;
    let refl = (getTexture(flameTex, srl).rgb + getTexture(b1, srl).rgb * 0.8) * ml * 0.45;
    refl = refl + (getTexture(flameTex, srr).rgb + getTexture(b1, srr).rgb * 0.8) * mr * 0.3;
    refl = refl * ins;

    // 입구
    let e = length(vec2(gxn, (P.y - glass.w) / (W * 0.16)));
    let front = step(glass.w, P.y);
    let rim = exp(-pow((e - 1.0) * W * 0.16, 2.0) / 1.6) * mix(0.3, 1.0, front);
    let lip = exp(-pow((e - 0.97) * W * 0.16 / 2.5, 2.0)) * front * 0.35;
    let caus = exp(-pow((e - 1.12) / 0.07, 2.0)) * mix(0.25, 1.0, front) * light;

    // 김
    let gn = noise(vec3(P.x * 0.018, P.y * 0.018 + time * 0.12, time * 0.1));
    fog = ins * smoothstep(0.0, 0.8, frost) * (0.45 + 0.55 * (1.0 - vy)) * (0.45 + 0.55 * gn) * ga;

    // 물방울
    let cs = max(11.0, W * 0.17);
    let cell = floor((P + vec2(0.0, floor(P.x / cs) * cs * 0.37)) / cs);
    let h1 = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
    let h2 = fract(sin(dot(cell, vec2(269.5, 183.3))) * 43758.5453);
    let h3 = fract(sin(dot(cell, vec2(419.2, 371.9))) * 43758.5453);
    let ctr = (cell + vec2(0.15 + 0.7 * h1, 0.15 + 0.7 * h2)) * cs - vec2(0.0, floor(P.x / cs) * cs * 0.37);
    let grow = smoothstep(h3 * 0.7, h3 * 0.7 + 0.25, frost * (1.15 - vy * 0.55)) * step(1.0 - drops, h3);
    let dr = cs * (0.12 + 0.3 * h2) * grow;
    let dd = length((P - ctr) * vec2(1.0, 0.85)) / max(dr, 0.001);
    let drop = (1.0 - smoothstep(0.8, 1.0, dd)) * step(0.05, grow) * ins * (1.0 - wall);
    let so = P - ctr + vec2(dr * 0.35, dr * 0.4);
    let dspec = exp(-dot(so, so) / max(dr * dr * 0.06, 0.001)) * drop;
    let drim = smoothstep(0.5, 0.95, dd) * drop;
    let low = drim * smoothstep(-0.2, 0.6, (P.y - ctr.y) / max(dr, 0.001));

    gMul = gMul * (1.0 - drim * 0.3 * ga) * (1.0 - drop * 0.12 * ga);
    gAdd = (edge * 0.45 * nearF + inner * 0.18 * nearF + wall * 0.05 + fr * 0.07 + streak + arc * 0.6 + rim * 0.4 + lip + dspec * 0.7 + low * 0.35 + drop * 0.05) * gl * ga;
    gAdd = gAdd + (refl + warm * caus * 0.12) * ga;
  }

  let d2 = (uv - lpos) * vec2(aspect, 1.0);
  let d = length(d2);

  // 주변광
  let fall = 1.0 / (1.0 + pow(d / lrad, 2.0) * 2.0);
  let lit = moon * 3.5 + warm * fall * light * 1.6;

  let bg = getTexture(bgTex, suv);
  let cand = getTexture(candTex, suv);
  let bgc = bg.rgb + moon * 0.25 + warm * fall * light * 0.04;
  // 번짐
  bgc = bgc + warm * exp(-d * d / (lrad * lrad * 1.6)) * haze * light;
  // 초 투과광
  let sss = exp(-max(uv.y - candTop, 0.0) / 0.05) * smoothstep(candTop - 0.02, candTop + 0.01, uv.y);
  let cc = cand.rgb * lit + cand.rgb * warm * sss * light * 0.7;
  let col = mix(bgc, cc, cand.a);

  // 유리컵
  col = col * gMul;
  col = mix(col, col * 0.5 + vec3(0.2, 0.21, 0.24) * (0.45 + light * 1.2), fog * 0.9);
  col = col + gAdd;

  // 불꽃 + 블룸
  let fl = getTexture(flameTex, suv).rgb;
  let bl = getTexture(b1, uv).rgb * bk.x + getTexture(b2, uv).rgb * bk.y + getTexture(b3, uv).rgb * bk.z;
  col = col + fl * fgain * (1.0 - fog * 0.45) + bl;

  // 노출 + 비네트
  col = col * expo;
  let vg = length((uv - vec2(0.5, 0.52)) * vec2(aspect * 0.9, 1.0));
  col = col * (1.0 - smoothstep(0.35, 0.95, vg) * 0.65);

  // 톤매핑
  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);
  // 디더
  let r = fract(sin(dot(uv * 1000.0 + time, vec2(12.9898, 78.233))) * 43758.5453);
  col = col + (r - 0.5) / 255.0 * 1.5;
  filterColor.set(vec4(col, 1.0));
  filterColor.end();
}
