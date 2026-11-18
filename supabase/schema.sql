-- Repo in Peace schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- Upgrading an older install? See the migrate-*.sql files instead.
-- Tables are server-only: RLS on, no policies, so only the secret key (server) can touch them.

-- One repo = one grave in its owner's private cemetery
create table graves (
  id text primary key,              -- GitHub repo id
  cemetery text not null,           -- lowercase GitHub login of the owner
  plot int not null check (plot >= 0),
  data jsonb not null,              -- everything else, see syncRepo() in server.js
  flowers int not null default 0,
  candles int not null default 0,
  respects int not null default 0,
  unique (cemetery, plot)
);
alter table graves enable row level security;

create table tributes (
  grave_id text not null references graves on delete cascade,
  who text not null,                -- GitHub login
  kind text not null check (kind in ('flower', 'candle', 'f')),
  primary key (grave_id, who, kind) -- once per grave and kind
);
alter table tributes enable row level security;

-- Insert + count in one transaction
create function tribute(gid text, who text, kind text) returns void language sql set search_path = '' as $$
  insert into public.tributes values (gid, who, kind);
  update public.graves set
    flowers = flowers + (kind = 'flower')::int,
    candles = candles + (kind = 'candle')::int,
    respects = respects + (kind = 'f')::int
  where id = gid;
$$;
revoke execute on function tribute from public, anon, authenticated;

-- Bring your own Claude key: sealed with SESSION_SECRET (AES-GCM) before it is stored
create table users (
  login text primary key,           -- lowercase GitHub login
  api_key text,                     -- null = no AI epitaphs
  ai_asked boolean not null default false -- the first-visit key prompt was answered
);
alter table users enable row level security;
