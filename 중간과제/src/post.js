// 후처리: 색 패스 → 잉크 윤곽선(깊이, 법선, 물체 경계) → 종이 질감 곱하기 → sRGB 출력
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { config } from './config.js';
import { shared } from './toon.js';

const InkShader = {
  uniforms: {
    tDiffuse: { value: null },
    tNormal: { value: null },
    tDepth: { value: null },
    tPaper: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    uNear: { value: 0.1 },
    uFar: { value: 100 },
    uInk: { value: new THREE.Color() },
    uWidth: { value: 1.6 }, // 가까운 선 굵기 (css px)
    uWidthFar: { value: 0.7 }, // 먼 선 굵기
    uFarDist: { value: 30 }, // 이 거리부터 가장 가늘다
    uDepthK: { value: 1 },
    uNormalK: { value: 1 },
    uPencil: { value: 0.35 }, // 선의 색연필 끊김
    uPaper: { value: 0.18 }, // 종이 질감 세기
    uPaperScale: { value: 1 },
    uThin: { value: 0.5 }, // 가는 선 물체(번호 + 2)의 선 굵기 배율 (뒤 나무)
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse, tNormal, tDepth, tPaper;
    uniform vec2 uRes;
    uniform float uDpr, uNear, uFar, uWidth, uWidthFar, uFarDist, uDepthK, uNormalK, uPencil, uPaper, uPaperScale, uThin;
    uniform vec3 uInk;
    varying vec2 vUv;

    float viewZ(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      return -perspectiveDepthToViewZ(d, uNear, uFar);
    }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
    }

    // 한 점 주변에서 경계가 얼마나 강한지 (0~1)
    float edgeAt(vec2 uv, float rad, float zc, vec4 nc) {
      float e = 0.0;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785398;
        vec2 o = vec2(cos(a), sin(a)) * rad / uRes;
        vec2 u2 = uv + o;
        float zs = viewZ(u2);
        vec4 ns = texture2D(tNormal, u2);
        // 깊이: 뒤에 있는 것과의 차이만 본다 (앞 물체 바깥쪽에 선이 생긴다)
        float dz = (zs - zc) / zc;
        float ed = smoothstep(0.03, 0.09, dz * uDepthK);
        // 법선: 꺾이는 곳
        float dn = 1.0 - dot(nc.xyz * 2.0 - 1.0, ns.xyz * 2.0 - 1.0);
        float en = smoothstep(0.35, 0.7, dn * uNormalK) * step(abs(dz), 0.2);
        // 물체 경계 (번호가 다르면)
        float ei = step(0.002, abs(nc.a - ns.a)) * step(zc, zs + 0.01);
        e = max(e, max(ed, max(en, ei)));
      }
      return e;
    }

    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec4 nc = texture2D(tNormal, vUv);
      float zc = viewZ(vUv);

      // 가까울수록 굵게, 그리고 화면 위치마다 굵기가 조금씩 달라진다 (손으로 그은 느낌)
      float k = smoothstep(4.0, uFarDist, zc);
      float vary = 0.75 + 0.5 * noise(gl_FragCoord.xy / (uDpr * 38.0));
      float rad = mix(uWidth, uWidthFar, k) * vary * uDpr;
      // 가는 선 물체: 법선 패스의 번호에 2를 더해 둔다 (뒤 나무)
      float thin = step(1.5, nc.a);
      rad *= mix(1.0, uThin, thin);

      float e = edgeAt(vUv, rad, zc, nc) * mix(1.0, 0.8, thin);
      // 반 굵기에서 한 번 더 → 선 가운데가 진하고 가장자리가 부드럽다 (계단 방지)
      e = max(e * 0.75, edgeAt(vUv, rad * 0.5, zc, nc));

      // 색연필 결: 종이 결에 걸려 선이 군데군데 옅어진다
      float tooth = noise(gl_FragCoord.xy / (uDpr * 1.6)) * 0.6 + noise(gl_FragCoord.xy / (uDpr * 5.0)) * 0.4;
      e *= 1.0 - uPencil * smoothstep(0.35, 0.95, tooth);
      col.rgb = mix(col.rgb, uInk, e);

      // 종이 질감 곱하기
      vec3 p = texture2D(tPaper, gl_FragCoord.xy / (256.0 * uDpr * uPaperScale)).rgb;
      col.rgb *= mix(vec3(1.0), p, uPaper);
      gl_FragColor = col;
    }`,
};

export function makePost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());

  // 법선 + 물체 번호 + 깊이를 그릴 곳
  const nTarget = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
  nTarget.depthTexture = new THREE.DepthTexture(size.x, size.y);
  nTarget.depthTexture.type = THREE.FloatType;

  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ink = new ShaderPass(InkShader);
  ink.uniforms.tPaper.value = paperTexture();
  composer.addPass(ink);
  composer.addPass(new OutputPass());

  const bg = new THREE.Color(0.5, 0.5, 1);
  function render() {
    // 1) 법선 패스: 하늘 배경은 빼고 그린다
    const keep = scene.background;
    scene.background = null;
    shared.uPass.value = 1;
    renderer.setRenderTarget(nTarget);
    renderer.setClearColor(bg, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    shared.uPass.value = 0;
    scene.background = keep;
    // 2) 색 패스 + 잉크 + 출력
    ink.uniforms.tNormal.value = nTarget.texture;
    ink.uniforms.tDepth.value = nTarget.depthTexture;
    ink.uniforms.uNear.value = camera.near;
    ink.uniforms.uFar.value = camera.far;
    composer.render();
  }

  function setLook() {
    const u = ink.uniforms, L = config.look;
    u.uInk.value.set(L.ink);
    u.uWidth.value = L.line;
    u.uWidthFar.value = L.lineFar;
    u.uPencil.value = L.pencil;
    u.uPaper.value = L.paper;
    u.uThin.value = L.thinLine ?? 0.5;
  }
  setLook();

  function resize(w, h, dpr) {
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    const W = Math.floor(w * dpr), H = Math.floor(h * dpr);
    nTarget.setSize(W, H);
    ink.uniforms.uRes.value.set(W, H);
    ink.uniforms.uDpr.value = dpr;
  }

  return { composer, render, setLook, resize };
}

// 종이 결 텍스처 (회색 섬유 노이즈, 평균은 흰색에 가깝게)
function paperTexture() {
  const n = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, n, n);
  let s = 99;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // 섬유: 짧고 가는 선
  for (let i = 0; i < 900; i++) {
    const x = rand() * n, y = rand() * n, a = rand() * Math.PI, l = 2 + rand() * 9;
    const g = 150 + rand() * 90;
    ctx.strokeStyle = `rgba(${g},${g - 6},${g - 14},${0.25 + rand() * 0.35})`;
    ctx.lineWidth = 0.5 + rand() * 0.6;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + oy);
      ctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
      ctx.stroke();
    }
  }
  // 점 결
  const img = ctx.getImageData(0, 0, n, n);
  for (let i = 0; i < n * n; i++) {
    const v = (rand() - 0.5) * 40;
    img.data[i * 4] += v; img.data[i * 4 + 1] += v; img.data[i * 4 + 2] += v;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
