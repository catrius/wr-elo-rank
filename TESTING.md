# Manual Testing Guide

This guide covers critical user flows that should be tested after making changes to related code.

## Match Creation & Rematch

**Why this matters:** The Rematch functionality has subtle timing issues with auto-suggest that can easily regress.

**Files involved:**
- `src/hooks/useTeams.ts` (especially `lastMatch` function and auto-suggest effect)
- `src/components/NewMatch.tsx` (Rematch button)
- `src/components/MatchCard.tsx` (Rematch button in history)

**Test steps:**

1. **Setup:** Create a match with specific teams (e.g., Players A+B vs Players C+D)
2. **Complete the match** so it appears in Match History
3. **Clear/change the current teams** (select different players or use Shuffle)
4. **Test NewMatch Rematch button:**
   - Click "Rematch" in the New Match section
   - ✅ Teams should restore to the most recent match
   - ✅ Player order within each team should match the original match
5. **Clear/change teams again**
6. **Test MatchCard Rematch button:**
   - Click "Rematch" on a specific match card in Match History
   - ✅ Teams should restore to that specific match's composition
   - ✅ Player order within each team should match the original match
   - ✅ Teams should NOT auto-shuffle after restoration

**What can go wrong:**
- Teams auto-shuffle immediately after Rematch (skipAutoSuggestRef not working)
- Player order changes to Elo-sorted order (using filter instead of map)
- Only one Rematch button works but not the other (state timing issues)

## Elo Decay

**Files involved:**
- `src/utils/eloDecay.ts`
- `src/components/leaderboard/DecayIndicator.tsx`
- `src/components/Leaderboard.tsx`

**Test steps:**

1. Find a player who hasn't played in 14+ days
2. ✅ Orange "↓" indicator should appear next to their Elo in Season tab
3. ✅ Tooltip should show "Elo decaying · inactive for 2+ weeks (-10 per week)"
4. Complete a match with that player
5. ✅ Decay indicator should disappear immediately

## Player Garden

**Files involved:**
- `src/utils/garden.ts`
- `src/components/PlayerGarden.tsx`
- `src/components/garden/*`

**Test steps:**

1. Visit player pages with various records:
   - High win rate player (sunny weather, healthy tree)
   - Player with 5+ loss streak (ice streak → pests)
   - Player with <45% win rate and 20+ games (low win rate → pests)
   - Decaying player (decay → pests)
2. ✅ Weather should reflect form (sunny/cloudy/rainy/stormy/blizzard)
3. ✅ Tree stage should reflect season wins
4. ✅ Pests should appear when causes are active
5. ✅ Flower beds should thin in bad weather
6. ✅ Admin users should see debug controls

## Weekly Stats

**Files involved:**
- `src/utils/weeklyStats.ts`
- `src/components/WeeklyCard.tsx`
- `src/components/Leaderboard.tsx` (Weekly tab)

**Test steps:**

1. Complete matches within the current calendar week (Mon-Sun)
2. ✅ WeeklyCard should show "This Week" stats
3. ✅ Leaderboard Weekly tab should show Elo Δ for active players
4. ✅ Most Improved / Rough Week should highlight correct players
5. ✅ Chemistry pairs should require 2+ matches together
6. Wait until next Monday
7. ✅ WeeklyCard should show "Last Week" stats

## Authentication & Profile

**Files involved:**
- `src/contexts/AuthContext.tsx`
- `src/pages/UserPage.tsx`
- `src/components/ToolMenu.tsx`

**Test steps:**

1. **Logged out:** Visit /user
   - ✅ Should show login form
   - ✅ Google OAuth should work
   - ✅ Email/password sign-in should work
2. **Logged in, no linked player:** Visit /user
   - ✅ Should show player claim interface
   - ✅ Can search and claim unclaimed players
3. **Logged in, linked player:** Visit /user
   - ✅ Should show profile editor
   - ✅ Avatar upload should work
   - ✅ Name edit should work
   - ✅ "My Stats" link should go to player page
4. **ToolMenu:**
   - ✅ Should show correct profile link
   - ✅ Ingame toggle should persist across sessions
   - ✅ Dark mode toggle should persist across sessions
