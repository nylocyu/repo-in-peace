-- Repo in Peace schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- Tables are server-only: RLS on, no policies, so only the secret key (server) can touch them.

create table graves (
  id text primary key,              -- GitHub repo id
  plot int not null unique check (plot >= 0),
  data jsonb not null,              -- everything else, see bury() in server.js
  flowers int not null default 0,
  candles int not null default 0,
  respects int not null default 0
);
alter table graves enable row level security;

create table tributes (
  grave_id text not null references graves on delete cascade,
  who text not null,                -- GitHub login or guest session id
  kind text not null check (kind in ('flower', 'candle', 'f')),
  primary key (grave_id, who, kind) -- once per person, grave and kind
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

-- Realtime: browsers may only *receive* on the private "cemetery" topic (chat, tributes, grave list).
-- Only the server sends there, via the REST broadcast API with the secret key.
-- Movement and presence use the public "cemetery:players" channel and need no policy.
create policy "anyone can listen to the cemetery" on realtime.messages
  for select to anon, authenticated
  using (realtime.topic() = 'cemetery' and extension = 'broadcast');
