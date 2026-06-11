// Leaderboard scoring. Points escalate by round, so calling deep runs is rewarded.
// Compares a player's bracket against the official results (same data shape).
import { GROUP_LETTERS, progression } from "./tournament";

export const POINTS = {
  groupWinner: 2,   // correct 1st place in a group
  groupRunner: 1,   // correct 2nd place in a group
  qualifyR32:  1,   // each team correctly reaching the Round of 32 (incl. your 3rd-place calls)
  reachR16:    2,   // each team you correctly advanced to the Round of 16
  reachQF:     4,
  reachSF:     6,
  reachFinal: 10,
  champion:   20    // correct champion (on top of reaching the final)
};

export const SCORING_RULES = [
  ["Correct group winner", POINTS.groupWinner],
  ["Correct group runner-up", POINTS.groupRunner],
  ["Each team reaching Round of 32", POINTS.qualifyR32],
  ["Each team into the Round of 16", POINTS.reachR16],
  ["Each team into the Quarter-finals", POINTS.reachQF],
  ["Each team into the Semi-finals", POINTS.reachSF],
  ["Each team into the Final", POINTS.reachFinal],
  ["Correct champion", POINTS.champion]
];

function intersectCount(aSet, bSet){
  let c = 0; aSet.forEach(x => { if(bSet.has(x)) c++; }); return c;
}

// Returns { total, breakdown } for one bracket vs results.
export function score(bracket, results){
  const empty = { total:0, breakdown:{ groups:0, r32:0, r16:0, qf:0, sf:0, fin:0, champ:0 } };
  if(!bracket || !results) return empty;
  const b = bracket, r = results;
  let groups = 0;
  for(const g of GROUP_LETTERS){
    const bo = (b.order && b.order[g]) || [];
    const ro = (r.order && r.order[g]) || [];
    if(ro[0] && bo[0] === ro[0]) groups += POINTS.groupWinner;
    if(ro[1] && bo[1] === ro[1]) groups += POINTS.groupRunner;
  }
  const bp = progression(b), rp = progression(r);
  const r32 = intersectCount(bp.r32, rp.r32) * POINTS.qualifyR32;
  const r16 = intersectCount(bp.r16, rp.r16) * POINTS.reachR16;
  const qf  = intersectCount(bp.qf,  rp.qf)  * POINTS.reachQF;
  const sf  = intersectCount(bp.sf,  rp.sf)  * POINTS.reachSF;
  const fin = intersectCount(bp.fin, rp.fin) * POINTS.reachFinal;
  const champ = (bp.champ && bp.champ === rp.champ) ? POINTS.champion : 0;
  const total = groups + r32 + r16 + qf + sf + fin + champ;
  return { total, breakdown:{ groups, r32, r16, qf, sf, fin, champ } };
}

// Has the organizer entered any results yet?
export function hasResults(results){
  if(!results) return false;
  const hasOrder = results.order && Object.keys(results.order).some(g => (results.order[g]||[]).length);
  const hasKo = results.ko && Object.keys(results.ko).length;
  const hasThirds = results.thirds && results.thirds.length;
  return Boolean(hasOrder || hasKo || hasThirds);
}
