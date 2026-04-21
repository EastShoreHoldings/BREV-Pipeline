-- ============================================================================
-- Migration 02 — Shared workspace model
-- ----------------------------------------------------------------------------
-- Before: each Supabase user had their own private pipeline (deals.user_id).
-- After:  one shared workspace ("Bayou Real Estate Ventures"). Every existing
--         user becomes a member; every existing deal belongs to that workspace.
--         New signups auto-join workspace 1 via a trigger.
--
-- Run this once in Supabase SQL Editor. Idempotent — safe to re-run.
-- ============================================================================

-- 1. Workspaces table
create table if not exists public.workspaces (
  id          bigint generated always as identity primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- 2. Membership table — joins users to workspaces
create table if not exists public.workspace_members (
  workspace_id  bigint not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member',           -- 'owner' | 'member'
  added_at      timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

-- 3. Add workspace_id column to deals
alter table public.deals add column if not exists workspace_id bigint references public.workspaces(id);

-- 4. Create the single BREV workspace (only if it doesn't exist).
--    OVERRIDING SYSTEM VALUE is required because the id column is
--    `generated always as identity`, which normally rejects explicit values.
insert into public.workspaces (id, name)
  overriding system value
  values (1, 'Bayou Real Estate Ventures')
  on conflict (id) do nothing;

-- Reset the identity sequence so future inserts still increment correctly.
select setval(pg_get_serial_sequence('public.workspaces', 'id'),
              greatest((select max(id) from public.workspaces), 1));

-- 5. Backfill: every existing auth user becomes a member of workspace 1.
--    This pulls in Jon, Boris, and anyone else who already has an account.
insert into public.workspace_members (workspace_id, user_id, role)
  select 1, id,
    case when row_number() over (order by created_at) = 1 then 'owner' else 'member' end
  from auth.users
  on conflict (workspace_id, user_id) do nothing;

-- 6. Backfill: every existing deal belongs to workspace 1.
--    Without this, Jon's deals would still be filtered out by the new RLS.
update public.deals set workspace_id = 1 where workspace_id is null;
alter table public.deals alter column workspace_id set not null;

-- 7. Auto-join trigger — new signups instantly become members of workspace 1.
--    Combined with Supabase's "disable open signups" setting, this lets you
--    control who joins by simply enabling/disabling email signups in Auth.
create or replace function public.handle_new_user_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
    values (1, new.id, 'member')
    on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user_workspace();

-- 8. Replace per-user RLS with per-workspace RLS
alter table public.deals enable row level security;

drop policy if exists "deals_select_own"  on public.deals;
drop policy if exists "deals_insert_own"  on public.deals;
drop policy if exists "deals_update_own"  on public.deals;
drop policy if exists "deals_delete_own"  on public.deals;

drop policy if exists "deals_select_workspace"  on public.deals;
drop policy if exists "deals_insert_workspace"  on public.deals;
drop policy if exists "deals_update_workspace"  on public.deals;
drop policy if exists "deals_delete_workspace"  on public.deals;

create policy "deals_select_workspace" on public.deals for select
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "deals_insert_workspace" on public.deals for insert
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "deals_update_workspace" on public.deals for update
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "deals_delete_workspace" on public.deals for delete
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

-- 9. Membership table RLS — users can see their own memberships only
alter table public.workspace_members enable row level security;
drop policy if exists "wm_select_own" on public.workspace_members;
create policy "wm_select_own" on public.workspace_members for select
  using (user_id = auth.uid());
