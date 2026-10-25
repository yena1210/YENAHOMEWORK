// 개발용 조절 패널. 주소에 ?debug 가 있을 때만 불러온다.
import GUI from '../lib/lil-gui-0.21.0.esm.min.js';
import { config } from './config.js';
import { applyLook } from './toon.js';

export function makeDebug({ post, resize }) {
  const gui = new GUI({ title: 'debug' });
  const re = () => { applyLook(); post.setLook(); };

  // 주소 값을 바꿔 다시 여는 것들 (계절, 나무)
  const reload = (k, v) => {
    const q = new URLSearchParams(location.search);
    q.set(k, v);
    location.search = q.toString();
  };
  const pick = { season: config.season, seed: config.tree.styles[config.tree.pick].seed };
  gui.add(pick, 'season', Object.keys(config.seasons)).name('계절').onChange((v) => reload('season', v));
  gui.add(pick, 'seed', 1, 99, 1).name('나무 시드').onFinishChange((v) => reload('seed', v));

  const L = config.look;
  const f1 = gui.addFolder('그림체');
  f1.addColor(L, 'lit').name('밝은 면').onChange(re);
  f1.addColor(L, 'shade').name('그림자 면').onChange(re);
  f1.add(L, 'thresh', -0.6, 0.6).name('명암 경계').onChange(re);
  f1.add(L, 'soft', 0, 0.2).name('경계 부드러움').onChange(re);
  f1.addColor(L, 'ink').name('잉크 색').onChange(re);
  f1.add(L, 'line', 0, 4).name('선 굵기 (가까이)').onChange(re);
  f1.add(L, 'lineFar', 0, 3).name('선 굵기 (멀리)').onChange(re);
  f1.add(L, 'pencil', 0, 1).name('선 색연필 끊김').onChange(re);
  f1.add(L, 'paper', 0, 0.6).name('종이 세기').onChange(re);

  const W = config.wind;
  const f2 = gui.addFolder('바람 (식물만)');
  f2.add(W, 'strength', 0, 2).name('잔바람').onChange(re);
  f2.add(W, 'sway', 0, 2).name('흔들림 크기').onChange(re);
  f2.add(W, 'gustPower', 0, 1).name('돌풍 세기');

  const C = config.camera;
  const f3 = gui.addFolder('패럴랙스');
  f3.add(C, 'yaw', 0, 8).name('좌우 범위 (도)');
  f3.add(C, 'pitch', 0, 4).name('상하 범위 (도)');
  f3.add(C, 'follow', 0.01, 0.3).name('따라오기');
  f3.add(config.front, 'scale', 0.3, 1.2).name('앞 식물 크기').onChange(resize);

  const H = config.wheel;
  const f4 = gui.addFolder('물레');
  f4.add(H, 'design', ['a', 'b', 'c']).name('디자인').onChange((v) => reload('wheel', v));
  f4.add(H, 'size', 40, 140, 1).name('크기 (px)').onChange(resize);
  f4.add(H, 'friction', 0.5, 8).name('관성 줄어듦');
  f4.add(H, 'maxSpin', 2, 30).name('관성 최대 속도');
  f4.add(H, 'wheelK', 0.05, 1).name('휠 감도');
  f4.add(H, 'keyStep', 1, 20, 1).name('화살표 한 칸 (도)');

  const I = config.input;
  const f5 = gui.addFolder('손 입력');
  f5.add(I, 'holdMs', 100, 800, 10).name('꾹 판단 (ms)');
  f5.add(I, 'dragPx', 2, 30, 1).name('끌기 판단 (px)');
}
