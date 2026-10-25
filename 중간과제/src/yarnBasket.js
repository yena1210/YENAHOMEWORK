// 뜨개방의 실 바구니: 정원과 같은 3D(툰 + 잉크 선 + 종이 결)로 그린 코바늘 바구니에 실뭉치 7개.
// 위에서 내려다본다. 실뭉치를 톡 → 통 튀어 오르고 그 색이 실 색. 키보드 ← → 로도 고른다.
import * as THREE from 'three';
import { config, reduceMotion } from './config.js';
import { makePost } from './post.js';
import { basket } from './crafts.js';
import { yarnBall } from './scene.js';
import { yarnTones } from './knit.js';
import { toonMaterial } from './toon.js';

export function makeYarnBasket(onPick) {
  const Y = config.room.yarns;
  const el = document.createElement('div');
  el.className = 'yarnbasket';
  el.tabIndex = 0;
  el.setAttribute('role', 'radiogroup');
  el.setAttribute('aria-label', '실 색 고르기');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(Y.paper);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  camera.position.set(0, 4.6, 2.6); // 하이앵글
  camera.lookAt(0, 0.1, 0);

  // 해: 정원과 같은 방향
  const sun = new THREE.DirectionalLight('#ffffff', 1);
  sun.position.set(...config.look.sunDir).normalize().multiplyScalar(8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 20 });
  scene.add(sun);

  // 바닥 (종이색 천) + 바구니
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), toonMaterial({ color: Y.paper, ink: 0 }));
  floor.receiveShadow = true;
  scene.add(floor);
  const K = { ...config.basket, r: 1.25, h: 0.55, fill: 0.35 };
  const bask = basket(renderer, K);
  bask.traverse((o) => { if (o.material?.uniforms?.uCoverK) o.material.uniforms.uCoverK.value = 0; }); // 실내: 눈 없음
  scene.add(bask);

  // 실뭉치 7개: 가운데 하나 + 둘레 여섯 (바구니 속에 봉긋)
  const R = 0.36, balls = [];
  Y.hues.forEach((h, i) => {
    const b = yarnBall(renderer, R, yarnTones(h).base, 0);
    const a = ((i - 1) / 6) * Math.PI * 2 - Math.PI / 2;
    const p = i === 0 ? [0, 0] : [Math.cos(a) * 0.74, Math.sin(a) * 0.74];
    b.position.set(p[0], K.h * K.fill + R * 0.9, p[1]);
    b.rotation.set(i * 0.7, i * 1.3, i * 0.4); // 감긴 결이 저마다 다르게
    b.userData = { ...b.userData, hue: h, base: b.position.y, up: 0 };
    scene.add(b);
    balls.push(b);
  });

  const post = makePost(renderer, scene, camera);
  let size = 260, pick = 0, dirty = true;

  function resize(px) {
    size = px;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(px, px);
    post.resize(px, px, dpr);
    dirty = true;
  }

  // 고르기: 그 실뭉치가 통 튀어 오른다
  function choose(i, tell = true) {
    pick = (i + balls.length) % balls.length;
    el.setAttribute('aria-valuetext', Y.names[pick]);
    if (tell) onPick(Y.hues[pick]);
    dirty = true;
  }
  /** 바깥에서 실 색을 정할 때: 가장 가까운 색의 실뭉치 */
  function setHue(h) {
    let best = 0, bd = 999;
    Y.hues.forEach((x, i) => { const d = Math.abs(((x - h + 540) % 360) - 180); if (d < bd) { bd = d; best = i; } });
    choose(best, false);
  }

  const ray = new THREE.Raycaster(), v = new THREE.Vector2();
  function at(e) {
    const r = renderer.domElement.getBoundingClientRect();
    v.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, camera);
    const hit = ray.intersectObjects(balls, true)[0];
    if (!hit) return -1;
    return balls.findIndex((b) => { let ok = false; b.traverse((o) => { if (o === hit.object) ok = true; }); return ok; });
  }
  el.addEventListener('pointerdown', (e) => { const i = at(e); if (i >= 0) choose(i); });
  el.addEventListener('pointermove', (e) => { el.style.cursor = at(e) >= 0 ? 'pointer' : ''; });
  el.addEventListener('keydown', (e) => {
    const k = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!k) return;
    e.preventDefault();
    choose(pick + k);
  });

  // 매 프레임: 고른 실뭉치는 떠올라 살짝 흔들리고, 나머지는 내려앉는다. 움직일 때만 그린다
  let t = 0;
  function update(dt) {
    t += dt;
    let moving = false;
    balls.forEach((b, i) => {
      const u = b.userData, want = i === pick ? 1 : 0;
      const next = reduceMotion ? want : u.up + (want - u.up) * Math.min(1, dt * 10);
      if (Math.abs(next - u.up) > 1e-4) moving = true;
      u.up = next;
      b.position.y = u.base + u.up * 0.32;
      if (i === pick && !reduceMotion) { b.rotation.y += dt * 0.8; moving = true; }
    });
    if (moving || dirty) { post.render(); dirty = false; }
  }

  return { el, update, resize, setHue, choose, hue: () => Y.hues[pick] };
}
