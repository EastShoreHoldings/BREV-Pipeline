-- ============================================================================
-- BREV Pipeline — Supabase schema
-- Run this once in Supabase SQL Editor. Idempotent (safe to re-run).
-- ============================================================================

-- 1. Deals table
-- -----------------------------------------------------------------------------
-- Stores every underwritten deal. We use a single `data` JSONB column to hold
-- the full deal object — avoids having to migrate the DB every time we add or
-- rename a field in the underwriting model. The frequently-queried / filtered
-- fields (stage, address, deal_type) are surfaced as generated columns so
-- indexes and queries on them stay fast.

create table if not exists public.deals (
  id               bigint primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  data             jsonb not null default '{}'::jsonb,
  -- Denormalized columns for querying / filtering, auto-derived from data
  address          text generated always as (data->>'address') stored,
  stage            text generated always as (data->>'stage') stored,
  deal_type        text generated always as (data->>'deal_type') stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 2. Indexes
-- -----------------------------------------------------------------------------
create index if not exists deals_user_id_idx     on public.deals (user_id);
create index if not exists deals_updated_at_idx  on public.deals (updated_at desc);
create index if not exists deals_stage_idx       on public.deals (user_id, stage);

-- 3. updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at
  before update on public.deals
  for each row
  execute function public.set_updated_at();

-- 4. Row-Level Security
-- -----------------------------------------------------------------------------
-- Locks each user to their own rows. Service-role bypasses this (backend-only).
alter table public.deals enable row level security;

drop policy if exists "deals_select_own" on public.deals;
drop policy if exists "deals_insert_own" on public.deals;
drop policy if exists "deals_update_own" on public.deals;
drop policy if exists "deals_delete_own" on public.deals;

create policy "deals_select_own"
  on public.deals for select
  using (auth.uid() = user_id);

create policy "deals_insert_own"
  on public.deals for insert
  with check (auth.uid() = user_id);

create policy "deals_update_own"
  on public.deals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "deals_delete_own"
  on public.deals for delete
  using (auth.uid() = user_id);

-- 5. Real-time
-- -----------------------------------------------------------------------------
-- Enables Supabase's WebSocket broadcast so any change propagates to every
-- connected client for the owning user (so phone ↔ desktop sync instantly).
alter publication supabase_realtime add table public.deals;
