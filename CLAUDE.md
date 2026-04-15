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

Supabase JS SDK called directly from the frontend (no API layer). Client singleton in `src/lib/supabase.ts`. Credentials from `VITE_PUBLIC__SUPABASE_URL` and `VITE_PUBLIC__SUPABASE_ANON_KEY` env vars.

### Database tables

Four tables — auto-generated types in `src/types/database.ts`; aliases (`Player`, `Match`, `Pairing`, `Season`) exported from `src/types/common.ts`.

- **player**: id, name, avatar, email, ingame, elo, win, total, created_at
- **match**: id, created_at, result (`'A'|'B'|'Reverted'|'Cancelled'|null`), team_a_players (int[]), team_b_players (int[]), team_a_elos (int[]), team_b_elos (int[]), team_a_new_elos (int[]), team_b_new_elos (int[])
- **pairing**: id, created_at, player1 (FK→player), player2 (FK→player)
- **season**: id, name, start, end (null = current season), players (Json), created_at

### Match workflow

Select players → form teams (drag-drop or auto-suggest) → start match (DB row with null result) → mark winner (updates Elos + win/total stats) → optionally revert or cancel.

### Elo calculation

Uses `elo-rank` library with K-factor 15 (`src/utils/elo.ts`). Each player's expected score is calculated against the opposing team's mean Elo. Winner gets result=1, loser gets result=0.

### Team suggestion algorithm

DFS in `src/utils/suggestTeams.ts` — samples up to 10 available players, tries all team splits to minimize Elo differential. Enforces pairing constraints (paired players must stay on same team). If multiple solutions exist within tolerance, picks one randomly for variety.

## Routing (src/main.tsx)

Wraps app in `BrowserRouter` with `DisplayNameProvider` and `AuthProvider`. Global `ToolMenu` rendered outside routes.

| Route | Component | Description |
|---|---|---|
| `/` | `App` | Main dashboard — leaderboard, match creation, history |
| `/players/:id` | `PlayerPage` | Individual player stats + Elo chart |
| `/season/:id` | `SeasonPage` | Historical season leaderboard + spotlight |
| `/user` | `UserPage` | Auth-gated profile — claim player, edit avatar/name |

## Contexts (src/contexts/)

### AuthContext

Provides: `user`, `loading`, `signIn` (Google OAuth → redirects to /user), `signOut`, `refreshUser`. Subscribes to Supabase auth state changes.

### DisplayNameContext

Provides: `useIngame` (boolean), `toggleIngame()`, `displayName(player)`. Persisted to localStorage. Toggles between player.name and player.ingame across the app.

### GameDataContext

Wraps `useGameData` hook. Provides: `players`, `allMatches` (current season), `matches` (last 10), `pairings`, `seasons`, `currentSeason`, `streaks`, `refresh()`.

### TeamsContext

Wraps `useTeams` hook. Provides: `teamA`, `teamB`, `availableIds`, `averageTeamAElos`, `averageTeamBElos`, `eloDiff`, `disabledStart`, `disabledSuggest`, drag-drop handlers (`handleDragStart`, `handleDragOverPanel`, `handleDropTo`), `toggleAvailable`, `suggestTeams`, `lastMatch`, `createMatch`.

### MatchActionsContext

Wraps `useMatchActions` hook. Provides: `endMatch(match, result)`, `revertMatch(match)`, `cancelMatch(match)`.

## Hooks (src/hooks/)

### useSupaQuery\<TData, TError\>

Generic hook wrapping async Supabase queries. Returns `[run, { data, count, error, isLoading, isError, isSuccess }]`.

### useGameData

Fetches players (by elo desc), all matches (by created_at desc), pairings (by created_at asc), seasons (by created_at desc). Filters matches to current season date range. Computes streaks via `computeStreaks()`. Auto-refreshes on mount.

### useTeams(players, matches, pairings)

Manages team formation state. Tracks `teamA`, `teamB`, `availableIds`, `dragging`. Computes average Elos, Elo diff, disabled states. Handles drag-and-drop between teams. `suggestTeams(tolerance)` calls `findTeams()` DFS. `createMatch()` inserts match row to Supabase. `lastMatch(match?)` repopulates teams from a previous match. Auto-suggests teams (tolerance=0) when available players change.

### useMatchActions(players, refresh)

- `endMatch(match, result)`: Calculates new Elos via `calculateMatchResult()`, updates match row with result + new_elos, upserts all affected players.
- `revertMatch(match)`: Confirms via `window.confirm()`, reverses Elo changes via `calculateRevertedPlayers()`, sets result to `'Reverted'`.
- `cancelMatch(match)`: Sets result to `'Cancelled'`, no Elo changes.

### useDarkMode

Returns `{ dark, toggleDark }`. Persisted to localStorage key `'theme'`, toggles `'dark'` class on `document.documentElement`.

## Utils (src/utils/)

### elo.ts

- `calculateMatchResult(match, result, players)` — Computes new Elos for both teams using EloRank (K=15). Each player rated against opposing team's mean Elo. Returns `{ teamANewElos, teamBNewElos, updatedAPlayers, updatedBPlayers }`.
- `calculateRevertedPlayers(match, players)` — Reverses a completed match's Elo and win/total changes. Computes delta from stored elos vs new_elos, subtracts from current player state.

### streaks.ts

- `computeStreaks(matches)` — Returns `Record<playerId, Streak>` where `Streak = { type: 'fire' | 'ice', count }`. Only streaks of 3+ consecutive wins/losses are included.

### suggestTeams.ts

- `findTeams(available, pairings, tolerance)` — DFS algorithm. Samples up to 10 players, calculates target Elo sum for Team A, explores all partitions. Enforces pairing constraints (paired players on same team). If solutions exist within tolerance, picks randomly; otherwise returns best match.

## Components (src/components/)

### Layout / Generic

- **Section** — Card wrapper with `title`, optional `actions` slot, dark mode support.
- **Pill** — Inline badge/pill (rounded, gray background with ring).
- **Avatar** — Circular avatar image with optional streak badge (fire=red ring, ice=blue ring + count). Sizes: `'sm'` (h-8) or `'lg'` (h-16). Fallback image for null src.
- **SeasonNav** — Tab navigation for seasons. Current season (end=null) links to `/`, past seasons to `/season/:id`.

### Match Creation

- **AvailablePlayers** — Checkbox list of all players. Filterable, sorted alphabetically by display name. Shows Elo + streak. Uses GameDataContext, TeamsContext, DisplayNameContext.
- **TeamPanel** — Drop zone for one team. Draggable player cards with Avatar + Elo. Props: `label`, `team[]`, `averageElo`, drag handlers, `side ('A'|'B')`, `streaks`.
- **NewMatch** — Two TeamPanels side-by-side. Buttons: Shuffle (tolerance=20), Best (tolerance=0), Rematch, Start. Shows Elo diff pill. Disabled states from TeamsContext.

### Match Display

- **MatchCard** — Single match display. Shows teams with Elo changes (green +/red -), timestamp (DD/MM/YYYY HH:mm), status pill. Buttons: Team A/B wins (if in-progress), Cancel (if in-progress), Revert (if completed), Rematch. Reduced opacity for cancelled/reverted. Internal `TeamEloList` sub-component.
- **MatchHistory** — Lists last 10 matches as MatchCards. Uses GameDataContext, TeamsContext, MatchActionsContext.

### Statistics

- **Leaderboard** — Sortable table: Rank, Player, Elo, Wins, Losses, Total, Win Rate. Clickable headers toggle sort direction. Links to `/players/:id` (optional via `linkToPlayer` prop). Shows streak indicators.
- **EloChart** — Recharts line chart of player Elo progression. Season filter dropdown. Props: `playerId`, `matches`.
- **HeadToHead** — Two player selectors, shows head-to-head win/loss record (only matches where they opposed each other). Internal `PlayerSelect` sub-component.
- **PlayerSpotlight** — 2x2 stat grid: On Fire (win streak 2+), On Ice (loss streak 2+), Good Chemistry (best duo, 3+ matches), Bad Chemistry (worst duo, 3+ matches). Uses GameDataContext, DisplayNameContext.
- **SeasonSpotlight** — 2x2 grid for season pages: Good Chemistry (top 5 duos), Bad Chemistry (bottom 5 duos), Rank Improved (top 5 climbers), Rank Dropped (top 5 fallers). Props: `players`, `matches`, `prevPlayers`. Internal `DuoList`, `RankList` sub-components.
- **Pairings** — CRUD for player pairings. Inline add/edit forms, prevents self-pairing. Writes directly to Supabase `pairing` table. Internal `PlayerSelect` sub-component.

### Global UI

- **ToolMenu** — Fixed floating menu (bottom-right, gear icon). Options: Profile/Login link, Ingame names toggle, Dark mode toggle. Closes on outside click. Fetches current user's player record.
- **IngameToggle** — Fixed floating button (bottom-right, gamepad icon) to toggle ingame name display. Uses DisplayNameContext.

## Pages (src/pages/)

### PlayerPage (`/players/:id`)

Fetches player by URL param. Displays avatar, name, current season stats (Elo, Wins, Losses, Win Rate), all-time stats, and EloChart. Uses DisplayNameContext.

### SeasonPage (`/season/:id`)

Fetches season by URL param. Displays season name, SeasonNav, Leaderboard of season players, and SeasonSpotlight (chemistry + rank changes vs previous season). Local dark mode toggle.

### UserPage (`/user`)

Auth-gated. If claimed player: edit profile (avatar upload via @vercel/blob, name field, email display, save/logout). If no claimed player: search and claim from unclaimed players list (shows Elo + W-L). Uses AuthContext.

## Key Dependencies

- **react** 19.1, **react-router-dom** 7.14 — UI framework + routing
- **@supabase/supabase-js** 2.76 — Database client
- **elo-rank** 1.0 — Elo rating calculation (K=15)
- **es-toolkit** — Utility functions (meanBy, sumBy, orderBy, sampleSize, some, find, zipWith)
- **recharts** 3.8 — Charts (EloChart)
- **dayjs** — Date formatting
- **rc-pagination** — Pagination component
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
