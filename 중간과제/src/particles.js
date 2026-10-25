// 공기 중에 떠다니는 것: 겨울엔 눈송이, 봄엔 털실 보풀. 몇 개만, 천천히.
import * as THREE from 'three';
import { shared } from './toon.js';
import { makeRandom } from './random.js';
import { reduceMotion } from './config.js';

export function makeParticles(o) {
  const rand = makeRandom(o.seed || 4);
  const n = o.count;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rand() - 0.5) * o.box[0];
    pos[i * 3 + 1] = rand() * o.box[1];
    pos[i * 3 + 2] = (rand() - 0.5) * o.box[2] + o.z;
    seed[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uPass: shared.uPass,
      uTime: shared.uTime,
      uInk: shared.uInk,
      uColor: { value: new THREE.Color(o.color) },
      uSize: { value: o.size },
      uFall: { value: reduceMotion ? 0 : o.fall },
      uH: { value: o.box[1] },
      uCurl: { value: o.curl ? 1 : 0 },
      uDpr: { value: Math.min(devicePixelRatio, 2) },
      uAmount: { value: 1 }, // 보이는 비율 (함박눈이 차츰 늘었다 줄어든다)
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uSize, uFall, uH, uDpr;
      varying float vSeed;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        // 천천히 떨어지며 좌우로 흔들린다. 바닥에 닿으면 위로 돌아간다.
        p.y = mod(p.y - uTime * uFall * (0.6 + aSeed * 0.8), uH);
        p.x += sin(uTime * 0.5 + aSeed * 30.0) * 0.4;
        p.z += cos(uTime * 0.4 + aSeed * 20.0) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uDpr * (0.7 + aSeed * 0.6) * (10.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uPass, uCurl, uTime, uAmount;
      uniform vec3 uColor, uInk;
      varying float vSeed;
      void main() {
        if (uPass > 0.5 || vSeed > uAmount) discard; // 윤곽선 패스에는 안 그린다, 보이는 비율만큼만
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p);
        float a = 0.0, ink = 0.0;
        if (uCurl > 0.5) {
          // 보풀: 작은 곱슬 고리
          float ang = atan(p.y, p.x) + vSeed * 6.28;
          float ring = abs(r - 0.28 - 0.06 * sin(ang * 3.0));
          ink = smoothstep(0.06, 0.02, ring) * step(0.8, fract(ang / 6.28 + 0.1) + 0.4);
          a = smoothstep(0.42, 0.36, r) * 0.0 + ink;
        } else {
          // 눈송이: 둥근 흰 점 + 얇은 잉크 테
          a = smoothstep(0.42, 0.38, r);
          ink = smoothstep(0.05, 0.0, abs(r - 0.38));
        }
        if (a + ink < 0.01) discard;
        vec3 col = mix(uColor, uInk, clamp(ink * 0.8, 0.0, 1.0));
        gl_FragColor = vec4(col, max(a, ink));
      }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}
