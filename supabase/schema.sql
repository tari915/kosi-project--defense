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
    amount        integer not null check (amount > 0),
    status        text not null default 'pending'
                  check (status in ('pending', 'paid', 'processing', 'ready', 'failed')),
    result        jsonb,
    created_at    timestamptz not null default now(),
    paid_at       timestamptz
);

comment on table public.orders is
    'StudyFlow orders. Written only by the API server with the service role key.';

-- Lock the table down: no public policies exist, so anon/authenticated keys
-- cannot read or write orders. The service role key (server only) bypasses RLS.
alter table public.orders enable row level security;

-- The API server is the only client: it reads and writes through PostgREST
-- with the service role key. Explicit grants keep this working on projects
-- whose default privileges have been changed.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.orders to service_role;

-- For projects that already ran the earlier version of this file.
alter table public.orders
    add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_user_id_idx on public.orders (user_id);

-- Private bucket for uploaded lecture files. Only the server accesses it.
insert into storage.buckets (id, name, public)
values ('studyflow-uploads', 'studyflow-uploads', false)
on conflict (id) do update set public = false;
