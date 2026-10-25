// 장식의 날짜: 꽃 = 날짜(기념일, 마감 모두), 퐁퐁 = 다시 알림, 태슬 = 체크(다 했으면 술을 묶어 둔다).
// 숫자보다 뜨개 모양으로 느끼게 한다: 꽃은 피어나고, 태슬은 짧아지고, 퐁퐁은 깨어난다. 정확한 날은 읽기 글에만.
import { config } from './config.js';

const DAY = 86400000;
const midnight = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** 오늘부터 그날까지 며칠 (달력 날짜 기준. 0 = 오늘, 음수 = 지남) */
export const daysTo = (at, now = Date.now()) => Math.round((midnight(at) - midnight(now)) / DAY);

// 매년: 지난 지 하루가 넘으면 다음 해 같은 날로
function nextYearly(at, now) {
  const d = new Date(at);
  while (daysTo(d.getTime(), now) < 0) d.setFullYear(d.getFullYear() + 1);
  return d.getTime();
}

/**
 * 지금 장식 모양과 읽기 글. key 가 바뀔 때만 조각을 다시 만든다.
 * → { key, bloom, fallen, len, loose, sleep, ring, urgent, soon, label }
 */
export function dueState(m, now = Date.now()) {
  const D = config.due, u = m.due;
  const s = { bloom: 1, fallen: 0, len: 1, loose: false, sleep: false, ring: false, urgent: false, soon: false, label: null };
  if (m.deco === 'tassel') {
    // 체크: 다 했으면 술이 짧게 묶이고 조각이 살짝 바랜다
    s.checked = !!u?.done;
    s.len = s.checked ? D.tasselMin : 1;
    s.label = s.checked ? '다 했어요' : null;
    s.key = `t${s.checked}`;
    return s;
  }
  if (!u || !m.deco) return { ...s, key: '' };
  if (m.deco === 'flower') {
    const at = u.yearly ? nextYearly(u.at, now) : u.at;
    const d = daysTo(at, now);
    // 봉오리 → 다가올수록 벌어지고 → 당일 활짝 → 지나면 꽃잎이 떨어진 채
    s.bloom = d <= 0 ? 1 : Math.max(0.05, 1 - d / D.bloomDays);
    s.fallen = d < 0 ? 2 : 0;
    s.urgent = d === 0;
    s.soon = d >= 0 && d <= 1;
    s.label = d > 0 ? `D-${d}` : d === 0 ? '오늘이에요' : `${-d}일 지났어요`;
    s.key = `f${Math.round(s.bloom * 10)}/${s.fallen}`;
  } else if (m.deco === 'pompom') {
    // 알릴 때까지 작게 웅크려 잔다 → 때가 되면 통통 튀며 깨어난다 → 읽으면 끝
    s.ring = now >= u.at && !u.seen;
    s.sleep = now < u.at;
    s.soon = s.ring;
    s.label = u.seen ? null : s.ring ? '지금 알려 드려요' : `${when(u.at, now)}에 알려 줄게요`;
    s.key = `p${s.sleep}/${s.ring}`;
  }
  return s;
}

// "오늘 저녁 7시", "내일 아침 9시", "10월 24일 오후 3시"
function when(at, now) {
  const t = new Date(at), d = daysTo(at, now), h = t.getHours(), mm = t.getMinutes();
  const hm = `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시${mm ? ` ${mm}분` : ''}`;
  return d === 0 ? `오늘 ${hm}` : d === 1 ? `내일 ${hm}` : `${t.getMonth() + 1}월 ${t.getDate()}일 ${hm}`;
}

// 빠른 선택: 장식마다 고를 수 있는 날 (라벨, 값을 만드는 함수)
const at = (days, h = 23, mi = 59) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, mi, 0, 0); return d.getTime(); };
export const choices = {
  flower: [['오늘', () => at(0, 12)], ['내일', () => at(1, 12)], ['일주일 뒤', () => at(7, 12)]],
  tassel: [], // 체크 (날짜 없음)
  pompom: [
    ['1시간 뒤', () => Date.now() + 3600000],
    ['오늘 저녁', () => (at(0, 19, 0) > Date.now() ? at(0, 19, 0) : at(1, 19, 0))],
    ['내일 아침', () => at(1, 9, 0)],
  ],
};
// 직접 고르기 입력 칸 종류 (꽃·태슬은 날짜, 퐁퐁은 날짜와 시간)
export const pickType = { flower: 'date', tassel: 'date', pompom: 'datetime-local' };
/** 직접 고른 값 → 시각 */
export function fromInput(deco, v) {
  if (!v) return null;
  if (deco === 'pompom') return new Date(v).getTime();
  const [y, mo, d] = v.split('-').map(Number);
  return new Date(y, mo - 1, d, deco === 'tassel' ? 23 : 12, deco === 'tassel' ? 59 : 0).getTime();
}
