-- StudyFlow · Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run.

create table if not exists public.orders (
    id            uuid primary key,
    user_id       uuid references auth.users (id) on delete set null,
    email         text not null,
    original_name text not null,
    storage_path  text not null,
    reference     text not null unique,
    amount        integer not null check (amount >= 0),
    plan          text not null default 'legacy'
                  check (plan in ('free', 'premium', 'legacy')),
    status        text not null default 'pending'
                  check (status in ('pending', 'paid', 'processing', 'ready', 'failed')),
    result        jsonb,
    created_at    timestamptz not null default now(),
    paid_at       timestamptz
);

comment on table public.orders is
    'StudyFlow study packs. Written only by the API server with the service role key.';

-- Subscription payments. Each row is one ₦5,000 / 30-day Premium period.
create table if not exists public.subscriptions (
    id            uuid primary key,
    user_id       uuid not null references auth.users (id) on delete cascade,
    email         text not null,
    reference     text not null unique,
    amount        integer not null check (amount > 0),
    status        text not null default 'pending'
                  check (status in ('pending', 'active', 'failed')),
    started_at    timestamptz,
    expires_at    timestamptz,
    created_at    timestamptz not null default now()
);

comment on table public.subscriptions is
    'StudyFlow Premium subscriptions. One row per 30-day period, activated by the API server.';

-- Lock both tables down: no public policies exist, so anon/authenticated keys
-- cannot read or write them. The service role key (server only) bypasses RLS.
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;

-- The API server is the only client: it reads and writes through PostgREST
-- with the service role key. Explicit grants keep this working on projects
-- whose default privileges have been changed.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.subscriptions to service_role;

-- For projects that already ran an earlier version of this file.
alter table public.orders
    add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.orders
    add column if not exists plan text not null default 'legacy';
alter table public.orders
    drop constraint if exists orders_amount_check;
alter table public.orders
    add constraint orders_amount_check check (amount >= 0);
alter table public.orders
    drop constraint if exists orders_plan_check;
alter table public.orders
    add constraint orders_plan_check check (plan in ('free', 'premium', 'legacy'));

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_plan_idx on public.orders (plan);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_expires_at_idx on public.subscriptions (expires_at desc);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- Private bucket for uploaded lecture files. Only the server accesses it.
insert into storage.buckets (id, name, public)
values ('studyflow-uploads', 'studyflow-uploads', false)
on conflict (id) do update set public = false;
