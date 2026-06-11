// 2026 FIFA World Cup — tournament data + bracket resolution.
// Draw of December 5, 2025. 48 teams, 12 groups, Round of 32 -> Final.

export const FLAG = {
  "Mexico":"🇲🇽","South Africa":"🇿🇦","South Korea":"🇰🇷","Czech Republic":"🇨🇿",
  "Canada":"🇨🇦","Bosnia and Herzegovina":"🇧🇦","Qatar":"🇶🇦","Switzerland":"🇨🇭",
  "Brazil":"🇧🇷","Morocco":"🇲🇦","Haiti":"🇭🇹","Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "United States":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺","Turkey":"🇹🇷",
  "Germany":"🇩🇪","Curaçao":"🇨🇼","Ivory Coast":"🇨🇮","Ecuador":"🇪🇨",
  "Netherlands":"🇳🇱","Japan":"🇯🇵","Sweden":"🇸🇪","Tunisia":"🇹🇳",
  "Belgium":"🇧🇪","Egypt":"🇪🇬","Iran":"🇮🇷","New Zealand":"🇳🇿",
  "Spain":"🇪🇸","Cape Verde":"🇨🇻","Saudi Arabia":"🇸🇦","Uruguay":"🇺🇾",
  "France":"🇫🇷","Senegal":"🇸🇳","Iraq":"🇮🇶","Norway":"🇳🇴",
  "Argentina":"🇦🇷","Algeria":"🇩🇿","Austria":"🇦🇹","Jordan":"🇯🇴",
  "Portugal":"🇵🇹","DR Congo":"🇨🇩","Uzbekistan":"🇺🇿","Colombia":"🇨🇴",
  "England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croatia":"🇭🇷","Ghana":"🇬🇭","Panama":"🇵🇦"
};

export const GROUPS = {
  A:["Mexico","South Africa","South Korea","Czech Republic"],
  B:["Canada","Bosnia and Herzegovina","Qatar","Switzerland"],
  C:["Brazil","Morocco","Haiti","Scotland"],
  D:["United States","Paraguay","Australia","Turkey"],
  E:["Germany","Curaçao","Ivory Coast","Ecuador"],
  F:["Netherlands","Japan","Sweden","Tunisia"],
  G:["Belgium","Egypt","Iran","New Zealand"],
  H:["Spain","Cape Verde","Saudi Arabia","Uruguay"],
  I:["France","Senegal","Iraq","Norway"],
  J:["Argentina","Algeria","Austria","Jordan"],
  K:["Portugal","DR Congo","Uzbekistan","Colombia"],
  L:["England","Croatia","Ghana","Panama"]
};
export const GROUP_LETTERS = Object.keys(GROUPS);

// Host group hints (purely cosmetic): Mexico A, Canada B, USA D.
export const HOST = { Mexico:true, Canada:true, "United States":true };

// Round of 32. Each side is a resolver:
//   {w:'A'} winner of A, {r:'B'} runner-up of B, {t:[...allowed groups...]} a best-third slot.
export const R32 = {
  73:[{r:"A"},{r:"B"}],
  74:[{w:"E"},{t:["A","B","C","D","F"]}],
  75:[{w:"F"},{r:"C"}],
  76:[{w:"C"},{r:"F"}],
  77:[{w:"I"},{t:["C","D","F","G","H"]}],
  78:[{r:"E"},{r:"I"}],
  79:[{w:"A"},{t:["C","E","F","H","I"]}],
  80:[{w:"L"},{t:["E","H","I","J","K"]}],
  81:[{w:"D"},{t:["B","E","F","I","J"]}],
  82:[{w:"G"},{t:["A","E","H","I","J"]}],
  83:[{r:"K"},{r:"L"}],
  84:[{w:"H"},{r:"J"}],
  85:[{w:"B"},{t:["E","F","G","I","J"]}],
  86:[{w:"J"},{r:"H"}],
  87:[{w:"K"},{t:["D","E","I","J","L"]}],
  88:[{r:"D"},{r:"G"}]
};
export const R16   = {89:[74,77],90:[73,75],91:[76,78],92:[79,80],93:[83,84],94:[81,82],95:[86,88],96:[85,87]};
export const QF    = {97:[89,90],98:[93,94],99:[91,92],100:[95,96]};
export const SF    = {101:[97,98],102:[99,100]};
export const THIRD = {103:[101,102]};   // third-place playoff: losers of SF
export const FINAL = {104:[101,102]};
export const THIRD_NEEDED = 8;
export const THIRD_SLOTS = [74,77,79,80,81,82,85,87];

export const ROUND_DEFS = [
  { key:"R32",   title:"Round of 32",    matches:R32 },
  { key:"R16",   title:"Round of 16",    matches:R16 },
  { key:"QF",    title:"Quarter-finals", matches:QF  },
  { key:"SF",    title:"Semi-finals",    matches:SF  },
  { key:"FINAL", title:"Final",          matches:FINAL }
];

export function flag(t){ return FLAG[t] || "⚽"; }
export function teamAt(order, g, rank){ const o=(order||{})[g]; return o ? (o[rank-1]||null) : null; }
export function groupComplete(order, g){ return ((order||{})[g]||[]).length === 4; }
export function allGroupsComplete(order){ return GROUP_LETTERS.every(g => groupComplete(order,g)); }

export function thirdPlaceTeams(order){
  const out=[];
  GROUP_LETTERS.forEach(g=>{ const t=teamAt(order,g,3); if(t) out.push({ group:g, team:t }); });
  return out;
}

// Assign chosen third-place groups to the 8 third slots respecting each slot's allowed groups.
// Backtracking guarantees a valid assignment when one exists (it always does for 8-of-12).
export function assignThirds(chosenGroups){
  const chosen = chosenGroups || [];
  const slots = THIRD_SLOTS.map(m => ({ m, allowed: R32[m][1].t }));
  const result = {};
  const used = new Set();
  function bt(i){
    if(i === slots.length) return chosen.every(g => used.has(g));
    const s = slots[i];
    for(const g of chosen){
      if(s.allowed.includes(g) && !used.has(g)){
        result[s.m] = g; used.add(g);
        if(bt(i+1)) return true;
        delete result[s.m]; used.delete(g);
      }
    }
    return false;
  }
  if(chosen.length === THIRD_NEEDED && bt(0)) return result;
  // Fallback: fill in order so the bracket still renders even if incomplete.
  const fb={}; THIRD_SLOTS.forEach((m,i)=>{ if(chosen[i]) fb[m]=chosen[i]; });
  return fb;
}

function sideTeam(side, order, thirdMap, matchNo){
  if(side.w) return teamAt(order, side.w, 1);
  if(side.r) return teamAt(order, side.r, 2);
  if(side.t){ const g = thirdMap[matchNo]; return g ? teamAt(order, g, 3) : null; }
  return null;
}

// Resolve a bracket's participants for every match from its picks.
// data = { order:{A:[t,t,t,t],...}, thirds:[...letters], ko:{ "73":winnerTeam, ... } }
export function resolve(data){
  const order  = data.order  || {};
  const thirds = data.thirds || [];
  const ko     = data.ko     || {};
  const thirdMap = assignThirds(thirds);
  const part = {};

  for(const no in R32){
    part[no] = [ sideTeam(R32[no][0], order, thirdMap, no), sideTeam(R32[no][1], order, thirdMap, no) ];
  }
  const feed = { ...R16, ...QF, ...SF, ...THIRD, ...FINAL };
  const fed = no => R32[no] ? part[no] : [ ko[String(feed[no][0])] || null, ko[String(feed[no][1])] || null ];

  for(const round of [R16, QF, SF, FINAL]){
    for(const no in round) part[no] = fed(no);
  }
  // Third-place playoff participants = the two SF losers.
  const sf1 = part[101] || [null,null], sf2 = part[102] || [null,null];
  const loser = (pair, no) => { const w = ko[String(no)]; if(!w) return null; return pair[0]===w ? pair[1] : (pair[1]===w ? pair[0] : null); };
  part[103] = [ loser(sf1,101), loser(sf2,102) ];

  return { part, thirdMap, ko };
}

// Sets of teams reaching each stage — used for scoring (robust to differing participants).
export function progression(data){
  const { part, ko } = resolve(data);
  const teamsIn = nos => { const s=new Set(); nos.forEach(n=>{ (part[n]||[]).forEach(t=>{ if(t) s.add(t); }); }); return s; };
  const winners = nos => { const s=new Set(); nos.forEach(n=>{ const w=ko[String(n)]; if(w) s.add(w); }); return s; };
  return {
    r32:   teamsIn(Object.keys(R32)),   // 32 teams that reached the knockouts
    r16:   winners(Object.keys(R32)),   // won R32 -> reached Round of 16
    qf:    winners(Object.keys(R16)),
    sf:    winners(Object.keys(QF)),
    fin:   winners(Object.keys(SF)),
    champ: ko["104"] || null
  };
}
