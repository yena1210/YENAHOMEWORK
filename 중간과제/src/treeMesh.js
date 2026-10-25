// 뼈대 → 메시. 모든 가지를 지오메트리 하나로 합친다.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { config } from './config.js';
import { toonMaterial } from './toon.js';

const tmp = {};
const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const v = new THREE.Vector3(), n = new THREE.Vector3(), pn = new THREE.Vector3();
const da = new THREE.Vector3(), ds = new THREE.Vector3();

function branchGeometry(b, bi) {
  const tm = config.treeMesh;
  // 굵은 가지일수록 촘촘하게 (골과 꼬임이 보이도록)
  const segs = Math.ceil(b.len * tm.segPerUnit * (1 + b.r0 * tm.segByRadius)) + 6;
  const rad = Math.min(tm.maxRadial, Math.max(tm.minRadial, Math.round(b.r0 * tm.radialPerUnit)));
  const row = rad + 1;
  const pos = new Float32Array((segs + 1) * row * 3);
  const nor = new Float32Array((segs + 1) * row * 3);
  const uv = [], idx = [], sway = [];
  // 나무 전체가 같은 위상 → 바람이 위치에 따라 이어지고, 가지가 부모에서 떨어지지 않는다
  const phase = 0;
  // 무늬 크기가 굵기와 상관없이 일정하도록 둘레 반복 수를 정한다
  // 부모를 이어받은 가지는 부모와 같은 반복 수를 쓴다
  const uRep = (b.uRep = b.relief?.keep ? b.parent.uRep : Math.max(1, Math.round((Math.PI * 2 * b.r0) / tm.texSize)));

  // 1) 정점: 축 + 둘레 방향 * 표면 반지름(골, 옹이, 뿌리 포함)
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const f = b.at(t, tmp);
    // 가는 가지일수록 많이 흔들린다. 시작점은 부모의 흔들림을 그대로 이어받는다.
    const w = swayAt(b, t);
    for (let j = 0; j <= rad; j++) sway.push(w);
    for (let j = 0; j <= rad; j++) {
      const a = ((j % rad) / rad) * Math.PI * 2; // 마지막 정점은 첫 정점과 같은 자리
      n.copy(f.nrm).multiplyScalar(Math.cos(a)).addScaledVector(f.bin, Math.sin(a));
      v.copy(f.pos).addScaledVector(n, b.surface(t, a, f.r));
      v.toArray(pos, (i * row + j) * 3);
      // 무늬 결도 골을 따라 나선으로 돈다
      const s = t * b.len + b.s0;
      const tw = b.relief ? (b.relief.twist * s + b.a0) / (Math.PI * 2) : 0;
      uv.push((j / rad + tw) * uRep, s / tm.texSize);
    }
  }

  // 2) 법선: 실제 표면에서 이웃 정점으로 계산 → 골과 혹에 빛이 정확히 맺힌다.
  //    둘레는 한 바퀴 이어서 계산하니 세로 이음매 줄이 생기지 않는다.
  const P = (i, j, out) => out.fromArray(pos, (i * row + (((j % rad) + rad) % rad)) * 3);
  const p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  const par = b.parent;
  const pf = par ? par.at(b.tp, {}) : null;
  for (let i = 0; i <= segs; i++) {
    const s = (i / segs) * b.len;
    // 이음매에서 부모 표면 쪽 법선을 얼마나 섞을지
    const mix = par ? Math.exp(-Math.max(0, s - b.exit) / (b.r0 * 1.6)) * tm.jointBlend : 0;
    const i0 = Math.max(0, i - 1), i1 = Math.min(segs, i + 1);
    for (let j = 0; j < rad; j++) {
      da.subVectors(P(i, j + 1, p1), P(i, j - 1, p2));
      ds.subVectors(P(i1, j, p1), P(i0, j, p2));
      n.crossVectors(da, ds);
      if (n.lengthSq() < 1e-14) n.copy(b.at(i / segs, tmp).tan); // 끝처럼 쪼그라든 곳
      n.normalize();
      if (mix > 0.001) {
        // 부모 축에서 이 점을 향하는 방향 = 부모 표면 법선
        P(i, j, v);
        pn.copy(v).sub(pf.pos);
        pn.addScaledVector(pf.tan, -pn.dot(pf.tan)).normalize();
        n.lerp(pn, mix).normalize();
      }
      n.toArray(nor, (i * row + j) * 3);
      if (j === 0) n.toArray(nor, (i * row + rad) * 3);
    }
  }

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < rad; j++) {
      const a = i * row + j, c = a + row;
      idx.push(a, a + 1, c, c, a + 1, c + 1);
    }
  }

  // 끝 마개
  const end = b.at(1, {});
  const tip = (segs + 1) * row;
  const tp = end.pos.clone().addScaledVector(end.tan, end.r * b.cap);
  const posAll = new Float32Array(pos.length + 3);
  posAll.set(pos);
  tp.toArray(posAll, pos.length);
  const norAll = new Float32Array(nor.length + 3);
  norAll.set(nor);
  end.tan.toArray(norAll, nor.length);
  uv.push(0.5, b.len / tm.texSize);
  sway.push(sway[sway.length - 1]);
  const last = segs * row;
  for (let j = 0; j < rad; j++) idx.push(last + j, last + j + 1, tip);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(posAll, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(norAll, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 1));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(new Array(sway.length).fill(phase), 1));
  g.setIndex(idx);
  return g;
}

export function makeTreeMesh(branches, bark, opt = {}) {
  const geo = mergeGeometries(branches.map(branchGeometry));
  const mat = toonMaterial({
    color: opt.color, map: bark, sway: config.treeMesh.sway, cover: 1,
    fade: opt.fade, fadeColor: opt.fadeColor,
    clip: [GROUND], // 땅 밑은 그리지 않는다
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.add(mesh);
  return { group, mesh, geo };
}

// 가지 위 t에서의 흔들림 세기 (부모에서 이어져 끊기지 않는다)
function swayAt(b, t) {
  const tm = config.treeMesh;
  const own = smooth(tm.swayThick, tm.swayThin, b.radius(t));
  if (!b.parent) return own;
  if (b.sw0 === undefined) b.sw0 = swayAt(b.parent, b.tp);
  const ramp = Math.min(1, (t * b.len) / (b.r0 * 6 + 0.05));
  return Math.max(b.sw0, b.sw0 + (own - b.sw0) * ramp);
}

function smooth(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}
