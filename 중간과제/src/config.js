// 조절할 수 있는 값은 전부 여기에 모은다.
// 색은 전부 sRGB 16진수로 적는다 (three.js가 알아서 Linear로 바꿔 계산한다).

export const config = {
  seed: 7, // 같은 시드 = 같은 결과

  // 그림체 (툰 명암 + 잉크 선 + 종이)
  look: {
    lit: '#fff8ec', // 밝은 면에 곱하는 색 (따뜻한 금빛)
    shade: '#a9abe6', // 그림자 면에 곱하는 색 (청보라)
    thresh: 0.02, // 명암 경계 위치 (-1~1, 클수록 그림자가 넓다)
    soft: 0.025, // 명암 경계 부드러움 (계단 방지용, 그라데이션은 아님)
    sunDir: [-0.55, 0.8, 0.55], // 해 방향 (왼쪽 위 앞)
    ink: '#3a3766', // 잉크 색 (보라빛 남색)
    line: 1.7, // 가까운 윤곽선 굵기 (px)
    lineFar: 0.6, // 먼 윤곽선 굵기 (px)
    thinLine: 0.5, // 뒤 나무 윤곽선 굵기 배율
    pencil: 0.25, // 선의 색연필 끊김
    paper: 0.22, // 종이 질감 세기 (곱하기)
  },

  // 바람과 흔들림
  wind: {
    strength: 0.45, // 잔바람 세기
    sway: 0.6, // 흔들림 크기 (전체 배율)
    gustEvery: [6, 11], // 돌풍 간격 (초)
    gustPower: 0.22, // 돌풍 세기
    gustSpeed: 9, // 돌풍이 지나가는 빠르기 (월드/초)
  },

  // 카메라: 정면 고정 + 패럴랙스
  camera: {
    fov: 32,
    lookY: 2.1, // 바라보는 높이
    fill: 0.9, // 나무가 화면 높이를 채우는 비율
    yaw: 2.4, // 좌우로 움직이는 최대 각도 (도)
    pitch: 1.5, // 상하로 움직이는 최대 각도 (도)
    follow: 0.05, // 따라가는 정도 (작을수록 늦게)
    tilt: 0.6, // 기기 기울기 반영 정도
    topFit: 0.86, // 세로 화면에서 나무 꼭대기를 화면 위 끝의 이만큼 안에 (앞으로 뻗은 가지는 원근으로 더 높아 보여서 여유를 둔다)
    // 읽기: 조각을 톡 누르면 그 조각 쪽으로
    focusLook: 0.45, // 바라보는 곳이 조각 쪽으로 옮겨 가는 정도 (0~1)
    focusZoom: 0.28, // 다가가는 정도 (거리를 이만큼 줄인다)
    focusTilt: 4, // 조각 쪽으로 도는 각도 (도)
    focusFollow: 0.06, // 다가가고 돌아오는 빠르기
  },

  // 뒤 층 (덤불, 실패, 바늘꽂이). 2안: ?back=a / b
  back: {
    pick: 'b',
    a: { needle: true, bushes: [[-6.5, -6, 1.1], [7.2, -8, 1.3], [-12, -14, 1.6], [13, -15, 1.7], [3.5, -19, 1.4], [-4, -22, 1.5]] }, // 처음 것
    // 정리: 나무 옆 덤불을 조금 비켜 작게, 바늘은 뺀다 → 가지 윤곽이 하늘에 깨끗이 선다
    // (덤불 수는 그대로 둔다. 수가 바뀌면 뒤따르는 난수가 밀려 앞 층 모양이 달라진다)
    b: { needle: false, bushes: [[-7.6, -7.5, 0.95], [8.6, -9.5, 1.15], [-12.5, -14, 1.5], [13.5, -15, 1.6], [6.2, -21, 1.05], [-7.2, -23, 1.15]] },
  },

  // 맨 앞 층 (화면 가장자리를 감싸는 뜨개 식물)
  front: {
    depth: 3.2, // 카메라에서의 거리
    scale: 0.55, // 크기 (화면 반높이 기준)
    tall: 0.69, // 세로 화면에서는 이만큼 작게 (밑동과 입력 줄을 가리지 않게)
    follow: 0.82, // 카메라를 따라가는 정도 (1 = 화면에 고정, 0 = 제자리)
  },

  // 큰 실뭉치와 실 꼬리. 자리 3안: ?ball=a / b / c
  yarnBall: {
    pick: 'a',
    spots: {
      a: [-1.9, 1.2], // 나무 왼쪽 앞 (해 쪽, 실이 그림자 밖 밝은 눈밭을 지난다)
      b: [2.1, 1.5], // 나무 오른쪽 앞 (나무 그림자 속)
      c: [-0.6, 2.4], // 화면 가운데 앞 (실이 정면으로 길게 뻗는다)
    },
    r: 0.55, // 실뭉치 반지름
    thread: 0.032, // 실 굵기 (반지름)
    wiggle: 0.35, // 실이 구불거리는 폭
    wiggleN: 2.5, // 구불거리는 횟수
    reach: 1.05, // 밑동 어디에 닿을지 (밑동 굵기 배율)
  },

  // 뜨개 조각
  knit: {
    tone: { s: 0.5, l: 0.76, accentShift: 150 }, // 실 톤: 채도, 밝기, 포인트 색을 얼마나 돌릴지
    thick: 0.022, // 조각 두께 (가지 표면에서 떨어진 거리)
    fullR: 0.3, // 이 굵기보다 가는 가지에서는 두께, 단 폭을 줄인다
    hem: 0.07, // 끝 단 폭
    roll: 0.9, // 단이 도톰하게 부푸는 정도
    ink: 0.85, // 짜임 잉크 선 진하기
    cell: { mesh: 0.2, stripe: 0.24, granny: 0.52 }, // 그래니는 2×2 모자이크 한 장 크기 // 무늬 한 칸의 실제 크기 (코 크기를 일정하게)
    ribCell: 0.07,
    deco: { flower: 0.2, pompom: 0.13, cord: 0.16, tassel: 0.32 }, // 장식 크기 (아이패드에서도 알아보게)
    // 짜임 표현 3안. ?knit=a / b / c
    look: 'a',
    looks: {
      a: { name: '잉크 디테일', cellK: 1, ink: 0.85, sat: 1, light: 0 }, // 지금: 코와 모티프를 잉크로 촘촘히
      b: { name: '굵은 코', cellK: 2.3, ink: 1, sat: 1.05, light: 0 }, // 굵은 실: 코가 커서 멀리서도 읽힌다
      c: { name: '색면 위주', cellK: 1, ink: 0.15, sat: 1.5, light: -0.05 }, // 안쪽 선은 옅게, 색으로 구분
    },
  },

  // 슬롯: 뜨개 조각이 감길 자리
  slots: {
    max: 16, // 한 그루에 이만큼까지 (넘치면 새 나무)
    maxLevel: 2, // 0 줄기, 1 갈라진 줄기, 2 큰 가지까지만
    rMin: 0.09, // 이보다 가는 곳에는 감지 않는다 (가는 가지의 조각은 작아서 찾기 어렵다)
    lenK: 1.3, // 조각 길이 = 지름 × 이 값
    minLen: 0.36, maxLen: 0.62, // 조각 길이 범위
    gap: 0.02, // 이웃 조각 사이 틈
    trunkStart: 0.42, // 줄기 밑동에서 이 높이부터 (뿌리 위)
    trunkLen: 0.38, // 줄기 조각 길이 (대략. 갈라지는 곳까지 고르게 나눈다)
    trunkTop: 0.04, // 줄기 마지막 조각은 갈라지는 곳 이만큼 앞까지 (갈래가 조각 윗단을 뚫고 나온다)
    leadStart: 0.12, // 갈라진 줄기는 갈래에서 이만큼 위부터 (가운데 기둥이 비지 않게)
    maxTp: 0.8, // 큰 가지는 부모 가지의 이 비율 안쪽에서 난 것만 (끝 쪽은 빽빽해서 가려진다)
    maxY: 4.4, // 이보다 높은 자리는 화면 위 끝에 붙거나 잘리니 쓰지 않는다
    forkPad: 1.3, // 갈라지는 곳을 비우는 폭 (자식 굵기 배율)
    bigKid: 0.6, // 자식이 부모 굵기의 이만큼보다 굵으면 그 갈래는 비운다
    minSeen: 0.6, // 정면에서 이만큼은 보여야 슬롯이 된다
    minFrontLead: 0.5, // 줄기와 갈라진 줄기는 이만큼만 보여도
    minFront: 0.8, // 카메라를 똑바로 보는 면이 이만큼은 보여야 (옆면만 보이는 뒤쪽 가지는 뺀다)
    sep: 0.05, // 다른 가지의 조각과 화면에서 이만큼(시야 각) 떨어져야 (겹쳐 보이지 않게)
    hangDrop: 0.4, // 매달린 장식 자리를 찾을 때 이만큼 아래 끝도 보여야 한다
    decoSide: 0.3, // 장식은 정면에서 이만큼(라디안) 이상 옆으로 돈 자리 중에서 랜덤 (보이는 자리가 없으면 정면)
  },

  // 꾹 눌러 짜기
  press: {
    reach: 36, // 나무에서 이만큼(px) 떨어진 곳을 눌러도 나무를 누른 것으로
    stripeAt: 1.0, // 이만큼 누르면 줄무늬 (초, 누르기 시작부터)
    grannyAt: 2.0, // 이만큼 누르면 그래니
    threadUp: 0.45, // 실이 밑동에서 슬롯까지 올라가는 시간
    holdKnit: 3.0, // 누르는 동안 끝까지 짜는 데 걸릴 시간 (느리게)
    holdCap: 0.85, // 누르는 동안은 여기까지만 짠다 (떼면 마저)
    knitTime: 1.6, // Enter로 짤 때 한 조각 시간
    finish: 0.5, // 떼고 남은 부분을 마저 짜는 시간
    threadOut: 0.5, // 다 짜고 실이 감겨 들어가는 시간
    ballSpin: 9, // 짜는 동안 큰 실뭉치가 도는 양
    flashTime: 0.35, // 짜임이 바뀔 때 반짝이는 시간
    trembleTime: 0.45, trembleAmp: 0.012, // 빈 자리가 없을 때 나무가 떠는 시간, 세기
  },

  // 읽기: 메모 글이 조각 옆에 떠오른다
  read: {
    afterKnit: 2.5, // 다 짠 직후 글을 보여 주는 시간 (초)
    gap: 26, // 조각과 글 사이 거리 (px)
    width: 260, // 글 최대 폭 (px)
    hover: 0.16, // 마우스를 올렸을 때 밝아지는 정도
  },

  // 장식: 조각을 톡톡 → 꽃 → 퐁퐁 → 태슬 → 없음
  deco: {
    order: ['flower', 'pompom', 'tassel', null],
    names: { flower: '날짜', pompom: '알림', tassel: '체크' },
    knitTipTimes: 3, knitTipTime: 5, // 다 짠 직후 장식 안내: 처음 이만큼 번, 이만큼(초) 보여 준다
    tips: { flower: '꽃은 날짜예요. 기념일이나 마감을 고르면 다가올수록 피어나요', pompom: '퐁퐁은 알림이에요. 시간을 고르면 그때 깨어나 알려 줘요', tassel: '태슬은 체크예요. 다 하면 눌러서 술을 묶어 두세요' }, // 읽을 때 날짜 옆에 작게 (날짜를 정하면 D-3 같은 글로 바뀐다)
    popTime: 0.45, // 톡 튀어나오는 시간 (초)
    outTime: 0.2, // 뗄 때 쏙 들어가는 시간
  },

  // 장식의 날짜: 꽃 = D-day, 태슬 = 마감, 퐁퐁 = 다시 알림
  due: {
    bloomDays: 7, // 꽃: 이만큼 전부터 봉오리가 벌어지기 시작해 당일 활짝
    tasselMin: 0.35, // 태슬: 마감에 가장 짧을 때 길이 (배율)
    sleepSize: 0.6, // 퐁퐁: 잠들었을 때 크기
    bounce: 0.05, // 퐁퐁이 깨어나 통통 튀는 높이
    wobble: 0.14, // 오늘인 꽃·마감 하루 전 태슬이 흔들리는 정도
  },

  // 찾기: 입력 줄에 적는 동안 같은 말이 든 조각이 반짝인다
  find: {
    glow: 0.2, // 맞는 조각이 밝아지는 정도
    dim: 0.62, // 나머지 조각이 흐려지는 정도
    pulse: 0.45, // 숨 쉬듯 약해지는 폭 (0 = 깜빡임 없음)
    speed: 3.2, // 숨 쉬는 빠르기
    hueRange: 24, // 색으로 모아 보기: 바늘 색에서 이만큼(도) 안의 조각
    hueLinger: 0.9, // 물레를 멈춘 뒤에도 이만큼(초) 더 보여 준다
  },

  // 시간의 흔적: 가만히 둔 조각에 눈이 서서히 쌓인다. 톡(읽기) → 털림. 닫아 둔 시간도 센다
  trace: {
    wait: 3600, time: 172800, // 실제: 1시간 가만히 있으면 쌓이기 시작, 이틀이면 소복이 (초)
    fastWait: 4, fastTime: 40, // 발표용 빠른 모드 (?fast)
    amount: 2.6, // 소복이 쌓였을 때 눈 양 (덮임 배율에 더한다)
    shake: 0.4, // 털리는 시간
  },

  // 메모 목록: 큰 실뭉치를 길게 누르면
  list: { holdMs: 550 },

  // 나무 여러 그루: 한 그루가 꽉 차면 새 나무가 생기고 옆으로 넘겨 본다
  trees: {
    seedStep: 101, // 나무마다 시드를 이만큼씩 바꾼다 (모양만 다르고 그림체는 같다)
    perPage: 3, // 정원 한 화면에 나란히 서는 나무 수 (넘치면 다음 쪽)
    backPrune: { keep1: 0.3, keep2: 0, minLen: 0.3 }, // 뒤 나무 잔가지 덜어 내기 (앞 나무는 tree.twigs)
    backTint: '#a9a6cf',
    backInk: 0.55, // 뒤 나무 껍질 결 선 진하기 (윤곽선 굵기는 look.thinLine) // 뒤 나무 줄기 색에 곱하는 색 (작을수록 어둡다)
    spots: [[0, 0], [-2.9, -5.4], [3.1, -6.6]], // 한 정원의 나무 자리 (x, z): 앞 가운데, 뒤 왼쪽, 뒤 오른쪽
    growTime: 1.4, // 새 나무가 자라 오르는 시간
    panTime: 0.9, // 옆 나무로 옆걸음하는 시간
    gap: 13, // 쪽을 넘길 때 더 밀려 나가는 거리
    slideTime: 0.8, // 넘기는 시간
    swipe: 90, // 빈 곳을 옆으로 이만큼(px) 쓸면 넘긴다
    max: 9, // 나무는 이만큼까지
  },

  // 함박눈: 하늘을 톡 누르면 잠깐 펑펑 내린다
  flurry: { count: 1400, size: 11, fall: 1.3, rise: 1.0, hold: 6, fade: 2.5 },

  // 소리: 오르골 배경 왈츠 (파일 없이 Web Audio 로)
  sound: {
    volume: 0.8, // 전체
    music: 0.5, // 배경 음악
    bpm: 66, // 왈츠 빠르기 (3/4박)
    decay: 1.4, // 오르골 음이 울리는 길이 (초 정도)
    wet: 0.45, // 잔향 양
    verbSec: 3.2, // 잔향 길이
    bright: 5200, // 높은 소리를 이 위로 깎아 부드럽게 (Hz)
    fadeIn: 5, // 처음 음악이 커지는 시간 (초)
  },

  // 저장 (localStorage). 실패해도 화면은 그대로 돈다
  save: { key: 'memo.v1', every: 1.5 }, // 바뀐 게 있으면 이만큼(초)마다 저장

  // 당겨 풀기: 조각을 잡고 끌면 실이 손가락을 따라 늘어나며 풀린다
  pull: {
    full: 0.36, // 화면 짧은 변의 이만큼 당기면 다 풀린다
    front: 0.35, // 손가락 판을 조각 앞면에서 이만큼 앞에 (월드)
    out: 0.7, // 실이 조각에서 바깥으로 먼저 나오는 길이
    sag: 0.1, // 늘어난 실이 처지는 정도 (길이 배율)
    kink: 0.032, // 풀린 실의 꼬불거림 폭
    kinkN: 9, // 꼬불거림 횟수 (길이 1당)
    backTime: 0.4, // 중간에 놓으면 다시 짜이는 시간
    windTime: 0.28, // 다 풀리고 남은 실이 실뭉치로 감기는 시간
  },

  // 작은 실뭉치 (지운 메모). 위에서 본 2D 물리 (Matter.js): Matter (x, y) = 땅 (x, z)
  balls: {
    r: 0.17, // 반지름
    cover: 0.35, // 눈 덮임 (작아서 다 덮으면 색이 안 보인다)
    max: 18, // 이보다 많으면 가장 오래된 것부터 빨리 눈에 묻힌다
    // 눈에 묻히기: 바구니 밖 실뭉치는 가만히 두면 눈이 덮이며 가라앉고, 다 묻히면 사라진다. 톡 → 털림
    bury: {
      wait: 300, time: 900, // 실제: 5분 가만히 있으면 쌓이기 시작, 15분이면 다 묻힘 (초)
      fastWait: 3, fastTime: 14, // 발표용 빠른 모드 (?fast)
      rush: 8, // 너무 많을 때 가장 오래된 것은 이만큼 빨리
      shake: 0.35, // 털리는 시간
      melt: 2.5, // 다 묻히고 남은 눈 둔덕이 녹는 시간
    },
    feel: 'b', // 물리 느낌 ?feel=a / b / c
    feels: {
      a: { name: '묵직', frictionAir: 0.075, restitution: 0.2, density: 0.006 },
      b: { name: '보통', frictionAir: 0.04, restitution: 0.45, density: 0.003 },
      c: { name: '통통', frictionAir: 0.022, restitution: 0.8, density: 0.002 },
    },
    nearY: -0.7, // 앞 경계: 화면 아래에서 이 높이(ndc)의 땅 (앞 식물, 입력 줄 위)
    sideX: 0.6, // 옆 경계: 화면 가운데에서 이만큼(ndc)까지 (앞 모서리 잎 덤불 뒤로 숨지 않게)
    far: -3.2, // 뒤 경계 (z)
    corners: [[0.6, -0.56, 1.0]], // 앞 모서리 덤불 자리: 화면(ndc x, y)의 땅에 반지름(월드) 원. 좌우 대칭
    fall: 16, // 떨어지는 중력
    liftY: 0.6, // 들었을 때 높이 (손가락 아래에 떠서 따라온다)
    homeY: 1.4, // 밑동 그림의 이 높이 아래에서 놓으면 다시 짜인다
    homeTime: 0.45, // 밑동에 닿아 실이 되어 들어가는 시간
    peek: 2.2, // 톡 누르면 흐릿한 글이 보이는 시간 (초)
  },

  // 바구니: 간직하고 싶은 실뭉치만 굴려 넣는다 (넣은 것은 스며들지 않는다)
  basket: {
    at: [1.5, 0.5], // 처음 자리 (x, z). 화면 크기가 정해지면 screen 자리로 옮긴다
    screen: { land: [0.34, -0.55], port: [0.58, -0.5] }, // 화면의 이 자리(ndc x, y) 땅에 둔다: 밑동과 앞 꽃 사이
    r: 0.6, // 위 반지름
    h: 0.36, // 높이
    fill: 0.45, // 속이 이만큼 차 있다 (담긴 실뭉치가 테두리 위로 봉긋 보이게)
    base: '#f1dfb8', // 바탕 실 (귀리색)
    band: '#9fb0e2', // 줄무늬
    shade: '#d9c193', // 안쪽, 코 사이
    rim: '#e3a3bb', // 테두리
    maxKeep: 60, // 바구니에 이만큼까지 (보이는 건 위의 12개, 나머지는 창에서)
    hopTime: 0.4, // 바구니로 쏙 들어가는 시간
    hintTimes: 2, // "바구니에 넣으면 간직돼요" 힌트를 보여 줄 횟수
    viewRows: 4, // 바구니 창에 한 번에 보이는 줄 수 (넘치면 스크롤)
  },

  // 뜨개 쓰기 창: 쓰는 글자가 코로 떠진다
  pad: {
    font: "'NanumSquare Neo', sans-serif",
    glyphSize: 0.92, // 한 줄 높이에 대한 글자 크기
    ink: 0.2, // 코의 이만큼 이상 덮이면 글 실로 뜬다 (작을수록 획이 굵다)
    stitch: 8, // 코 크기 (px)
    rows: 30, // 한 줄 = 코 이만큼 (글꼴 15칸 × 굵게 2)
    // 픽셀 글꼴 갈무리11 (OFL, lib/fonts): 글꼴의 한 칸 = 코 하나 → 받침이 있는 글자(록, 를, 음)도 뭉치지 않는다
    pixel: { family: 'Galmuri11', em: 12, space: 3, scale: 2 },
    sizes: [5, 4.5, 4, 3.5, 3, 2.6, 2.3], // 읽기 창: 글이 길면 코를 이 순서로 작게
    width: 600, // 쓰기 창 폭 (px)
    frame: 16, // 나무 뜨개틀 두께 (px)
    maxHeight: 0.6, // 틀 높이는 보이는 화면 높이의 이만큼까지
    minLines: 2, // 처음 천 높이 (줄)
    base: '#f6efe0', shade: '#e6dcc6', // 바탕 실, 코 사이
    needle: '#e9c98f', // 바늘 (나무색)
    charTime: 0.18, // 한 글자가 떠지는 시간
    unravelTime: 0.14, // 지운 글자가 풀리는 시간
    rollTime: 0.38, flyTime: 0.42, // 다 뜨면 천이 말리는 시간, 가지로 날아가는 시간
    readWidth: 520, // 읽을 때 틀 폭 (px)
  },

  // 뜨개방: 메모를 쓰는 따로 된 화면 (왼쪽 큰 뜨개틀, 오른쪽 제목과 실 색 휠)
  room: {
    margin: 30, // 화면 가장자리 여백 (px, 장식 틀이 들어갈 자리)
    side: 340, // 오른쪽 판 폭 (px)
    plate: 14, // 뜨개틀 둘레 장식 틀까지의 거리 (px)
    wheel: 270, // 실 바구니 그림 크기 (px)
    sizes: [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4.5, 4, 3.5, 3],
    // 실 바구니: 실뭉치 7개 (가운데 + 둘레 여섯)
    yarns: {
      hues: [345, 20, 48, 95, 165, 210, 265],
      names: ['분홍 실', '살구 실', '노랑 실', '연두 실', '민트 실', '하늘 실', '보라 실'],
      paper: '#efe9dc', // 바구니가 놓인 종이 색 (뜨개방 종이와 같게)
    }, // 코 크기: 가장 긴 메모가 들어가는 가장 큰 것 (휴대폰은 작게)
  },

  inputWidth: 340, // 메모 입력 줄 폭 (px, 좁은 화면에서는 화면 폭에 맞춘다)

  // 손 입력 판단 (톡 / 꾹 / 끌기)
  input: {
    holdMs: 300, // 움직이지 않고 이만큼 누르면 꾹
    dragPx: 8, // 이만큼 움직이면 끌기
    doubleMs: 340, // 톡 뒤 이 시간 안에 또 톡 → 톡톡
    doublePx: 30, // 두 톡이 이만큼 안에서
  },

  // 물레: 돌려서 실 색을 고른다. 디자인 3안: ?wheel=a / b / c
  wheel: {
    design: 'b', // a 바큇살 물레 / b 단추 바퀴 / c 자수틀
    hue: 345, // 처음 실 색 (색상 0~360)
    size: 84, // 화면에서의 반지름 (px)
    sizeMobile: 0.2, // 좁은 화면에서는 화면 폭의 이 비율까지
    depth: 2.2, // 카메라 앞 거리 (앞 식물보다 앞)
    tilt: [0, 0], // 기울기 (0 = 정면, 동그란 정원)
    paper: 1.32, // 뒤 종이 판 크기 (실 고리 반지름 배율)
    popTime: 0.32, // 실뭉치에서 튀어나오는 시간 (초)
    center: 0.32, // 가운데 톡 영역 (반지름 비율) → 입력 줄 포커스
    friction: 2.6, // 놓았을 때 관성이 줄어드는 빠르기 (클수록 빨리 멈춤)
    maxSpin: 14, // 관성 최대 속도 (라디안/초)
    wheelK: 0.25, // 마우스 휠 1px 당 도는 각도 (도)
    keyStep: 6, // 화살표 한 번에 바뀌는 색상 (도)
  },

  // 뜨개 테스트 화면 (?scene=knit)
  lab: {
    cover: 0.25, // 테스트 화면에서는 눈을 조금만
    hues: [345, 205, 265, 22, 320, 190, 95], // 실 색상들 (분홍, 하늘, 라벤더, 살구, 장미, 물빛, 이끼)
  },

  // 계절 2안. ?season=a / b
  season: 'a',
  seasons: {
    a: {
      name: '겨울',
      sky: ['#c9d8ee', '#eef0f2', '#f6efe2'], // 위 → 아래
      ground: '#fbfaf7',
      thread: ['#9fb0e2', '#e3a3bb', '#a9c48e', '#e9cf86'],
      cover: 0.8, // 위를 향한 면에 쌓이는 양
      coverColor: '#ffffff',
      coverShade: '#c3c6ee',
      tree: '#cbbccc', // 나무 기본 색 (라벤더 회갈)
      bush: ['#e8b4c6', '#c4bfee', '#b7d2ef', '#f2e2a8'],
      leaf: [['#b7cf9c', '#d3e4b8'], ['#efb6c8', '#f8d8e2'], ['#d4d0f4', '#b7cf9c', '#d4d0f4']],
      petal: ['#f3c9d6', '#c4bfee', '#f2e2a8'],
      air: 'snow', // 공기 중: 눈송이
      airColor: '#ffffff',
    },
    b: {
      name: '봄',
      sky: ['#bfe0f2', '#e8f1ee', '#fbf0d4'],
      ground: '#dde0ae', // 이끼 버터색
      thread: ['#f0a9bf', '#a7b6ec', '#fff3c4', '#86a873'],
      cover: 0.45, // 오래된 면에 이끼가 낀다
      coverColor: '#9fbd7d',
      coverShade: '#7b8fa6',
      tree: '#cbbcc8',
      bush: ['#f0a9bf', '#c4bfee', '#fff0b0', '#a9d0ee'],
      leaf: [['#9fbd7d', '#c3d99c'], ['#86a873', '#b5cf8f', '#86a873'], ['#f0a9bf', '#9fbd7d']],
      petal: ['#f0a9bf', '#fff0b0', '#c4bfee'],
      air: 'fluff', // 공기 중: 털실 보풀
      airColor: '#fff7ea',
    },
  },

  // 나무껍질 디테일 텍스처
  bark: {
    size: 1024,
    tints: 60, // 옅은 색연필 얼룩 수
    tintColors: ['#f3c9d6', '#c3d99c', '#cfc8f2', '#fff0c8'],
    lines: 95, // 잉크 결 선 수 (적고 또렷하게)
    knots: 10, // 옹이 눈 수
  },

  // 나무 메시
  treeMesh: {
    segPerUnit: 22, // 길이 1당 마디 수
    segByRadius: 8, // 굵을수록 마디를 더 촘촘하게
    radialPerUnit: 260, // 굵기 1당 둘레 정점 수
    minRadial: 8,
    maxRadial: 112,
    texSize: 0.7, // 껍질 무늬 한 장의 실제 크기
    jointBlend: 0.75, // 이음매에서 부모 법선을 섞는 정도 (접합선 숨김)
    sway: 0, // 나무 흔들림 (0 = 흔들리지 않음. 바람에는 주변 식물만 살랑인다)
    swayThick: 0.09, // 이보다 굵은 가지는 흔들리지 않는다
    swayThin: 0.008, // 이보다 가는 가지는 가장 많이 흔들린다
  },

  // 나무 스타일. ?tree=1/2/3, ?seed=숫자 로 바꿔 볼 수 있다. (1 = 메모 나무)
  tree: {
    pick: 1,
    // 잔가지 정리 3안. ?twig=a / b / c (줄기와 큰 가지는 그대로, 끝 잔가지만 덜어낸다)
    twig: 'b',
    twigs: {
      a: null, // 그대로
      b: { keep1: 0.85, keep2: 0.35, minLen: 0.12 }, // 잔가지의 잔가지를 많이 덜어냄
      c: { keep1: 0.6, keep2: 0, minLen: 0.18 }, // 큰 가지 위주로 아주 깔끔하게
    },
    styles: {
      1: {
        name: 'S자 노목 (두 갈래)',
        seed: 23,
        height: 2.4, trunkR: 0.36, bend: 0.22, bendFreq: 1.4, lean: 0.06, squat: 0.0,
        helix: 0.05, helixTurns: 0.8, // 줄기 축이 나선으로 꼬이는 정도
        twist: 1.6, relief: 0.09, trunkRelief: 1.7, knots: 1.2, // 표면: 골이 감기는 빠르기, 골 깊이, 길이 1당 옹이 수
        roots: 1.7, rootN: 5, rootH: 0.3, // 뿌리: 퍼짐, 갈래 수, 높이
        tipR: 0.006, wander: 0.18, tipUp: 0.18, // 끝 굵기, 불규칙한 굽음, 끝이 들리는 정도
        subDepth: 2, sub2Count: [1, 2], sub2Len: [0.45, 0.75],
        // 줄기가 갈라지는 방식: 개수, 굵기 비율, 기울기(도), 길이(height 배율), 굽이
        fork: { count: 2, r: 0.3, ratio: [0.78, 0.86], elev: [34, 50], len: [1.25, 1.5], curl: 1.5, at: 0.8, along: 2.2, spread: 0.72 },
        mainCount: [5, 6], mainStart: 0.28, mainEnd: 0.92, mainLen: [0.55, 0.9], lenFall: 0.35,
        mainElev: [8, 40], mainRatio: [0.55, 0.72],
        rise: 0.2, droop: 0.12, curl: 0.55, flare: 0.35, base: 0.55,
        subCount: [3, 5], subLen: [0.35, 0.6], subRise: 0.25,
      },
      2: {
        name: '낮고 넓게 펼친 나무',
        helix: 0.03, helixTurns: 0.6, twist: 1.2, relief: 0.06, trunkRelief: 1.4, knots: 0.8,
        roots: 0.9, rootN: 6, rootH: 0.2, tipR: 0.012, wander: 0.15, tipUp: 0.3,
        subDepth: 2, sub2Count: [1, 2], sub2Len: [0.3, 0.5],
        seed: 31,
        height: 3.2, trunkR: 0.36, bend: 0.08, bendFreq: 1.1, lean: 0.0, squat: 0.2,
        mainCount: [6, 7], mainStart: 0.38, mainEnd: 0.88, mainLen: [0.75, 1.0], lenFall: 0.4,
        mainElev: [6, 26], mainRatio: [0.66, 0.82],
        rise: 0.1, droop: 0.16, curl: 0.45, flare: 0.38, base: 0.6,
        subCount: [3, 4], subLen: [0.25, 0.4], subRise: 0.35,
      },
      3: {
        name: '위로 솟은 나무',
        helix: 0.03, helixTurns: 0.6, twist: 1.2, relief: 0.06, trunkRelief: 1.4, knots: 0.8,
        roots: 0.9, rootN: 6, rootH: 0.2, tipR: 0.012, wander: 0.15, tipUp: 0.3,
        subDepth: 2, sub2Count: [1, 2], sub2Len: [0.3, 0.5],
        seed: 47,
        height: 5.0, trunkR: 0.3, bend: 0.08, bendFreq: 1.3, lean: -0.03, squat: 0,
        mainCount: [5, 7], mainStart: 0.35, mainEnd: 0.9, mainLen: [0.38, 0.55], lenFall: 0.25,
        mainElev: [42, 68], mainRatio: [0.45, 0.6],
        rise: 0.24, droop: 0.04, curl: 0.35, flare: 0.32, base: 0.5,
        subCount: [2, 3], subLen: [0.3, 0.5], subRise: 0.4,
      },
    },
  },


  // 성능 자동 조절
  quality: {
    maxDpr: 2,
    checkFrames: 90, // 이만큼 재고 판단
    lowFps: 42, // 이보다 느리면 한 단계 낮춤
  },
  // ?q=high 면 품질 자동 조절을 끈다 (스크린샷용)
};

// 주소에 ?debug 가 있으면 true
export const isDebug = new URLSearchParams(location.search).has('debug');

// 움직임 줄이기 설정
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
