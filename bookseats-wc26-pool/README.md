# BookSeats · World Cup 2026 Bracket Pool

A live, multiplayer bracket pool for the 2026 FIFA World Cup, built for your team. Coworkers join with their name, build a full bracket (all 12 groups → the best third-place teams → the knockout bracket to the Final), and everyone's picks and scores update **in real time**. Styled to the BookSeats brand (Soft Black `#171A1A`, Off White `#FFF6E7`, Night Lights gradient, pill CTAs).

- **Frontend:** Next.js (App Router), deployed on Vercel
- **Backend / real-time:** Supabase (Postgres + Realtime)
- **Scoring:** automatic, escalating by round, re-ranks live as official results are entered

Both Vercel and Supabase have free tiers that comfortably cover a coworker pool.

---

## What you'll set up (about 15 minutes)

1. A **Supabase** project (the shared database) — free
2. A **Vercel** deployment of this app — free
3. Three environment variables connecting them
4. Your logo + an admin code

You'll need free accounts at [supabase.com](https://supabase.com) and [vercel.com](https://vercel.com), and a [github.com](https://github.com) account to host the code.

---

## Step 1 — Create the Supabase database

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name, set a database password (save it somewhere), choose a region near your team, create.
2. Wait ~1 minute for it to provision.
3. In the left sidebar open **SQL Editor** → **New query**.
4. Open the file **`supabase-schema.sql`** from this project, copy all of it, paste into the editor, and click **Run**. This creates the `players`, `brackets`, and `results` tables and turns on real-time.

## Step 2 — Grab your Supabase keys

1. In Supabase, go to **Project Settings** (gear icon) → **API**.
2. Copy two values:
   - **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys → `anon` `public`** → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(The `anon` key is safe to expose in a browser — that's its purpose.)

## Step 3 — Put the code on GitHub

1. Create a new repository on GitHub (e.g. `wc26-bracket-pool`).
2. Upload this entire project folder to it. Easiest no-terminal way: on the new repo page, click **uploading an existing file** and drag in everything **except** `node_modules` (there shouldn't be one). Or, if you use git:
   ```bash
   git init && git add . && git commit -m "BookSeats WC26 pool" && git branch -M main
   git remote add origin https://github.com/YOU/wc26-bracket-pool.git && git push -u origin main
   ```

## Step 4 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → **Import** your GitHub repo.
2. Framework preset auto-detects **Next.js** — leave the defaults.
3. Before deploying, expand **Environment Variables** and add all three:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL from Step 2 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key from Step 2 |
   | `NEXT_PUBLIC_ADMIN_CODE` | any secret phrase you choose (used to unlock the Results tab) |

4. Click **Deploy**. In ~1 minute you'll get a live URL like `https://wc26-bracket-pool.vercel.app`.

> If you ever change an environment variable in Vercel, hit **Redeploy** so the change takes effect.

## Step 5 — Add your logo

1. Put your FIFA × bookseats logo in the **`public/`** folder named exactly **`logo.png`** (transparent PNG, ~600–960px wide is ideal).
2. Commit/upload it and Vercel auto-redeploys. Until then the header shows a clean text fallback, so nothing breaks.

## Step 6 — Share it and run the pool

- Drop the Vercel link in your Slack thread. Everyone clicks, enters their name, builds a bracket, and hits **Lock In My Bracket**.
- Open the **Live & Leaderboard** tab to watch brackets and the ranking update in real time.
- When games finish, the pool organizer opens the **Results** tab, enters the admin code, and fills in the *actual* bracket exactly like a player would (set the real group order, the 8 real third-place qualifiers, and advance the real winners). Scores recalculate and re-rank instantly for everyone.

---

## How scoring works

Points escalate by round, so deep runs matter more than the group stage:

| What you got right | Points |
|---|---|
| Correct group winner (×12 groups) | 2 each |
| Correct group runner-up | 1 each |
| Each team reaching the Round of 32 | 1 each |
| Each team into the Round of 16 | 2 each |
| Each team into the Quarter-finals | 4 each |
| Each team into the Semi-finals | 6 each |
| Each team into the Final | 10 each |
| Correct champion | 20 |

Round/champion points are awarded per **team** you correctly advanced, not per exact match path — so brackets stay scorable no matter how the upsets land. Tweak any value in `lib/scoring.js`.

---

## Run it locally (optional)

```bash
npm install
cp .env.local.example .env.local   # then fill in your three values
npm run dev                          # http://localhost:3000
```

---

## Notes

- **Security model:** this is a lightweight, fun internal pool. It uses Supabase's public anon key from the browser with permissive table policies, the Results tab is gated by a shared code, and each player's edits are tied to a token stored in their browser. That's appropriate for trusted coworkers — it is not hardened against a determined bad actor. For tighter control, add Supabase Auth and stricter row-level policies.
- **Typeface:** the brand face is **Alt Riviera** (proprietary). This build uses a clean system sans as a stand-in. If you have an Alt Riviera web license, add the font files to `public/fonts/`, define an `@font-face` in `app/globals.css`, and set it as the first family on `body`.
- **Betting odds:** each team shows its implied "% to advance" in the group stage, captured from VegasInsider on June 11, 2026 (a fun reference snapshot, not live-updating). Edit values in `lib/odds.js` to refresh them.
- **Tournament data:** groups reflect the official draw of December 5, 2025. The Round-of-32 third-place seeding uses FIFA's allowed-group constraints (always produces a valid bracket); it approximates rather than reproduces FIFA's exact 495-row Annex C lookup — fine for a prediction pool.
- **Real-time not updating?** Make sure you ran the full `supabase-schema.sql` (it includes the `alter publication … add table` lines that enable realtime), and that all three env vars are set in Vercel.

One Platform. The Entire Fan Experience.
**Moments Made.**
