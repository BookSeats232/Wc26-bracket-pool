"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase, configured } from "../lib/supabaseClient";
import BracketEditor from "./BracketEditor";
import { score, hasResults, SCORING_RULES } from "../lib/scoring";
import { allGroupsComplete, THIRD_NEEDED, flag } from "../lib/tournament";

const LS = "bookseats_wc26_player";
const LS_DATA = "bookseats_wc26_data";
const EMPTY = { order: {}, thirds: [], ko: {} };
const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || "";

const uuid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now() + "-" + Math.random().toString(16).slice(2);

export default function Pool() {
  const [player, setPlayer] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [brackets, setBrackets] = useState([]);
  const [results, setResults] = useState(null);
  const [myData, setMyData] = useState(EMPTY);
  const [mySubmitted, setMySubmitted] = useState(false);
  const [tab, setTab] = useState("bracket");
  const [toast, setToast] = useState("");
  const [viewing, setViewing] = useState(null);
  const [logoOk, setLogoOk] = useState(true);
  const [live, setLive] = useState(false);
  const [synced, setSynced] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput, setAdminInput] = useState("");

  const serverAdopted = useRef(false);
  const saveTimer = useRef(null);
  const resTimer = useRef(null);
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  // ---- load player + initial data + realtime ----
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS) || "null");
      if (p && p.id) setPlayer(p);
    } catch {}
    try {
      const d = JSON.parse(localStorage.getItem(LS_DATA) || "null");
      if (d) setMyData(d);
    } catch {}

    if (!configured) return;

    let cancelled = false;
    async function fetchAll() {
      const { data: bs, error: be } = await supabase.from("brackets").select("*");
      if (!cancelled && !be && bs) { setBrackets(bs); setSynced(true); }
      const { data: rs } = await supabase.from("results").select("data").eq("id", 1).maybeSingle();
      if (!cancelled && rs) setResults(rs.data || {});
    }
    fetchAll();
    // Poll as a reliable fallback so the leaderboard stays current even when the
    // realtime websocket can't reach SUBSCRIBED (some networks/projects block it).
    const poll = setInterval(fetchAll, 8000);

    // Realtime gives instant updates when it connects; on any change, just re-fetch.
    const ch = supabase
      .channel("wc26-pool")
      .on("postgres_changes", { event: "*", schema: "public", table: "brackets" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, fetchAll)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => { cancelled = true; clearInterval(poll); supabase.removeChannel(ch); };
  }, []);

  // ---- adopt my server row once (handles a fresh device / page reload) ----
  useEffect(() => {
    if (!player || serverAdopted.current || !configured) return;
    const mine = brackets.find((b) => b.player_id === player.id);
    if (mine) {
      serverAdopted.current = true;
      setMyData(mine.data && Object.keys(mine.data).length ? mine.data : EMPTY);
      setMySubmitted(Boolean(mine.submitted));
    }
  }, [player, brackets]);

  // ---- actions ----
  async function join() {
    const name = nameInput.trim();
    if (!name) return;
    const p = { id: uuid(), name, token: uuid() };
    localStorage.setItem(LS, JSON.stringify(p));
    setPlayer(p);
    serverAdopted.current = true;
    if (configured) {
      await supabase.from("players").upsert({ id: p.id, name });
      await supabase.from("brackets").upsert({
        player_id: p.id, name, data: myData, submitted: false, updated_at: new Date().toISOString()
      });
    }
    showToast("You're in. Build your bracket.");
  }

  async function pushBracket(data, submitted) {
    localStorage.setItem(LS_DATA, JSON.stringify(data));
    if (!configured || !player) return;
    await supabase.from("brackets").upsert({
      player_id: player.id, name: player.name, data,
      submitted: submitted, updated_at: new Date().toISOString()
    });
  }

  function handleChange(next) {
    setMyData(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => pushBracket(next, mySubmitted), 650);
  }

  async function submitBracket() {
    setMySubmitted(true);
    await pushBracket(myData, true);
    showToast("Bracket locked in. Good luck.");
    setTab("live");
  }

  async function pushResults(data) {
    if (!configured) { setResults(data); return; }
    setResults(data);
    await supabase.from("results").upsert({ id: 1, data, updated_at: new Date().toISOString() });
  }
  function handleResultsChange(next) {
    clearTimeout(resTimer.current);
    resTimer.current = setTimeout(() => pushResults(next), 500);
    setResults(next);
  }

  // ---- derived ----
  const complete = allGroupsComplete(myData.order) && (myData.thirds || []).length === THIRD_NEEDED;
  const resultsLive = hasResults(results);

  const scored = useMemo(() => {
    // Start from everyone we've received from Supabase...
    const map = new Map();
    brackets.forEach((b) => map.set(b.player_id, b));
    // ...then always overlay the current player's latest local bracket, so it
    // shows on the leaderboard instantly even before (or without) a server sync.
    if (player) {
      map.set(player.id, {
        player_id: player.id, name: player.name,
        data: myData, submitted: mySubmitted, updated_at: new Date().toISOString()
      });
    }
    return [...map.values()]
      .map((b) => ({ ...b, pts: score(b.data, results || {}).total }))
      .sort((a, b) => b.pts - a.pts || (a.name || "").localeCompare(b.name || ""));
  }, [brackets, results, player, myData, mySubmitted]);

  const myRank = player ? scored.findIndex((b) => b.player_id === player.id) + 1 : 0;

  // ---- render ----
  return (
    <>
      <header className="site-head">
        <div className="wrap">
          <div className="head-inner">
            <div className="logo-lockup">
              {logoOk ? (
                <img className="logo-img" src="/logo.png" alt="FIFA × bookseats" onError={() => setLogoOk(false)} />
              ) : (
                <span className="logo-fallback">
                  <span className="logo-trophy">🏆</span>
                  <span className="logo-divider" />
                  <span className="logo-word">bookseats</span>
                </span>
              )}
            </div>
            <div className="head-spacer" />
            <span className={"tag" + ((live || synced) ? " live" : "")}>
              {configured
                ? <>{(live || synced) && <span className="live-dot" />} {(live || synced) ? "Live" : "Connecting…"} · {scored.length} {scored.length === 1 ? "bracket" : "brackets"}</>
                : "Local only · not synced"}
            </span>
          </div>
          <nav className="tabs">
            <button className={"tab" + (tab === "bracket" ? " active" : "")} onClick={() => setTab("bracket")}>My Bracket</button>
            <button className={"tab" + (tab === "live" ? " active" : "")} onClick={() => setTab("live")}>Live &amp; Leaderboard</button>
            <button className={"tab" + (tab === "scoring" ? " active" : "")} onClick={() => setTab("scoring")}>Scoring</button>
            <button className={"tab" + (tab === "admin" ? " active" : "")} onClick={() => setTab("admin")}>Results</button>
          </nav>
        </div>
      </header>

      <main className="wrap">
        {!configured && (
          <div className="notice" style={{ marginTop: 18 }}>
            <b>Heads up:</b> Supabase isn't connected yet, so picks save only to this browser and there's no live sharing.
            Add your <b>NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> (see the README) and redeploy to go live.
          </div>
        )}

        {tab === "bracket" && (
          <BracketTab
            player={player} nameInput={nameInput} setNameInput={setNameInput} join={join}
            myData={myData} handleChange={handleChange} complete={complete}
            mySubmitted={mySubmitted} submitBracket={submitBracket}
          />
        )}

        {tab === "live" && (
          <LiveTab
            scored={scored} results={results} resultsLive={resultsLive}
            player={player} myRank={myRank} setViewing={setViewing} live={live || synced} configured={configured}
          />
        )}

        {tab === "scoring" && <ScoringTab />}

        {tab === "admin" && (
          <AdminTab
            unlocked={adminUnlocked} adminInput={adminInput} setAdminInput={setAdminInput}
            unlock={() => {
              if (ADMIN_CODE && adminInput.trim() === ADMIN_CODE) { setAdminUnlocked(true); showToast("Admin unlocked"); }
              else showToast("That code didn't match");
            }}
            results={results || EMPTY} onResultsChange={handleResultsChange} configured={configured}
          />
        )}
      </main>

      <footer className="site-foot">
        <div className="wrap">
          One Platform. The Entire Fan Experience. When you&apos;re ready to actually be there, book tickets &amp; travel in one place.
          <br />
          <span className="moments">Moments Made.</span>
        </div>
      </footer>

      {viewing && (
        <div className="modal-bg" onClick={() => setViewing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0 }}>{viewing.name}&apos;s Bracket</h2>
              <button className="x" onClick={() => setViewing(null)}>✕</button>
            </div>
            <BracketEditor data={viewing.data || EMPTY} readOnly />
          </div>
        </div>
      )}

      <div className={"toast" + (toast ? " show" : "")}>{toast}</div>
    </>
  );
}

/* ---------------- Bracket tab ---------------- */
function BracketTab({ player, nameInput, setNameInput, join, myData, handleChange, complete, mySubmitted, submitBracket }) {
  if (!player) {
    return (
      <section className="block">
        <div className="hero">
          <p className="positioning">World Cup 2026 · Bracket Pool</p>
          <h1>Call Every Group. Crown Your Champion.</h1>
          <p className="lede">
            48 teams, 12 groups, one trophy. Build your bracket, watch it live against your coworkers,
            and let the leaderboard settle who really knows ball.
          </p>
        </div>
        <div className="card" style={{ maxWidth: 460, marginTop: 22 }}>
          <label className="lbl">Enter your name to join the pool</label>
          <div className="row">
            <input
              className="field" placeholder="e.g. Alan" value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              style={{ flex: 1, minWidth: 200 }}
            />
            <button className="btn btn-primary" onClick={join}>
              Join the Pool <span className="arr">→</span>
            </button>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="block">
      <div className="hero" style={{ paddingBottom: 0 }}>
        <p className="positioning">Playing as {player.name}</p>
        <h1>Your Bracket</h1>
        <p className="lede">Picks save as you go and you&apos;re already on the live leaderboard — no need to lock in to be counted. Lock in just makes it official before the opening whistle on June 11.</p>
      </div>
      <div style={{ height: "var(--s5)" }} />
      <BracketEditor data={myData} onChange={handleChange} />
      <div className="submit-bar">
        <div className="submit-info">
          {complete
            ? <><b>Bracket complete.</b> Lock it in to make it official.</>
            : "Finish all 12 groups and pick your 8 third-place teams to lock in."}
          {mySubmitted && <span className="tag live">Submitted</span>}
        </div>
        <button className="btn btn-primary btn-lg" onClick={submitBracket} disabled={!complete}>
          {mySubmitted ? "Update My Bracket" : "Lock In My Bracket"} <span className="arr">→</span>
        </button>
      </div>
    </section>
  );
}

/* ---------------- Live tab ---------------- */
function LiveTab({ scored, results, resultsLive, player, myRank, setViewing, live, configured }) {
  const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "");
  return (
    <section className="block">
      <div className="hero" style={{ paddingBottom: 0 }}>
        <p className="positioning">{configured ? (live ? "Live · updating in real time" : "Connecting…") : "Local preview"}</p>
        <h1>Leaderboard</h1>
        <p className="lede">
          {resultsLive
            ? "Scored against official results as games finish. Re-ranks the moment anyone's picks or the results change."
            : "No results entered yet — everyone sits at zero. Brackets below update live as coworkers submit."}
        </p>
      </div>

      {scored.length === 0 ? (
        <div className="notice" style={{ marginTop: 18 }}>No brackets yet. Be the first to lock one in.</div>
      ) : (
        <table className="lb">
          <thead>
            <tr><th className="rank">#</th><th>Player</th><th>Champion Pick</th><th className="pts">Points</th></tr>
          </thead>
          <tbody>
            {scored.map((b, i) => {
              const champ = b.data && b.data.ko && b.data.ko["104"];
              const isMe = player && b.player_id === player.id;
              return (
                <tr key={b.player_id} className={isMe ? "me" : ""} onClick={() => setViewing(b)} style={{ cursor: "pointer" }}>
                  <td className="rank">{medal(i) || i + 1}</td>
                  <td>{b.name}{isMe ? " (you)" : ""}{b.submitted ? "" : " ·"}<span style={{ color: "var(--muted)", fontSize: 12 }}>{b.submitted ? "" : " draft"}</span></td>
                  <td>{champ ? <>{flag(champ)} {champ}</> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                  <td className="pts">{b.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="sec-head" style={{ marginTop: 34 }}>
        <span className="sec-num">★</span>
        <h2>Everyone&apos;s Brackets</h2>
        <span className="sub">Tap any card to see their full picks.</span>
      </div>
      <div className="players-grid">
        {scored.map((b) => {
          const champ = b.data && b.data.ko && b.data.ko["104"];
          return (
            <div className="pcard" key={b.player_id} onClick={() => setViewing(b)}>
              <div className="pname">
                <span>{b.name}</span>
                <span className="pts" style={{ fontSize: 16 }}>{b.pts}</span>
              </div>
              <div className="pmeta">{b.submitted ? "Submitted" : "In progress"}</div>
              <div className="pchamp">Champion: {champ ? <>{flag(champ)} {champ}</> : <span style={{ color: "var(--muted)" }}>not picked yet</span>}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Scoring tab ---------------- */
function ScoringTab() {
  return (
    <section className="block">
      <div className="hero" style={{ paddingBottom: 0 }}>
        <p className="positioning">How Points Work</p>
        <h1>Scoring</h1>
        <p className="lede">Points escalate by round, so calling a deep run is worth more than nailing the group stage. Your score updates automatically as official results come in.</p>
      </div>
      <table className="lb" style={{ maxWidth: 560 }}>
        <thead><tr><th>What you got right</th><th className="pts">Points</th></tr></thead>
        <tbody>
          {SCORING_RULES.map(([label, pts]) => (
            <tr key={label}><td>{label}</td><td className="pts">{pts}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="notice" style={{ marginTop: 18, maxWidth: 560 }}>
        Round and champion points are awarded per <b>team</b> you correctly advanced — even if your exact bracket path differed.
        That keeps brackets scorable no matter how the upsets fall.
      </div>
    </section>
  );
}

/* ---------------- Admin tab ---------------- */
function AdminTab({ unlocked, adminInput, setAdminInput, unlock, results, onResultsChange, configured }) {
  if (!unlocked) {
    return (
      <section className="block">
        <div className="hero" style={{ paddingBottom: 0 }}>
          <p className="positioning">Pool Organizer Only</p>
          <h1>Enter Official Results</h1>
          <p className="lede">Unlock with the shared admin code to record real outcomes. As you fill in the actual bracket, everyone&apos;s scores update live.</p>
        </div>
        <div className="card" style={{ maxWidth: 420, marginTop: 20 }}>
          <label className="lbl">Admin code</label>
          <div className="row">
            <input className="field" type="password" value={adminInput} placeholder="Shared admin code"
              onChange={(e) => setAdminInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} style={{ flex: 1, minWidth: 180 }} />
            <button className="btn btn-primary" onClick={unlock}>Unlock <span className="arr">→</span></button>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="block">
      <div className="hero" style={{ paddingBottom: 0 }}>
        <p className="positioning">Official Results · live to everyone</p>
        <h1>The Real Bracket</h1>
        <p className="lede">Fill this in exactly like a bracket as results become official. Set group finishing order, pick the 8 third-place qualifiers, then advance the actual winners. Leave the rest blank until games are played.</p>
      </div>
      {!configured && <div className="notice" style={{ marginTop: 16 }}>Supabase not connected — results stay local only.</div>}
      <BracketEditor data={results} onChange={onResultsChange} />
    </section>
  );
}
