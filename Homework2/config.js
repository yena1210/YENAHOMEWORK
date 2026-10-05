// EMBER 조정값 모음
const CONFIG = {
  // 화면/성능
  maxDpr: 2,
  flameRes: 0.5, // 불꽃 버퍼 해상도
  bloomRes: 0.25, // 블룸 해상도

  // 배치
  layout: {
    wickY: 0.6, // 심지 높이
    flameH: 0.36, // 불꽃 높이
    flameHMax: 0.2,
    candleW: 0.52, // 초 너비
    candBot: 0.84, // 초 바닥
  },

  // 불꽃 색
  color: {
    core: [1.0, 0.96, 0.84],
    mid: [1.0, 0.66, 0.24],
    outer: [0.78, 0.3, 0.05],
    blue: [0.22, 0.38, 1.0],
    // 레벨 3 색
    o2Core: [0.55, 0.75, 1.0],
    o2Mid: [0.25, 0.42, 1.0],
    o2Outer: [0.08, 0.12, 0.6],
    warmLight: [1.0, 0.62, 0.3], // 주변광
    moon: [0.06, 0.07, 0.1], // 달빛
  },

  // 불꽃 모양
  flame: {
    width: 0.34, // 폭
    flicker: 1.0, // 일렁임 세기
    noiseScale: 2.2,
    noiseSpeed: 1.9,
    blueAmt: 0.9, // 푸른 기운
    breathSpeed: 1.1, // 맥동 속도
    breathAmt: 0.05,
  },

  // 블룸
  bloom: {
    threshold: 0.12,
    k1: 0.9, // 가까운 번짐
    k2: 0.8, // 중간 번짐
    k3: 0.75, // 넓은 번짐
    pulse: 0.06, // 맥동 크기
  },

  // 배경 별
  stars: {
    bright: 0.9,
    bokeh: 14,
  },

  // 노출/밝기
  light: {
    minExposure: 0.3, // 최소 노출
    lightRadius: 0.16, // 주변광 반경
    haze: 0.16, // 공기 중 번짐
    flameGain: 1.35,
  },

  // 타이밍
  time: {
    darkHold: 0.9, // 암전 대기
    ignite: 1.6, // 점화 시간
    emberFade: 2.2, // 불씨 식는 시간
  },

  // 레벨 1
  l1: {
    hitR: 1.1, // 히트 반경
    dur: 0.2, // 꺼지는 시간
  },

  // 레벨 2
  l2: {
    maxSpeed: 2200, // 90도 속도
    killDeg: 60, // 꺼지는 각도
    push: 200, // 밀림 스프링
    pushDamp: 17.6, // 밀림 감쇠
    stiff: 34, // 복원 스프링
    damp: 4.2, // 복원 감쇠
    flutter: 0.09, // 팔랑거림
    flutterSpeed: 7, // 팔랑거림 속도
    breeze: 0.24, // 산들바람
    breezeSpeed: 0.8,
    breezeSound: 0.12, // 산들바람 소리
    velDecay: 4.5, // 바람 감쇠
    stretch: 0.55, // 늘어남
    dur: 0.3,
    embers: 8,
  },

  // 레벨 3
  l3: {
    holdTime: 4.0, // 꺼지는 시간
    recover: 1.5, // 회복 시간
    minScale: 0.42, // 최소 크기
    glassW: 0.95, // 유리컵 반폭
    glassDrop: 5, // 유리컵 속도
    glassFade: 1.2, // 유리컵 사라지는 시간
    drops: 0.3, // 물방울 양
    glassTop: 1.35, // 유리컵 높이
    dur: 0.7,
  },

  // 연기
  smoke: {
    count: 15,
    gap: 0.07, // 간격
    life: 3.2,
    rise: 80, // px/s
    size: [4, 54], // 크기
    bright: 0.75,
    sway: 22,
  },

  // 안내 문구
  hint: {
    delay: 1.2, // 지연
    show: 5, // 표시 시간
  },

  // 감각
  sense: {
    volume: 0.7,
    vibrate: 35, // ms
  },
};
