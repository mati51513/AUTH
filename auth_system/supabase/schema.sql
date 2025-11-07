-- Supabase schema for BlackCode Auth
-- Run these in Supabase SQL editor or psql connected to your project

-- Profiles linked to Supabase Auth users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  created_at timestamptz default now()
);

-- 2FA codes storage (optional; in dev we use in-memory)
create table if not exists public.two_fa_codes (
  email text primary key,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- License keys
create table if not exists public.licenses (
  key text primary key,
  type text not null,
  status text not null default 'active',
  created_at timestamptz default now()
);

-- License key activity log
create table if not exists public.key_logs (
  id bigserial primary key,
  key text not null,
  action text not null,
  context jsonb,
  ts timestamptz default now()
);

-- Indexes
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_two_fa_codes_expires on public.two_fa_codes(expires_at);
create index if not exists idx_licenses_status on public.licenses(status);
create index if not exists idx_key_logs_key on public.key_logs(key);

-- (Optional) RLS policies can be added here depending on your usage.
