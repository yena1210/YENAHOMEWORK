// 저장: 조각과 작은 실뭉치를 localStorage에 둔다. 다시 열면 그대로 (닫아 둔 시간만큼 눈이 쌓인 채로).
// 저장이 막혀 있어도(사생활 보호 창 등) 화면은 그대로 돈다.
import { config } from './config.js';

export function makeStorage(world) {
  const S = config.save;
  let last = '';

  function read() {
    try { return JSON.parse(localStorage.getItem(S.key) || 'null'); } catch (e) { return null; }
  }
  function snapshot() {
    // 나무가 다르면(시드, 모양) 슬롯 번호가 달라진다 → 같이 적어 둔다
    return { v: 2, tree: `${config.tree.pick}/${config.tree.twig}/${config.seed}/${config.trees.seedStep}/${config.slots.max}/${config.slots.sep}`, trees: world.trees.map((t) => t.memos.dump()), active: world.active, balls: world.balls.dump() };
  }
  function save() {
    const snap = snapshot();
    const body = JSON.stringify(snap);
    if (body === last) return; // 바뀐 게 없다
    last = body;
    try { localStorage.setItem(S.key, JSON.stringify({ ...snap, at: Date.now() })); } catch (e) { /* 저장 못 해도 괜찮다 */ }
  }

  /** 처음 열 때: 저장해 둔 것을 놓는다 */
  function load() {
    const d = read();
    if (!d || (d.v !== 1 && d.v !== 2)) return;
    const away = Math.max(0, (Date.now() - (d.at || Date.now())) / 1000);
    const trees = d.trees || [d.memos || []]; // v1 은 나무 한 그루
    // 나무가 바뀌었으면 슬롯 번호는 무시하고 빈 자리부터 채운다
    const same = d.tree === (d.v === 1 ? `${config.tree.pick}/${config.tree.twig}/${config.seed}` : snapshot().tree);
    const left = [];
    trees.forEach((list, i) => {
      if (!list.length && i > 0) return;
      while (world.trees.length <= i) world.addTree();
      left.push(...world.trees[i].memos.load(same ? list : list.map((m) => ({ ...m, slot: -1 })), away));
    });
    if (d.active > 0 && world.trees[d.active]) world.go(d.active); // 마지막에 보던 나무 (넘기는 모습으로)
    // 자리가 모자라 못 짠 조각은 다음 나무에 (자리 규칙이 바뀌어 한 그루에 덜 들어갈 때)
    let rest = left;
    while (rest.length && world.trees.length < config.trees.max) {
      const t = world.addTree();
      rest = t.memos.load(rest.map((m) => ({ ...m, slot: -1 })), away);
    }
    world.balls.load([...(d.balls || []), ...rest.map((m) => ({ ...m, x: 0.9 + Math.random() * 0.6, z: 1 }))], away);
    last = JSON.stringify(snapshot());
  }

  load();
  setInterval(save, S.every * 1000);
  // 닫거나 다른 앱으로 갈 때 바로 저장
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  return { save, load, clear() { try { localStorage.removeItem(S.key); } catch (e) { /* 무시 */ } } };
}
