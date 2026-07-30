<!-- last-updated: cc24f808b84c8c98943d1d2af2e93fe460368241 -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Go Go Toolkit (GGTK) — a React SPA for managing Elo rankings across competitive matches. Players form teams, play matches, and their Elo ratings update automatically. Built with React 19 + TypeScript + Vite, backed by Supabase (PostgreSQL). Deployed on Vercel.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — TypeScript type-check then Vite production build
- `npm run lint` — ESLint (v9 flat config)
- `npm run preview` — preview production build

Node version: v22.20.0 (see `.nvmrc`). Package manager: npm.

## Architecture

### Data layer

Supabase JS SDK called directly from the frontend (no API layer). Client singleton in `src/lib/supabase.ts`. Credentials from `VITE_PUBLIC__SUPABASE_URL` and `VITE_PUBLIC__SUPABASE_ANON_KEY` env vars. The shared fetch primitive is `useSupaQuery` (used by `useGameData`, `useTeams`, `SeasonPage`); `PlayerPage`, `UserPage`, `WrappedPage`, `EloChart`, `FeedbackBox`, `Pairings`, and `ToolMenu` call `supabase` directly with local `useState`. Avatar uploads POST to the `/api/upload` route (Vercel Blob).

### Database tables

Six tables — auto-generated types in `src/types/database.ts`; aliases (`Player`, `Match`, `Pairing`, `Season`) exported from `src/types/common.ts` (feedback tables have no alias, used via `database.ts` / local interfaces).

- **player**: id, name, avatar, email, ingame, elo, win, total, hidden, is_decaying, created_at
- **match**: id, created_at, result (`'A'|'B'|'Reverted'|'Cancelled'|null`), team_a_players (int[]), team_b_players (int[]), team_a_elos (int[]), team_b_elos (int[]), team_a_new_elos (int[]|null), team_b_new_elos (int[]|null)
- **pairing**: id, created_at, player1 (FK→player, nullable), player2 (FK→player, nullable)
- **season**: id, name, start, end (null = current season), players (Json), created_at
- **feedback**: id, created_at, text, status (string — open/done/joke), player_id (FK→player, nullable), user_id (auth uid, nullable)
- **feedback_vote**: id, created_at, feedback_id (FK→feedback), user_id (auth uid)

### Match workflow

Select players → form teams (drag-drop or auto-suggest) → start match (DB row with null result) → mark winner (updates Elos + win/total stats, clears `is_decaying`) → optionally revert or cancel.

### Elo calculation

Direct Elo math in `src/utils/elo.ts` (no external library). Dynamic K-factor based on games played: K=25 (<10 games), K=20 (10–30 games), K=15 (30+ games). Each player's expected score is calculated against the opposing team's mean Elo. Winner gets result=1, loser gets result=0.

### Elo decay

`src/utils/eloDecay.ts` flags players inactive for 2+ whole weeks (relative to the current Monday) for a -10/week deduction, with a 1-week grace period. The `player.is_decaying` flag drives the Leaderboard `DecayIndicator`; it is cleared when a player next plays a match.

### Team suggestion algorithm

DFS in `src/utils/suggestTeams.ts` — samples up to 10 available players, tries all team splits to minimize Elo differential. Two effective Elo adjustments for balancing only (stored Elo unchanged): (1) players above the group mean get a 25% gap boost, biasing them onto weaker teams; (2) streak form adjustment of +/- 5 Elo per streak game beyond 2 (hot players get harder matchups, cold players get easier ones). Enforces pairing constraints (paired players must stay on same team). If multiple solutions exist within tolerance, picks one randomly for variety.

### Player Garden

`PlayerGarden` (shown on `PlayerPage`) is an animated pixel-art tree + weather scene visualizing a player's form. State is computed by `src/utils/garden.ts` and rendered against constants in `src/constants/garden.ts`; weather overlays live in `src/components/garden/`. Tree stage maps to season wins; weather maps to a composite health score (streak + recent form + win rate); the tree "withers" (dried sprite) on poor records, long ice streaks, or Elo decay.

## Routing (src/main.tsx)

Provider nesting (outer → inner): `BrowserRouter` → `AuthProvider` → `DisplayNameProvider` → (`Routes` + global `ToolMenu`). `ToolMenu` renders alongside `Routes`, so it is visible on every route.

| Route | Component | Description |
|---|---|---|
| `/` | `App` | Main dashboard — leaderboard, match creation, history |
| `/players/:id` | `PlayerPage` | Individual player stats, garden + Elo chart |
| `/season/:id` | `SeasonPage` | Historical season leaderboard + spotlight |
| `/user` | `UserPage` | Auth-gated profile — login/claim player, edit avatar/name |
| `/wrapped/:id` | `WrappedPage` | End-of-season "Wrapped" recap for a player |

## Contexts (src/contexts/)

### AuthContext

`useAuth()`. Provides: `user`, `loading`, `signIn` (Google OAuth → redirects to /user), `signInWithPassword(email, password)`, `signUp(email, password)`, `signOut`, `refreshUser`. Subscribes to Supabase `onAuthStateChange`.

### DisplayNameContext

`useDisplayName()`. Provides: `useIngame` (boolean), `toggleIngame()`, `displayName(player)`. Persisted to localStorage. Returns `player.ingame` when the toggle is on and available, else `player.name`.

### GameDataContext

`useGameDataContext()`. Wraps `useGameData`. Provides: `players`, `allMatches` (current season), `matches` (last 10), `pairings`, `seasons`, `currentSeason`, `streaks`, `refresh()`.

### TeamsContext

`useTeamsContext()`. Wraps `useTeams` (sourcing players/matches/pairings/streaks from GameDataContext). Provides: `teamA`, `teamB`, `availableIds`, `averageTeamAElos`, `averageTeamBElos`, `eloDiff`, `disabledStart`, `disabledSuggest`, drag-drop handlers (`handleDragStart`, `handleDragOverPanel`, `handleDropTo`), `toggleAvailable`, `suggestTeams`, `lastMatch`, `createMatch`.

### MatchActionsContext

`useMatchActionsContext()`. Wraps `useMatchActions` (sourcing players/refresh from GameDataContext). Provides: `endMatch(match, result)`, `revertMatch(match)`, `cancelMatch(match)`.

## Hooks (src/hooks/)

### useSupaQuery\<TData, TError\>

Generic hook wrapping async Supabase queries. Returns `[run, { data, count, error, isLoading, isError, isSuccess }]`.

### useGameData

Fetches players (by elo desc), all matches (by created_at desc), pairings (by created_at asc), seasons (by created_at desc). Derives `currentSeason` (first season with no `end`), filters `allMatches` to current season start, slices `matches` to first 10, computes `streaks` via `computeStreaks()`. Auto-refreshes on mount.

### useTeams(players, matches, pairings, streaks = {})

Manages team formation state. Tracks `teamA`, `teamB`, `availableIds`, `dragging`. Computes average Elos, Elo diff, disabled states. Handles drag-and-drop between teams. `suggestTeams(tolerance=20)` calls `findTeams()` DFS. `createMatch()` inserts match row to Supabase. `lastMatch(match?)` repopulates teams from a previous match. Auto-suggests teams (tolerance=0) when available players change.

### useMatchActions(players, refresh)

- `endMatch(match, result)`: Calculates new Elos via `calculateMatchResult()`, updates match row with result + new_elos, upserts all affected players (clears `is_decaying`).
- `revertMatch(match)`: Confirms via `window.confirm()`, reverses Elo changes via `calculateRevertedPlayers()`, sets result to `'Reverted'`.
- `cancelMatch(match)`: Sets result to `'Cancelled'`, no Elo changes.
- All call `refresh()` afterward.

### useDarkMode

Returns `{ dark, toggleDark }`. Persisted to localStorage key `'theme'`, toggles `'dark'` class on `document.documentElement` (via `useLayoutEffect`).

## Utils (src/utils/)

### elo.ts

- `getKFactor(totalGames)` — Returns dynamic K-factor: 25 (<10 games), 20 (10–30), 15 (30+).
- `calculateMatchResult(match, result, players)` — Computes new Elos for both teams using dynamic K per player. Each player rated against opposing team's mean Elo. Returns `{ teamANewElos, teamBNewElos, updatedAPlayers, updatedBPlayers }`.
- `calculateRevertedPlayers(match, players)` — Reverses a completed match's Elo and win/total changes. Computes delta from stored elos vs new_elos, subtracts from current player state.

### streaks.ts

- `computeStreaks(matches)` — Returns `Record<playerId, Streak>` where `Streak = { type: 'fire' | 'ice', count }`. Only streaks of 3+ (`STREAK_THRESHOLD`) consecutive wins/losses are included. Assumes chronological input.

### suggestTeams.ts

- `findTeams(available, pairings, tolerance, streaks = {})` — DFS algorithm. Samples up to 10 players, applies effective Elo adjustments (25% gap handicap + streak form ±5/game), calculates target Elo sum for Team A (`ceil(n/2)` players), explores all partitions. Enforces pairing constraints (paired players on same team). If solutions exist within tolerance, picks randomly; otherwise returns best match.

### weeklyStats.ts

- `getWeekWindow(matches)` — Finds the Mon–Sun calendar week of the most recent match (matches assumed desc). Returns `{ startTs, endTs, label }` where label is "This Week · MMM D–MMM D" or "Last Week · …". Returns null if no matches.
- `computeWeeklyStats(matches, players, week)` — Per-player stats (`eloDelta`, `wins`, `losses`, `total`) for completed matches within the week window.
- `countWeekMatches(matches, week)` — Count of completed matches in the week window.
- `computeWeeklyChemistry(matches, players, week)` — Best and worst duo by win rate within the week window (MIN_MATCHES = 2). Returns `{ good: WeeklyDuo | null, bad: WeeklyDuo | null }`.

### leaderboardStats.ts

- `INITIAL_ELO` — Baseline Elo (1500) used for Leaderboard grouping/divider bands.
- `buildLast5(matches, players)` — Returns `Map<playerId, ('W' | 'L')[]>` of each player's most-recent-5 W/L results from the given (date-desc) match list.

### eloDecay.ts

- `findDecayPlayers(players, matches, now = new Date())` — Returns `DecayResult[]` (`{ player, weeksInactive, deduction }`) for players inactive 2+ whole weeks (relative to the current Monday), each with a -10 deduction. 1-week grace period; `now` is injectable for testing. Uses dayjs.

### garden.ts

- Types: `GardenStage` (1–8), `WeatherState` (sunny/cloudy/rainy/stormy/blizzard), `WeatherBreakdown`, `GardenState`.
- `isDried(seasonTotal, winRate, streak, isDecaying)` — Withers if (≥20 games and <45% WR), OR ice streak ≥5, OR decaying (`DRIED_MIN_GAMES`, `DRIED_WINRATE_MAX`, `DRIED_ICE_STREAK_MIN`).
- `getGrowthStage(seasonWins)` — Maps season wins to a stage via `STAGE_THRESHOLDS` (calibrated from 2026 season distributions).
- `getWeatherState(streak, recentMatches, playerId, seasonWins, seasonTotal)` — Computes `healthScore = streakScore*0.35 + recentForm*0.40 + winRate*0.25` and buckets it (sunny≥80 / cloudy≥60 / rainy≥40 / stormy≥20 / blizzard). Returns weather + breakdown.
- `computeGardenState(player, matches, playerId)` — Combines the above into `{ stage, weather, breakdown, dried }`.

## Components (src/components/)

### Layout / Generic

- **Section** — Card wrapper with `title`, optional `actions` slot, dark mode support.
- **Pill** — Inline badge/pill (rounded, gray background with ring).
- **Avatar** — Circular avatar image with optional animated streak ring/badge (fire=red, ice=blue, spinning conic gradient + count). Sizes: `'sm'` (h-8) or `'lg'` (h-16). Fallback blob image for null src.
- **Select** — Custom Tailwind dropdown replacing native `<select>` (native selects misposition inside transformed ancestors). Props: `value`, `options[]`, `onChange`, `aria-label?`, `className?`. Click-outside close.
- **BackButton** — Navigational back button. Props: `to`, `className?`. Goes back one step if history exists, else navigates to `to`.
- **SeasonNav** — Tab navigation for seasons. Current season (end=null) links to `/`, past seasons to `/season/:id`. Props: `seasons`, `currentId?`.
- **WeeklyCard** — Compact "This Week" highlights card. Shows Most Improved, Rough Week, Good/Bad Chemistry tiles + a summary row (match/player counts). Props: `weeklyStats`, `weekMatchCount`, `chemistry`, `onViewWeekly`. Internal `EloDelta`, `PlayerTile`, `DuoTile`. Returns null when empty.

### Match Creation

- **AvailablePlayers** — Checkbox grid of all players. Filterable, sorted by display name. Shows Avatar, Elo + streak. Toggles availability via TeamsContext. Uses GameDataContext, TeamsContext, DisplayNameContext.
- **TeamPanel** — Drop zone for one team. Draggable player cards with Avatar + Elo, avg-Elo Pill. Native HTML drag-and-drop. Props: `label`, `team[]`, `averageElo`, drag handlers, `side ('A'|'B')`, `streaks`.
- **NewMatch** — Two TeamPanels side-by-side. Buttons: Shuffle (`suggestTeams(20)`), Best (`suggestTeams(0)`), Rematch (`lastMatch`), Start (`createMatch().then(refresh)`). Elo diff Pill in header. Uses GameDataContext, TeamsContext.

### Match Display

- **MatchCard** — Single match display. Shows teams with Elo changes (green +/red -), timestamp, status pill. Buttons vary by state: in-progress → Cancel + Team A/B wins; completed → Revert + Rematch. Reduced opacity for cancelled/reverted. Props: `match`, `players`, `onEndMatch`, `onRevertMatch`, `onCancelMatch`, `onRematch`. Internal `TeamEloList`.
- **CurrentGame** — Renders the single in-progress match (result === null) as a `MatchCard`; returns null if none. Placed full-width on desktop, above NewMatch on mobile. Uses GameDataContext, TeamsContext, MatchActionsContext.
- **MatchHistory** — Lists all completed matches (non-null result) as MatchCards, with empty state. Uses GameDataContext, TeamsContext, MatchActionsContext.

### Statistics

- **Leaderboard** — Sortable table with Season / Weekly tabs, both rendered by a single shared table. Rank (crown medal for top 3, winged-heart devil emblem for bottom 3 via `RankBadge`) and Player are merged into one sticky-left column. Bottom-3 badges (`bottomRankByPlayerId`, dead-last first) only appear when there are ≥ `BOTTOM_BADGE_MIN_PLAYERS` (8) ranked players and never overlap the top 3; Season ranks bottom by Elo, Weekly by position in the current sort. Columns: Player, Elo, W, L, GP, Win %, Form (Form shown when `matches` provided; Season Form uses all matches, Weekly Form is scoped to the current week via `getWeekWindow`). The tab only swaps the second column — Season shows absolute Elo (with `DecayIndicator`), Weekly shows a colored Elo Δ (`EloDeltaCell`); Weekly is a flat list of players active that week, Season is grouped by baseline/unranked `DividerRow` bands. Independent sort state per tab. Tab state controlled externally via `activeTab`/`onTabChange`. Props: `players`, `streaks`, `matches?`, `linkToPlayer?` (default true), `weeklyStats?`, `weekLabel?`, `activeTab?`, `onTabChange?`. Uses DisplayNameContext.
- **EloChart** — Recharts line chart of player Elo progression. Season filter dropdown (reads `season` table directly). Adaptive vertical date labels when >50 points. Props: `playerId`, `matches`.
- **HeadToHead** — Two player selectors, shows head-to-head win/loss record (only matches where they opposed each other). Internal `PlayerSelect` (wraps `Select`). Uses GameDataContext, DisplayNameContext.
- **PlayerSpotlight** — 2x2 stat grid: On Fire (win streak), On Ice (loss streak), Good Chemistry (best duo, 3+ matches), Bad Chemistry (worst duo, 3+ matches). Local helpers `computeOnFire`, `computeOnIce`, `computeTeamChemistry`, `computeOilAndWater`. Returns null when no data. Uses GameDataContext, DisplayNameContext.
- **SeasonSpotlight** — 4-panel grid for season pages: Good Chemistry (top 5 duos), Bad Chemistry (bottom 5 duos), Rank Improved (top 5 climbers), Rank Dropped (top 5 fallers, vs `prevPlayers`). Props: `players`, `matches`, `prevPlayers`. Internal `DuoList`, `RankList`.
- **Pairings** — CRUD for player pairings. Inline add/edit forms, prevents self-pairing. Writes directly to Supabase `pairing` table (insert/update/delete), refreshes context after each. Internal `PlayerSelect`. Uses GameDataContext, DisplayNameContext.
- **FeedbackBox** — Feature-request/feedback board. Reads/writes `feedback` + `feedback_vote`: insert feedback, toggle vote, edit own text, admin toggles status (open/done/joke). Status filter tabs, rc-pagination (PAGE_SIZE 10), markdown rendering (react-markdown + remark-gfm). Author names respect the ingame toggle via `displayName`. Uses AuthContext, DisplayNameContext, GameDataContext.
- **PlayerGarden** — Animated pixel-art garden visualizing a player's form (tree stage + weather). Computes state via `computeGardenState` (memoized); `ResizeObserver` scales a fixed 480×320 design canvas as one unit; `requestAnimationFrame` tree sway (summed sine waves). Weather → overlay: sunny→`SunRays`, cloudy/stormy→`Clouds` (dark when stormy), rainy→`RainDrops`, stormy→`RainDrops heavy` + `Lightning`, blizzard→`Blizzard`. Info panel + admin-only debug panel (`DebugSelect` overrides). Props: `player`, `matches`, `playerId`, `isAdmin?`.

### Leaderboard sub-components (src/components/leaderboard/)

- **StatRow** — Shared leaderboard row for both tabs; only the second column (`eloCell`) differs. Sticky first column (`RankBadge` + `Avatar` + optional player `Link`), then Elo/W/L/GP/Win% and, when `matches` given, a `Last5` form cell.
- **TableHead** — Sortable header. Non-`name` columns are toggle buttons with a ▲/▼ arrow on the active column (internal `SortIndicator`); `name` sticky and non-sortable. Appends "Form" when `showForm`.
- **DividerRow** — Full-width `<tr>` section-divider label (Season tab bands). Props: `label`, `colSpan`.
- **RankBadge** — Rank display: `—` when null; crown SVG (gold/silver/bronze via `MEDAL_COLORS`) with number overlaid for ranks 1–3; a horned winged-heart emblem (`DevilEmblem`, fixed multicolor artwork, so all bottom ranks share it) with the rank number drawn over the heart when `bottomRank` (1–3, dead-last first) is set; plain number otherwise. Internal `CrownIcon`, `DevilEmblem`.
- **Last5** — Up to 5 small circular W/L badges (green ✓ / red ✕), right-aligned. Props: `results`.
- **DecayIndicator** — Orange "↓" button + tooltip ("Elo decaying · inactive for 2+ weeks (-10 per week)"). Hover or click-toggle.
- **EloDeltaCell** — Signed Elo change: green `+N`, red `N`, gray `±0`. Weekly tab's Elo cell. Props: `delta`.

### Garden overlays (src/components/garden/)

- **SunRays** — Sunny: white-hot sun core, rotating rays, anamorphic flare star, lens-flare ghost chain.
- **Clouds** — Cloudy/stormy: 6 drifting box-shadow clouds. Props: `dark?` (stormy palette). First cloud is deliberately first so `Lightning` can sync to it.
- **RainDrops** — Rainy: falling drops (15 light / 22 heavy). Props: `heavy?`.
- **Lightning** — Stormy: 4 SVG bolts drifting under clouds + ambient sky flash; lead bolt synced to top-left cloud.
- **Blizzard** — Blizzard: 26 wind-driven snowflakes + 6 wind-streak wisps on a shared diagonal.
- **DebugSelect** — Admin debug dropdown (custom `<select>` replacement) with optional up/down steppers. Props: `label`, `value`, `options`, `onChange`, `onStep?`.

### Global UI

- **ToolMenu** — Fixed floating menu (bottom-right, gear icon). Reads current user's `player` record. Options: Profile/Login link (`/user`), My stats link (`/players/:id`), Ingame names toggle, Dark mode toggle. Closes on outside click. Uses AuthContext, DisplayNameContext, useDarkMode.

## Pages (src/pages/)

### PlayerPage (`/players/:id`)

Fetches player by URL param and all matches containing that player. Displays avatar, name, `PlayerGarden`, current season stats (Elo, Wins, Losses, Win Rate), weekly stats (Elo Δ, Wins, Losses, Win Rate — shown only if active this/last week), all-time stats, and EloChart. Determines `isAdmin` from the logged-in user's email (passed to PlayerGarden). Links to `/wrapped/:id`. Uses DisplayNameContext.

### SeasonPage (`/season/:id`)

Fetches season by URL param, a lightweight player list, and matches within the season window. Enriches season player snapshots with live info. Renders season name, SeasonNav, Leaderboard (no player links, empty streaks), and SeasonSpotlight (chemistry + rank changes vs previous season). Local dark mode toggle.

### UserPage (`/user`)

Auth-gated. Logged out: `LoginForm` (username→`@ggtk.org` email, password sign-in/sign-up, and Google OAuth). Logged in without a linked player: search + claim from unclaimed players (email null; shows Elo + W-L). Linked: edit profile (avatar upload via @vercel/blob to `/api/upload`, name field, read-only ingame/email, Save/Logout) plus "My Stats" link to `/players/:id`. Uses AuthContext.

### WrappedPage (`/wrapped/:id`)

End-of-season "Wrapped" recap. Fetches the player, the most-recent completed season (`end` not null), all players, and that player's matches in the season window. Computes record, Elo journey (start/end/peak + date), season rank, best partner, nemesis, most-faced opponent (min 3 games), favorite teammate, busiest day, active days, best/worst week, and longest win/loss streaks. Renders hero + stat cards. Uses DisplayNameContext.

## Key Dependencies

- **react** 19.1, **react-router-dom** 7.14 — UI framework + routing
- **@supabase/supabase-js** 2.76 — Database client
- **es-toolkit** — Utility functions (meanBy, sumBy, orderBy, sampleSize, some, find, zipWith)
- **recharts** 3.8 — Charts (EloChart)
- **dayjs** — Date formatting / week math
- **rc-pagination** — Pagination (FeedbackBox)
- **react-markdown** + **remark-gfm** — Markdown rendering (FeedbackBox)
- **@vercel/blob** — Avatar file uploads
- **tailwindcss** 4.1, **vite** 7.1, **typescript** 5.9 — Build tooling

## Code Style

- Tailwind CSS 4 for styling (inline `className` strings with template literals)
- Path alias: `@/*` maps to `src/*`
- Prettier: semicolons, single quotes, 120-char print width
- ESLint allows nested ternaries and `alert()` calls
- `useCallback` for handlers, `useMemo` for expensive computations

## Feedback

- **Always run `npm run lint` and fix all violations before considering code changes done.** Prettier and ESLint v9 flat config enforce the style rules above — don't rely on eyeballing it.
- **Preserve existing comments during refactors.** When extracting code into new components/files, audit the original for comments and ensure each one lands in the correct destination file. Don't silently drop them.
- **Update CLAUDE.md after significant changes.** When adding/removing files or making large refactors, edit only the affected sections of CLAUDE.md inline — keep it minimal. Don't rewrite the whole file or run the npm scripts (those are for manual use).
- **Commit directly to `main`.** When asked to commit, commit straight onto `main` — do not create a feature branch.
