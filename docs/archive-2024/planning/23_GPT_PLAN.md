# watchlist: current fix is **not** correct

**tl;dr**

- Forcing `serviceSupabase` everywhere “works” but it’s a band‑aid. It’s only acceptable short term **and only** on server‑side code with the service key kept secret.
- The right fix is to make RLS allow the operations you need (or route writes through a security‑definer RPC). Then revert UI flows to the regular authed client.
- Rotate the service key if it was ever logged or exposed during debugging.

---

## what happened

- Tests used the admin client (`serviceSupabase`) for all ops → inserts passed.
- UI mixed clients → RLS context changed mid‑flow and FK checks failed (`PGRST301`).
- You switched the constructor to always use `serviceSupabase` → 400s became 201s. Symptom gone, root cause not addressed.

## why the band‑aid isn’t good enough

- If any code path runs in the browser, the service key is a critical leak.
- You bypass RLS guarantees and can accidentally write rows for the wrong user if you trust request bodies.
- You still have logical inconsistencies because reads and writes aren’t aligned with the same auth context and filters.

---

## better long‑term solutions

### option A — fix RLS and keep the regular client in the UI (recommended)

RLS rules that usually cover this setup:

```sql
-- user_shows
alter table user_shows enable row level security;

create policy user_shows_select_own
on user_shows for select
using (user_id = auth.uid());

create policy user_shows_insert_own
on user_shows for insert
with check (user_id = auth.uid());

create policy user_shows_delete_own
on user_shows for delete
using (user_id = auth.uid());
```

Ensure FK target tables are **selectable** under the same context so FK validation can run:

```sql
-- shows (tighten this as required by tenancy)
alter table shows enable row level security;
create policy shows_fk_select
on shows for select
using (true);
```

If you’re multi‑tenant, scope `shows` visibility accordingly instead of `true`.

### option B — keep strict RLS and expose a security‑definer RPC for writes

Use the normal authed client everywhere; the RPC runs with elevated rights but derives the user from the JWT.

```sql
create or replace function rpc_add_to_watchlist(p_show_id uuid, p_status text default 'watchlist')
returns void
language plpgsql
security definer
as $$
declare
  v_user uuid := auth.uid();
begin
  insert into user_shows(user_id, show_id, status)
  values (v_user, p_show_id, coalesce(p_status, 'watchlist'))
  on conflict (user_id, show_id) do update
    set status = excluded.status;
end $$;

revoke all on function rpc_add_to_watchlist(uuid, text) from public;
grant execute on function rpc_add_to_watchlist(uuid, text) to authenticated;
```

```sql
create or replace function rpc_remove_from_watchlist(p_show_id uuid)
returns void
language sql
security definer
as $$
  delete from user_shows
  where user_id = auth.uid() and show_id = p_show_id;
$$;

revoke all on function rpc_remove_from_watchlist(uuid) from public;
grant execute on function rpc_remove_from_watchlist(uuid) to authenticated;
```

```sql
create or replace function rpc_set_episode_progress(
  p_show_id uuid,
  p_episode_id uuid,
  p_state text,
  p_progress int
) returns void
language sql
security definer
as $$
  insert into user_episode_progress(user_id, show_id, episode_id, state, progress)
  values (auth.uid(), p_show_id, p_episode_id, p_state, p_progress)
  on conflict (user_id, show_id, episode_id)
  do update set state = excluded.state, progress = excluded.progress;
$$;

revoke all on function rpc_set_episode_progress(uuid, uuid, text, int) from public;
grant execute on function rpc_set_episode_progress(uuid, uuid, text, int) to authenticated;
```

Client usage stays simple:

```ts
await supabase.rpc('rpc_add_to_watchlist', { p_show_id: showId });
await supabase.rpc('rpc_remove_from_watchlist', { p_show_id: showId });
await supabase.rpc('rpc_set_episode_progress', {
  p_show_id: showId,
  p_episode_id: epId,
  p_state: 'watched',
  p_progress: 100,
});
```

---

## the new errors you’re seeing and likely causes

### 1) remove from watchlist

```
Failed to remove <title>: Show not found in watchlist
```

**Likely causes**

- Row exists in `user_shows` but with a different `status` than your deletion filter expects (e.g. created as `watching`, trying to delete only `status = 'watchlist'`).
- Mismatched identifiers: UI passes a TMDB/slug/id that doesn’t equal `shows.id` the backend expects.
- Mixed clients: the row was inserted with admin context but the list/remove path queries with the user client and RLS hides the row.

**Fix**

- Use a **single canonical key** end‑to‑end: `show_id` equals `shows.id` (uuid). Map external ids on the server only.
- Make delete target the composite key, not human title:

  ```sql
  delete from user_shows where user_id = auth.uid() and show_id = $1;
  ```

- Standardise `status` values and enforce with a CHECK or enum. If the UI doesn’t care about status for delete, drop the status predicate.

### 2) set episode progress: `NOT_FOUND`

```
Failed to set progress for <title>: NOT_FOUND
```

**Likely causes**

- Progress table expects a parent `user_shows` row; it’s missing or not visible under the current auth context.
- Upsert targets the wrong key (e.g. searching by title, or by external episode id not stored in `episodes.id`).

**Fix**

- Make the progress write an **upsert** on `(user_id, show_id, episode_id)` (see `rpc_set_episode_progress` above).
- Before writing progress, ensure `user_shows` exists or create it idempotently.

### 3) ui shows counts but empty list

- Dashboard displays counts (e.g. Total 2, Watching 2) but the list is empty.

**Likely causes**

- Counts are computed via a different endpoint/client (admin) than the list (user client), so RLS hides rows in the list.
- Filters differ (status/state/country). The list is scoped to `status='watchlist'` while the count aggregates any status.

**Fix**

- Ensure list and counters call the same backend and predicates.
- Log the exact SQL (or Supabase query params) for both endpoints and diff them.

---

## immediate audit to align reads/writes

Run these queries for the user you’re testing with:

```sql
select * from user_shows where user_id = $USER order by created_at desc;
select show_id, status, count(*) from user_shows where user_id = $USER group by 1,2;

-- verify the show id used by the UI
select id, title from shows where title ilike 'Dexter: Resurrection%';

-- if you have an episodes table, confirm ids match what the UI sends
select id, show_id, season, episode from episodes where show_id = $SHOW limit 5;
```

Check that:

- `show_id` you send from the UI equals `shows.id`.
- `status` matches what your delete/list filters use.
- The same client/auth context is used across add/remove/list/progress.

---

## recommended rollout plan

1. Implement RLS policies (Option A) **or** RPCs (Option B). Keep admin usage server‑only.
2. Standardise ids and status enums. Add DB constraints to prevent drift.
3. Align UI and API filters. Stop using titles in mutating calls.
4. Backfill and clean existing rows:

   ```sql
   -- example cleanups
   update user_shows set status = 'watchlist' where status is null;
   delete from user_shows where show_id not in (select id from shows);
   ```

5. Rotate the service key if it appeared in logs during the band‑aid period.

---

## verification checklist

- [ ] Add `user_shows` select/insert/delete policies (or RPCs) and deploy.
- [ ] Both counters and list return the **same** rows for a test user.
- [ ] Add/remove cycle: add → appears in list → remove → row gone; no RLS errors.
- [ ] Episode progress upserts correctly for the same show/episode id.
- [ ] No admin client usage in browser bundles (check build output).

---

### final verdict

Your current solution removes the symptom but not the cause. Treat it as temporary, server‑only. Ship RLS or RPCs, align ids and predicates, and the “not found” class of errors will disappear with the same change.
