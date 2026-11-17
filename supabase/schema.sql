-- Repo in Peace schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- Existing install from before own cemeteries? Run supabase/migrate-own-cemeteries.sql instead.
-- Tables are server-only: RLS on, no policies, so only the secret key (server) can touch them.

-- One per user at /c/<owner>, entered only via the owner's invite link. The Zentralfriedhof at / has no row.
create table cemeteries (
  owner text primary key,           -- lowercase GitHub login
  login_required boolean not null default true, -- false: the invite link alone lets you in, no GitHub sign-in
  invite_token text,                -- null = no invite link (or it was reset)
  topic text not null               -- secret Realtime topic suffix, handed out only after the access check
);
alter table cemeteries enable row level security;

create table guests (
  cemetery text not null references cemeteries on delete cascade,
  login text not null,              -- lowercase GitHub login
  primary key (cemetery, login)
);
alter table guests enable row level security;

-- One repo = one grave with up to two placements: its owner's cemetery and, optionally, the Zentralfriedhof
create table graves (
  id text primary key,              -- GitHub repo id
  cemetery text not null,           -- lowercase login of whoever buried it
  plot int not null check (plot >= 0),
  central_plot int unique check (central_plot >= 0), -- null = not on the Zentralfriedhof
  data jsonb not null,              -- everything else, see bury() in server.js
  flowers int not null default 0,
  candles int not null default 0,
  respects int not null default 0,
  unique (cemetery, plot),
  constraint private_not_central check (central_plot is null or coalesce((data->>'private')::boolean, false) = false)
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

-- Realtime: browsers may only *receive* on the private cemetery topics (chat, tributes, "graves changed" pings).
-- "cemetery" is the Zentralfriedhof, "cemetery:<secret>" an own cemetery: the server reveals the secret only
-- to visitors who may enter, and rotates it when access is taken away (guest removed, link reset, sign-in turned on). Only the server sends there.
-- Movement and presence use public "cemetery:players" / "players:<secret>" channels and need no policy.
create policy "listen to cemeteries you know the topic of" on realtime.messages
  for select to anon, authenticated
  using ((realtime.topic() = 'cemetery' or realtime.topic() like 'cemetery:%') and extension = 'broadcast');
