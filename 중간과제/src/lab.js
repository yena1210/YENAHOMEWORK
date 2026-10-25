// 뜨개 조각 테스트 화면 (?scene=knit)
// 뒷줄: 가지 세 토막에 망사 / 줄무늬 / 그래니 조각 + 장식(꽃, 퐁퐁, 태슬)
// 앞줄: 그래니 스퀘어 무늬 4종, 작은 실뭉치 3개
import * as THREE from 'three';
import { config } from './config.js';
import { shared, toonMaterial } from './toon.js';
import { groundTex } from './craftTex.js';
import { makeBark } from './bark.js';
import { Branch } from './tree.js';
import { makeTreeMesh } from './treeMesh.js';
import { makePiece } from './piece.js';
import { yarnTones, grannyTex } from './knit.js';
import { skyTexture, yarnBall } from './scene.js';

export function makeKnitLab(renderer, scene) {
  const S = config.seasons[config.season];
  scene.background = skyTexture(S.sky);
  shared.uCover.value = config.lab.cover;
  shared.uCoverColor.value.set(S.coverColor);
  shared.uCoverShade.value.set(S.coverShade);

  const sun = new THREE.DirectionalLight('#ffffff', 1);
  sun.position.set(...config.look.sunDir).normalize().multiplyScalar(12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 2;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.01;
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
  scene.add(sun, sun.target);

  const gmap = groundTex(renderer, { base: S.ground, thread: S.thread, seed: 3, density: 0.6 });
  const gg = new THREE.PlaneGeometry(60, 40);
  gg.rotateX(-Math.PI / 2);
  const uv = gg.attributes.uv, gp = gg.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, gp.getX(i) / 7, gp.getZ(i) / 7);
  const ground = new THREE.Mesh(gg, toonMaterial({ map: gmap, ink: 0.8 }));
  ground.receiveShadow = true;
  scene.add(ground);

  const all = new THREE.Group();
  scene.add(all);
  const bark = makeBark(renderer);

  // 뒷줄: 살짝 기운 가지 토막 세 개
  const L = config.lab;
  // ?set=0/1/2 : 같은 세 짜임을 다른 실 색으로
  const k0 = (Number(new URLSearchParams(location.search).get('set')) || 0) * 2;
  const hue = (i) => L.hues[(i + k0) % L.hues.length];
  const rows = [
    { x: -1.5, type: 'mesh', hue: hue(0), deco: 'flower' },
    { x: 0, type: 'stripe', hue: hue(1), deco: 'pompom' },
    { x: 1.5, type: 'granny', hue: hue(2), motif: 'rounds', deco: 'tassel' },
  ];
  for (const r of rows) {
    const b = new Branch([
      new THREE.Vector3(r.x, -0.1, -0.6),
      new THREE.Vector3(r.x + 0.06, 0.8, -0.6),
      new THREE.Vector3(r.x - 0.04, 1.7, -0.6),
    ], { r0: 0.2, r1: 0.16, level: 1, cap: 0.05 }); // 끝은 납작하게 자른 토막
    const log = makeTreeMesh([b], bark, { color: S.tree });
    all.add(log.group);
    all.add(makePiece(renderer, b, { t0: 0.28, t1: 0.78, under: log.mesh.material.uniforms.uId.value, ...r }));
  }

  // 앞줄: 그래니 무늬 4종 (조각 한 장씩, 비스듬히 세워 둔다)
  const motifs = ['rounds', 'flower', 'bobble', 'burst'];
  motifs.forEach((m, k) => {
    const t = yarnTones(L.hues[k + 3]);
    const tex = grannyTex(renderer, t, m, k + 1);
    const g = new THREE.BoxGeometry(0.42, 0.42, 0.03);
    const tile = new THREE.Mesh(g, toonMaterial({ map: tex.map, ink: config.knit.ink, cover: 1 }));
    tile.position.set(-1.35 + k * 0.9, 0.25, 0.75);
    tile.rotation.set(-0.35, 0, 0);
    tile.castShadow = tile.receiveShadow = true;
    all.add(tile);
  });

  // 작은 실뭉치 (지운 메모가 될 것)
  L.hues.slice(0, 3).forEach((h, k) => {
    const ball = yarnBall(renderer, 0.13, yarnTones(h).base);
    ball.position.set(2.05 + (k % 2) * 0.22, 0.12, 0.2 + k * 0.28);
    all.add(ball);
  });

  // 카메라가 담을 범위
  const tree = { group: all };
  return { tree, ground, sun, lookY: 0.85 };
}
