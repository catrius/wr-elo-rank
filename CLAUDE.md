# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Go Go Toolkit (GGTK) — a React SPA for managing Elo rankings across competitive matches. Players form teams, play matches, and their Elo ratings update automatically. Built with React 19 + TypeScript + Vite, backed by Supabase (PostgreSQL).

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — TypeScript type-check then Vite production build
- `npm run lint` — ESLint (v9 flat config)
- `npm run preview` — preview production build

Node version: v22.20.0 (see `.nvmrc`). Package manager: npm.

## Architecture

**Single-component app:** Nearly all application logic lives in `src/App.tsx` (~900 lines) — state management, team selection, match workflow, Elo calculation, and UI rendering are all in this one component.

**Data layer:** Supabase JS SDK called directly from the frontend (no API layer). The custom `useSupaQuery` hook (`src/hooks/useSupaQuery.ts`) wraps Supabase queries with loading/error/count state. Supabase credentials come from `VITE_PUBLIC__SUPABASE_URL` and `VITE_PUBLIC__SUPABASE_ANON_KEY` env vars.

**Database models:** Two tables — `players` (id, name, elo, win, total) and `matches` (team_a/b_players as ID arrays, team_a/b_elos, team_a/b_new_elos, result). Auto-generated types in `src/types/database.ts`; aliases exported from `src/types/common.ts`.

**Team suggestion algorithm:** Depth-first search that tries all team splits to minimize Elo differential. Special constraint: player IDs 3 (Khoai) and 7 (Mam) must always be on the same team.

**Match workflow:** Select players → form teams (drag-drop or auto-suggest) → start match (DB row with null result) → mark winner (updates Elos + win/total stats) → optionally revert or cancel.

## Code Style

- Tailwind CSS 4 for styling (inline `className` strings with template literals)
- Path alias: `@/*` maps to `src/*`
- Prettier: semicolons, single quotes, 120-char print width
- ESLint allows nested ternaries and `alert()` calls
- `useCallback` for handlers, `useMemo` for expensive computations

## Feedback

- **Always run `npm run lint` and fix all violations before considering code changes done.** Prettier and ESLint v9 flat config enforce the style rules above — don't rely on eyeballing it.
- **Preserve existing comments during refactors.** When extracting code into new components/files, audit the original for comments and ensure each one lands in the correct destination file. Don't silently drop them.
