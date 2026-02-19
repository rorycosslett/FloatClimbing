# FloatClimbing

React Native/Expo climbing tracker with Supabase backend (PostgreSQL + Auth + Storage + Edge Functions).

## Architecture

- **State**: React Context API — 4 contexts: AuthContext, ClimbContext, SettingsContext, SocialContext
- **Local storage**: AsyncStorage with per-session sharded climb storage (`climbs_s_<sessionId>` keys + `climbSessionIndex`)
- **Backend**: Supabase (PostgreSQL with RLS, Edge Functions in Deno)
- **Auth**: Google/Apple OAuth + guest mode
- **Social**: Follow system, activity feed (cursor-based pagination), user search, profile privacy
- **Integrations**: Strava OAuth

## Completed Scaling Fixes

These were fixed in the 1C/1D/1B batch:

- **1B — AsyncStorage sharding**: Climbs stored per-session instead of single blob. See `storage.ts` sharded functions.
- **1C — Search N+1 elimination**: `searchUsers()` in `socialService.ts` uses 3 batch queries instead of per-result `getProfile()` calls.
- **1D — Context memoization**: All ClimbContext functions wrapped in `useCallback`, provider value in `useMemo`.

## Remaining Scaling Bottlenecks (Deferred)

### Quick wins (low effort)

- **2B — Feed redundant climbs query**: `getFeed()` (`socialService.ts`) fetches all climbs via second query when metadata JSONB already has counts. Remove second climbs query or expand metadata to include grade breakdowns.
- **2C — Image cache-busting**: `?t=${Date.now()}` on every image URL (`socialService.ts` lines ~226, ~266) defeats CDN caching. Use content-hash or versioned paths instead.
- **2D — Profile screen N+1**: Calls `getSessionClimbs()` separately for each of 5 recent sessions (~10 queries per profile view). Batch with `.in('session_id', sessionIds)`.
- **2E — Stale feed metadata**: `activity_feed_items` created with static JSONB snapshot on session end (`ClimbContext.tsx`), never updated when session is edited. Add feed item update in edit session flow.
- **3D — Follower/following list no pagination**: Hardcapped at 50 (`socialService.ts` lines ~371, ~389). Add cursor-based pagination.
- **3E — Missing composite indexes**: No `(user_id, timestamp)` on climbs or `(session_id, timestamp)`. Add via new migration.

### Medium effort

- **1A — Full-fetch sync on login**: `syncService.ts` `syncLocalData()` fetches ALL remote climbs/sessions with no LIMIT, sequential upload loops. Add pagination or incremental approach.
- **2A — RLS per-row subqueries**: Feed/sessions/climbs visibility policies (`003_social_features.sql`) use `EXISTS` subqueries joining follows+profiles per row. Consider materialized views or denormalized access flags.
- **3C — No real-time feed**: `SocialContext.tsx` is pull-based only. Add Supabase Realtime subscriptions.

### High effort (architectural)

- **3A — No incremental sync**: No change tracking or sync cursors. Requires DB migration + service rewrite.
- **3B — No SQLite**: Full AsyncStorage to SQLite migration for indexed local queries.
