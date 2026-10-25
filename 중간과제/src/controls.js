// 정면 고정 카메라 + 패럴랙스
// 손가락(마우스) 위치나 기기 기울기를 따라 시점이 좌우 몇 도, 상하 1~2도만 부드럽게 움직인다.
import * as THREE from 'three';
import { config, reduceMotion } from './config.js';

export function makeControls(el, camera) {
  const cam = config.camera;
  const goal = new THREE.Vector2(); // 목표 (-1~1)
  const now = new THREE.Vector2(); // 현재
  const look = new THREE.Vector3(0, cam.lookY, 0);
  let dist = 12;
  let touching = false;
  let tilt = null; // 기기 기울기 기준값

  function toNdc(e) {
    return new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  }
  let frozen = false; // 꾹 누르기, 당기기 동안에는 시점을 멈춘다 (손가락 아래 대상이 미끄러지지 않게)
  function move(e) {
    if (frozen) return;
    const p = toNdc(e);
    goal.copy(p);
  }
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerdown', (e) => { touching = true; move(e); askTilt(); });
  const up = (e) => {
    touching = false;
    // 터치는 손을 떼면 천천히 가운데로 돌아온다 (마우스는 그 자리)
    if (e.pointerType !== 'mouse' && !frozen) goal.set(0, 0);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  // 기기 기울기 (iOS는 처음 터치할 때 권한을 물어본다)
  let asked = false;
  function askTilt() {
    if (asked) return;
    asked = true;
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      D.requestPermission().then((r) => r === 'granted' && listenTilt()).catch(() => {});
    } else if (D) listenTilt();
  }
  function listenTilt() {
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || touching || frozen) return;
      if (!tilt) tilt = { g: e.gamma, b: e.beta };
      goal.set(
        THREE.MathUtils.clamp(((e.gamma - tilt.g) / 25) * cam.tilt, -1, 1),
        THREE.MathUtils.clamp(((e.beta - tilt.b) / 25) * cam.tilt, -1, 1)
      );
    });
  }

  // 읽기: 조각 쪽으로 다가가며 살짝 기운다 (fk 0 → 1)
  let focusOn = false, fk = 0;
  const fp = new THREE.Vector3(), at = new THREE.Vector3();
  function focus(p) {
    focusOn = !!p;
    if (p) fp.copy(p);
  }

  // 매 프레임
  // 옆걸음: 바라보는 곳을 옆 나무로 (부드럽게 출발, 부드럽게 도착)
  let panFrom = 0, panTo = 0, panT = 1, panX = 0;
  function pan(x) {
    if (x === panTo) return;
    panFrom = panX; panTo = x; panT = reduceMotion ? 1 : 0;
  }
  function update(dt = 1 / 60) {
    if (panT < 1) panT = Math.min(1, panT + dt / config.trees.panTime);
    const pe = panT < 0.5 ? 4 * panT ** 3 : 1 - (-2 * panT + 2) ** 3 / 2;
    panX = panFrom + (panTo - panFrom) * pe;
    look.x = panX;
    const f = reduceMotion ? 1 : cam.follow;
    const g = reduceMotion ? goal.clone().multiplyScalar(0.3) : goal;
    now.x += (g.x - now.x) * f;
    now.y += (g.y - now.y) * f;
    fk += ((focusOn ? 1 : 0) - fk) * (reduceMotion ? 1 : cam.focusFollow);
    const e = fk * fk * (3 - 2 * fk); // 부드럽게 출발, 부드럽게 도착
    // 바라보는 곳은 조각 쪽으로, 거리는 가깝게, 조각이 있는 쪽으로 몇 도 돈다
    at.copy(look).lerp(fp, e * cam.focusLook);
    const d = dist * (1 - e * cam.focusZoom);
    const side = Math.sign(fp.x - look.x) || 1;
    const yaw = THREE.MathUtils.degToRad(-now.x * cam.yaw + side * e * cam.focusTilt);
    const pitch = THREE.MathUtils.degToRad(-now.y * cam.pitch + e * cam.focusTilt * 0.4);
    camera.position.set(
      at.x + Math.sin(yaw) * Math.cos(pitch) * d,
      at.y + Math.sin(pitch) * d,
      at.z + Math.cos(yaw) * Math.cos(pitch) * d
    );
    camera.lookAt(at);
  }

  // 나무 높이 h, 폭 w가 화면에 들어오도록 거리를 정한다
  function frame(h, w, lookY = cam.lookY) {
    const v = Math.tan((camera.fov * Math.PI) / 360);
    const dh = (h / 2) / (v * cam.fill);
    const dw = (w / 2) / (v * camera.aspect * 0.92);
    dist = Math.max(dh, dw);
    // 세로 화면: 폭에 맞추면 위가 남는다 → 나무 꼭대기가 들어오도록 바라보는 곳을 올린다
    const hh = v * dist;
    const top = camera.aspect < 1 ? h - lookY - hh * cam.topFit : 0;
    look.set(panX, lookY + Math.max(0, Math.min(top, hh * 0.35)), 0);
  }

  // 스크린샷용: 시점을 바로 옮긴다 (x, y는 -1~1)
  function set(x, y) {
    goal.set(x, y);
    now.set(x, y);
    update();
  }

  return {
    update, frame, set, focus, pan,
    get panX() { return panX; },
    get panning() { return panT < 1; },
    freeze(v) { frozen = v; },
    get dist() { return dist; },
  };
}
