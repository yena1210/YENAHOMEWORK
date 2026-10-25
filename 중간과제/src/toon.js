// 툰 재질: 밝은 면 / 청보라 그림자 면 2단계 + 잉크 디테일 선 + 바람 흔들림 + 눈(이끼) 쌓임
// 같은 셰이더로 "법선 패스"도 그린다 → 흔들리는 식물의 윤곽선이 정확히 따라간다.
import * as THREE from 'three';
import { config } from './config.js';

// 모든 툰 재질이 함께 쓰는 값 (한 곳만 바꾸면 전부 바뀐다)
export const shared = {
  uPass: { value: 0 }, // 0 색, 1 법선+경계(윤곽선용)
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(-0.5, 0.7, 0.5).normalize() },
  uLit: { value: new THREE.Color() }, // 밝은 면 색 (금빛)
  uShade: { value: new THREE.Color() }, // 그림자 면 색 (청보라)
  uThresh: { value: 0.1 }, // 명암 경계 위치
  uSoft: { value: 0.02 }, // 명암 경계 부드러움 (계단 방지용으로 아주 조금)
  uInk: { value: new THREE.Color() },
  uWind: { value: 1 }, // 바람 세기
  uSway: { value: 1 }, // 흔들림 크기
  uWindDir: { value: new THREE.Vector3(1, 0, 0.3).normalize() },
  uGustX: { value: -20 }, // 지나가는 돌풍의 x 위치
  uGustK: { value: 0 },
  uCover: { value: 0 }, // 위를 향한 면에 쌓이는 양 (겨울 눈 / 봄 이끼)
  uCoverColor: { value: new THREE.Color('#ffffff') },
  uCoverShade: { value: new THREE.Color('#ffffff') },
};

let nextId = 1;

/**
 * opt.color    기본 색 (sRGB 16진수)
 * opt.map      RGBA 텍스처: rgb = 색 무늬(곱하기), a = 잉크 선
 * opt.ink      잉크 선 진하기
 * opt.sway     바람에 흔들리는 정도 (geometry에 aSway, aPhase 속성이 있어야 한다)
 * opt.cover    위를 향한 면에 눈/이끼가 쌓이는 정도
 * opt.fade     멀리 있는 물체를 하늘색 쪽으로 흐리게 (0~1)
 * opt.side     THREE.DoubleSide 등
 */
export function toonMaterial(opt = {}) {
  const defines = {};
  if (opt.map) defines.USE_INKMAP = '';
  if (opt.sway) defines.USE_SWAY = '';
  if (opt.cover) defines.USE_COVER = '';
  if (opt.vcolor) defines.USE_VCOLOR = '';
  if (opt.band) defines.USE_BAND = '';
  if (opt.holes) defines.USE_HOLE = '';

  const mat = new THREE.ShaderMaterial({
    defines,
    lights: true,
    clipping: true,
    side: opt.side ?? THREE.FrontSide,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      {
        uColor: { value: new THREE.Color(opt.color || '#ffffff') },
        uMap: { value: opt.map || null },
        uHole: { value: opt.holes || null },
        uInkK: { value: opt.ink ?? 1 },
        uSwayK: { value: opt.sway || 0 },
        uCoverK: { value: opt.cover || 0 },
        uFade: { value: opt.fade || 0 },
        uBand: { value: opt.band || 0 },
        uFadeColor: { value: new THREE.Color(opt.fadeColor || '#ffffff') },
        uId: { value: ((nextId++ * 37) % 251) / 255 },
      },
    ]),
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  // 공유 값은 복사하지 않고 같은 객체를 가리키게 한다
  Object.assign(mat.uniforms, shared);
  if (opt.clip) mat.clippingPlanes = opt.clip;
  return mat;
}

const VERT = /* glsl */ `
#include <common>
#include <shadowmap_pars_vertex>
#include <clipping_planes_pars_vertex>

uniform float uTime, uWind, uSway, uSwayK, uGustX, uGustK;
uniform vec3 uWindDir;

varying vec3 vWorldNormal;
varying vec3 vViewNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
#ifdef USE_VCOLOR
  attribute vec3 color;
  varying vec3 vColor;
#endif
#ifdef USE_SWAY
  attribute float aSway; // 0 = 뿌리(고정), 1 = 끝(가장 많이 흔들림)
  attribute float aPhase; // 개체마다 다른 위상
#endif

void main() {
  vUv = uv;
  #ifdef USE_VCOLOR
    vColor = color;
  #endif
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>

  #ifdef USE_SWAY
    vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
    // 물체 크기에 비례해서 흔들린다 (카메라 앞 작은 잎이 과하게 휘지 않게)
    float scl = length(modelMatrix[0].xyz);
    float w = aSway * aSway * uSwayK * uSway * scl;
    // 잔잔한 바람: 느린 흔들림 두 개를 섞는다
    float base = sin(uTime * 1.3 + aPhase + wp.x * 0.35) * 0.65 + sin(uTime * 2.7 + aPhase * 1.7) * 0.25;
    // 지나가는 돌풍: 뒤쪽(z가 작을수록)이 조금 늦게 맞는다 → 층마다 시간차
    float g = exp(-pow((wp.x - uGustX - wp.z * 0.6) / 3.0, 2.0)) * uGustK;
    vec3 off = uWindDir * (base * 0.35 * uWind + g) * w;
    off.y -= abs(base) * 0.06 * w; // 휠 때 살짝 내려앉는다
    transformed += inverse(mat3(modelMatrix)) * off;
  #endif

  #include <project_vertex>
  #include <clipping_planes_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
  vViewNormal = normalize(transformedNormal);
}
`;

const FRAG = /* glsl */ `
#include <common>
#include <packing>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <clipping_planes_pars_fragment>

uniform float uPass, uThresh, uSoft, uInkK, uCoverK, uCover, uFade, uId, uBand;
uniform vec3 uSunDir, uLit, uShade, uInk, uColor, uCoverColor, uCoverShade, uFadeColor;
uniform sampler2D uMap, uHole;

varying vec3 vWorldNormal;
varying vec3 vViewNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
#ifdef USE_VCOLOR
  varying vec3 vColor;
#endif

// 간단한 값 노이즈 (눈 가장자리를 불규칙하게)
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  #include <clipping_planes_fragment>
  #ifdef USE_BAND
    if (abs(vUv.y - 0.5) > uBand) discard; // 띠 모양만 남긴다 (실뭉치의 감긴 띠)
  #endif
  #ifdef USE_HOLE
    if (texture2D(uHole, vUv).r < 0.5) discard; // 망사의 구멍
  #endif
  vec3 n = normalize(vWorldNormal);
  if (!gl_FrontFacing) n = -n;

  // 윤곽선용 패스: 화면 법선 + 물체 번호
  if (uPass > 0.5) {
    vec3 vn = normalize(vViewNormal);
    if (!gl_FrontFacing) vn = -vn;
    gl_FragColor = vec4(vn * 0.5 + 0.5, uId);
    return;
  }

  vec3 base = uColor;
  #ifdef USE_VCOLOR
    base *= vColor;
  #endif
  float ink = 0.0;
  #ifdef USE_INKMAP
    vec4 m = texture2D(uMap, vUv);
    base *= m.rgb;
    ink = m.a * uInkK;
  #endif

  // 2단계 명암: 해를 향하고 그림자가 지지 않은 곳만 밝은 면
  float ndl = dot(n, normalize(uSunDir));
  float sh = getShadowMask();
  float lit = smoothstep(uThresh - uSoft, uThresh + uSoft, ndl) * smoothstep(0.35, 0.65, sh);
  vec3 col = base * mix(uShade, uLit, lit);

  // 위를 향한 면에 눈(또는 이끼)이 쌓인다. 가장자리는 노이즈로 불규칙하게.
  #ifdef USE_COVER
    float up = n.y + (noise(vWorldPos.xz * 6.0 + vWorldPos.y * 3.0) - 0.5) * 0.3;
    float c = smoothstep(0.72, 0.77, up + (uCover * uCoverK - 0.5) * 0.4);
    col = mix(col, mix(uCoverShade, uCoverColor, lit), c * step(0.001, uCover * uCoverK));
    ink *= 1.0 - c * 0.7;
  #endif

  // 멀리 있는 것은 하늘색 쪽으로 흐려진다 (공기 원근)
  col = mix(col, uFadeColor, uFade);
  // 그 위에 잉크 선
  col = mix(col, uInk, clamp(ink, 0.0, 1.0) * (1.0 - uFade * 0.6));
  gl_FragColor = vec4(col, 1.0);
}
`;

// 지오메트리에 흔들림 속성을 붙인다. fn(정점 위치) → 0~1
export function addSway(geo, fn, phase = 0) {
  const p = geo.attributes.position;
  const s = new Float32Array(p.count);
  const ph = new Float32Array(p.count).fill(phase);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) s[i] = fn(v.fromBufferAttribute(p, i), i);
  geo.setAttribute('aSway', new THREE.BufferAttribute(s, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  return geo;
}

// 공유 값 갱신 (config → 셰이더)
export function applyLook() {
  const L = config.look;
  shared.uLit.value.set(L.lit);
  shared.uShade.value.set(L.shade);
  shared.uInk.value.set(L.ink);
  shared.uThresh.value = L.thresh;
  shared.uSoft.value = L.soft;
  shared.uSunDir.value.set(...L.sunDir).normalize();
  shared.uWind.value = config.wind.strength;
  shared.uSway.value = config.wind.sway;
}
