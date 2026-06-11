"use client";
import React, { useMemo } from "react";
import {
  GROUPS, GROUP_LETTERS, HOST, R32, R16, QF, SF, FINAL, THIRD_NEEDED,
  flag, teamAt, resolve
} from "../lib/tournament";
import { teamOdds, ODDS_SOURCE, ODDS_AS_OF } from "../lib/odds";

// Controlled component. data = {order,thirds,ko}. onChange(next) for edits.
// readOnly renders the same bracket without interaction (used to view others' picks).
export default function BracketEditor({ data, onChange, readOnly = false }) {
  const order = data.order || {};
  const thirds = data.thirds || [];
  const ko = data.ko || {};

  const { part } = useMemo(() => resolve(data), [data]);

  function commit(next) {
    if (readOnly || !onChange) return;
    onChange(sanitize(next));
  }

  function sanitize(next) {
    const nOrder = next.order || {};
    // keep only chosen thirds whose group still has a 3rd-place team
    const nThirds = (next.thirds || []).filter((g) => (nOrder[g] || [])[2]);
    const tmp = { order: nOrder, thirds: nThirds, ko: next.ko || {} };
    const { part: p } = resolve(tmp);
    const nKo = {};
    Object.keys(tmp.ko).forEach((no) => {
      const pr = p[no];
      if (pr && (pr[0] === tmp.ko[no] || pr[1] === tmp.ko[no])) nKo[no] = tmp.ko[no];
    });
    return { order: nOrder, thirds: nThirds, ko: nKo };
  }

  function toggleTeam(g, team) {
    const o = order[g] ? [...order[g]] : [];
    const i = o.indexOf(team);
    if (i >= 0) {
      o.splice(i, 1);
    } else if (o.length < 4) {
      o.push(team);
      // Auto-fill 4th place once the 3rd is chosen — only one team can remain.
      if (o.length === 3) {
        const last = GROUPS[g].find((t) => !o.includes(t));
        if (last) o.push(last);
      }
    }
    commit({ ...data, order: { ...order, [g]: o } });
  }
  function clearGroup(g) {
    const nOrder = { ...order };
    delete nOrder[g];
    commit({ ...data, order: nOrder });
  }
  function toggleThird(g) {
    const i = thirds.indexOf(g);
    let nThirds;
    if (i >= 0) nThirds = thirds.filter((x) => x !== g);
    else {
      if (thirds.length >= THIRD_NEEDED) return;
      nThirds = [...thirds, g];
    }
    commit({ ...data, thirds: nThirds });
  }
  function pickWinner(no, team) {
    commit({ ...data, ko: { ...ko, [String(no)]: team } });
  }

  const rankOf = (g, t) => {
    const o = order[g] || [];
    const i = o.indexOf(t);
    return i < 0 ? 0 : i + 1;
  };

  return (
    <div>
      {/* GROUPS */}
      <div className="sec-head">
        <span className="sec-num">1</span>
        <h2>Group Stage</h2>
        <span className="sub">
          {readOnly ? "Predicted finishing order — top two advance, plus the best thirds."
            : "Click teams in order of finish — pick 1st, 2nd, 3rd and the 4th fills in. Top two advance automatically."}
          {" "}% = implied chance to advance ({ODDS_SOURCE}, {ODDS_AS_OF}).
        </span>
      </div>
      <div className="groups">
        {GROUP_LETTERS.map((g) => (
          <div className="group" key={g}>
            <h3>
              <span>Group {g}</span>
              {!readOnly && (order[g] || []).length > 0 && (
                <button className="mini" onClick={() => clearGroup(g)}>clear</button>
              )}
            </h3>
            <p className="hint">
              <span>{readOnly ? "Their call" : "Click in order of finish"}</span>
              <span>% to advance</span>
            </p>
            {GROUPS[g].map((team) => {
              const r = rankOf(g, team);
              const o = teamOdds(g, team);
              return (
                <div
                  className="team"
                  key={team}
                  data-rank={r || undefined}
                  onClick={() => !readOnly && toggleTeam(g, team)}
                  style={readOnly ? { cursor: "default" } : undefined}
                >
                  <span className="rk">{r || "·"}</span>
                  <span className="flag">{flag(team)}</span>
                  <span className="nm">{team}{HOST[team] ? "  ·  host" : ""}</span>
                  {o && <span className="odds" title="Implied chance to advance to the knockouts">{o.advance}%</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* THIRDS */}
      <div className="sec-head" style={{ marginTop: 34 }}>
        <span className="sec-num">2</span>
        <h2>The Third-Place Race</h2>
        <span className="sub">8 of 12 third-placed teams reach the Round of 32.</span>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        Selected:&nbsp;
        <span className="counter" style={{ color: thirds.length === THIRD_NEEDED ? "var(--off-white)" : "var(--muted)" }}>
          {thirds.length} / {THIRD_NEEDED}
        </span>
      </div>
      <div className="thirds">
        {GROUP_LETTERS.map((g) => {
          const team = teamAt(order, g, 3);
          const on = thirds.includes(g);
          return (
            <div
              className={"third" + (!team ? " empty" : "") + (on ? " on" : "")}
              key={g}
              onClick={() => team && !readOnly && toggleThird(g)}
              style={readOnly ? { cursor: "default" } : undefined}
            >
              <span className="ck" />
              <span className="gl">3rd · {g}</span>
              <span className="flag">{team ? flag(team) : "⚪"}</span>
              <span className="nm">{team || "set Group " + g}</span>
              {team && teamOdds(g, team) && <span className="odds">{teamOdds(g, team).advance}%</span>}
            </div>
          );
        })}
      </div>

      {/* BRACKET */}
      <div className="sec-head" style={{ marginTop: 34 }}>
        <span className="sec-num">3</span>
        <h2>Knockout Bracket</h2>
        <span className="sub">{readOnly ? "Round of 32 to the Final." : "Click a team to send it through."}</span>
      </div>
      <div className="bracket-scroll">
        <div className="bracket">
          <RoundCol title="Round of 32" matches={R32} part={part} ko={ko} pickWinner={pickWinner} readOnly={readOnly} />
          <RoundCol title="Round of 16" matches={R16} part={part} ko={ko} pickWinner={pickWinner} readOnly={readOnly} />
          <RoundCol title="Quarter-finals" matches={QF} part={part} ko={ko} pickWinner={pickWinner} readOnly={readOnly} />
          <RoundCol title="Semi-finals" matches={SF} part={part} ko={ko} pickWinner={pickWinner} readOnly={readOnly} />
          <div className="round r-final">
            <h4>Final</h4>
            <Tie no={104} part={part} ko={ko} pickWinner={pickWinner} readOnly={readOnly} />
            <h4 style={{ marginTop: 18 }}>Third Place</h4>
            <Tie no={103} part={part} ko={ko} pickWinner={pickWinner} readOnly={readOnly} />
          </div>
        </div>
      </div>

      <Champion ko={ko} />
    </div>
  );
}

function RoundCol({ title, matches, part, ko, pickWinner, readOnly }) {
  return (
    <div className="round">
      <h4>{title}</h4>
      {Object.keys(matches).map((no) => (
        <Tie key={no} no={+no} part={part} ko={ko} pickWinner={pickWinner} readOnly={readOnly} />
      ))}
    </div>
  );
}

function Tie({ no, part, ko, pickWinner, readOnly }) {
  const pr = part[no] || [null, null];
  const clickable = !readOnly && pr[0] && pr[1];
  return (
    <div className="tie">
      <Slot no={no} team={pr[0]} ko={ko} clickable={clickable} pickWinner={pickWinner} />
      <Slot no={no} team={pr[1]} ko={ko} clickable={clickable} pickWinner={pickWinner} />
      <div className="mno">Match {no}</div>
    </div>
  );
}

function Slot({ no, team, ko, clickable, pickWinner }) {
  if (!team) return <div className="slot tbd"><span className="nm">TBD</span></div>;
  const win = ko[String(no)] === team;
  return (
    <div
      className={"slot" + (win ? " win" : "")}
      onClick={() => clickable && pickWinner(no, team)}
      style={clickable ? undefined : { cursor: "default" }}
    >
      <span className="flag">{flag(team)}</span>
      <span className="nm">{team}</span>
    </div>
  );
}

function Champion({ ko }) {
  const champ = ko["104"];
  return (
    <div className="champ">
      <div className="lbl">2026 World Cup Champion</div>
      {champ
        ? <div className="who">{flag(champ)} {champ}</div>
        : <div className="who tbd">Finish the bracket to crown a winner</div>}
    </div>
  );
}
