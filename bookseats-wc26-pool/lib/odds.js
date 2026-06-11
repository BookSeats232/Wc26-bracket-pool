// Betting odds snapshot for the 2026 World Cup group stage.
// Source: VegasInsider per-group "odds to win / advance" pages, captured June 11, 2026.
// advance = implied % chance to reach the knockouts; win = implied % to win the group.
// These are a point-in-time reference for fun, not live-updating lines.

export const ODDS_AS_OF = "June 11, 2026";
export const ODDS_SOURCE = "VegasInsider";

export const ODDS = {
  A: { "Mexico": { advance: 86, win: 48 }, "South Korea": { advance: 70, win: 25 }, "Czech Republic": { advance: 49, win: 21 }, "South Africa": { advance: 46, win: 5 } },
  B: { "Canada": { advance: 77, win: 26 }, "Bosnia and Herzegovina": { advance: 58, win: 16 }, "Qatar": { advance: 18, win: 2 }, "Switzerland": { advance: 87, win: 53 } },
  C: { "Brazil": { advance: 94, win: 76 }, "Morocco": { advance: 84, win: 19 }, "Haiti": { advance: 9, win: 0 }, "Scotland": { advance: 75, win: 6 } },
  D: { "United States": { advance: 82, win: 41 }, "Paraguay": { advance: 66, win: 17 }, "Australia": { advance: 40, win: 10 }, "Turkey": { advance: 80, win: 37 } },
  E: { "Germany": { advance: 96, win: 73 }, "Curaçao": { advance: 14, win: 0 }, "Ivory Coast": { advance: 90, win: 10 }, "Ecuador": { advance: 84, win: 21 } },
  F: { "Netherlands": { advance: 86, win: 53 }, "Japan": { advance: 80, win: 27 }, "Sweden": { advance: 71, win: 17 }, "Tunisia": { advance: 48, win: 5 } },
  G: { "Belgium": { advance: 96, win: 69 }, "Egypt": { advance: 77, win: 18 }, "Iran": { advance: 68, win: 9 }, "New Zealand": { advance: 30, win: 4 } },
  H: { "Spain": { advance: 85, win: 79 }, "Cape Verde": { advance: 8, win: 2 }, "Saudi Arabia": { advance: 63, win: 3 }, "Uruguay": { advance: 84, win: 17 } },
  I: { "France": { advance: 88, win: 67 }, "Senegal": { advance: 74, win: 7 }, "Iraq": { advance: 36, win: 0 }, "Norway": { advance: 84, win: 24 } },
  J: { "Argentina": { advance: 98, win: 73 }, "Algeria": { advance: 76, win: 10 }, "Austria": { advance: 92, win: 16 }, "Jordan": { advance: 70, win: 2 } },
  K: { "Portugal": { advance: 96, win: 65 }, "DR Congo": { advance: 28, win: 13 }, "Uzbekistan": { advance: 20, win: 1 }, "Colombia": { advance: 85, win: 25 } },
  L: { "England": { advance: 85, win: 71 }, "Croatia": { advance: 84, win: 20 }, "Ghana": { advance: 46, win: 6 }, "Panama": { advance: 28, win: 4 } }
};

export function teamOdds(group, team) {
  const g = ODDS[group];
  return g && g[team] ? g[team] : null;
}
