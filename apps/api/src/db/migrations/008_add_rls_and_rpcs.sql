-- 008_add_rls_and_rpcs.sql

-- Add unique constraint for user_shows (user_id, show_id) if it doesn't exist
ALTER TABLE user_shows
ADD CONSTRAINT user_shows_user_show_unique
UNIQUE (user_id, show_id);

-- RLS policies for user_shows
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

-- RLS policies for shows to allow FK validation
alter table shows enable row level security;
create policy shows_fk_select
on shows for select
using (true);

-- RPC to add a show to watchlist
create or replace function rpc_add_to_watchlist(p_show_id uuid, p_status text default 'watchlist')
returns json
language plpgsql
security definer
as $$
declare
  v_user uuid := auth.uid();
  v_result json;
begin
  -- Check if user is authenticated
  if v_user is null then
    raise exception 'User not authenticated: auth.uid() returned null';
  end if;
  
  -- Check if show exists
  if not exists (select 1 from shows where id = p_show_id) then
    raise exception 'Show not found: %', p_show_id;
  end if;
  
  -- Insert or update user show
  insert into user_shows(user_id, show_id, status)
  values (v_user, p_show_id, coalesce(p_status, 'watchlist'))
  on conflict (user_id, show_id) do update
    set status = excluded.status
  returning json_build_object('id', id, 'user_id', user_id, 'show_id', show_id, 'status', status) into v_result;
  
  return v_result;
end $$;

revoke all on function rpc_add_to_watchlist(uuid, text) from public;
grant execute on function rpc_add_to_watchlist(uuid, text) to authenticated;

-- RPC to remove a show from watchlist
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

-- RPC to set episode progress
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