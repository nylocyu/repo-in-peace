-- Migration: one shared cemetery -> own cemetery per user + Zentralfriedhof. Run once in the SQL editor.
-- Every grave moves to the cemetery of whoever buried it (packed from the front) and, if public,
-- also stays on the Zentralfriedhof at its old plot. Private graves leave the Zentralfriedhof.
begin;

-- Backup first (RLS on, so the REST API can't read it). Drop once you're happy.
create table graves_backup_own_cemeteries as table graves;
create table tributes_backup_own_cemeteries as table tributes;
alter table graves_backup_own_cemeteries enable row level security;
alter table tributes_backup_own_cemeteries enable row level security;

create table cemeteries (
  owner text primary key,
  login_required boolean not null default true,
  invite_token text,
  topic text not null
);
alter table cemeteries enable row level security;
create table guests (
  cemetery text not null references cemeteries on delete cascade,
  login text not null,
  primary key (cemetery, login)
);
alter table guests enable row level security;

alter table graves drop constraint graves_plot_key;
alter table graves add column cemetery text, add column central_plot int;
update graves set cemetery = lower(data->>'owner'),
  central_plot = case when coalesce((data->>'private')::boolean, false) then null else plot end;
update graves g set plot = n.rn - 1
  from (select id, row_number() over (partition by cemetery order by plot) as rn from graves) n where g.id = n.id;
alter table graves alter column cemetery set not null,
  add unique (cemetery, plot),
  add unique (central_plot),
  add check (central_plot >= 0),
  add constraint private_not_central check (central_plot is null or coalesce((data->>'private')::boolean, false) = false);

drop policy "anyone can listen to the cemetery" on realtime.messages;
create policy "listen to cemeteries you know the topic of" on realtime.messages
  for select to anon, authenticated
  using ((realtime.topic() = 'cemetery' or realtime.topic() like 'cemetery:%') and extension = 'broadcast');

commit;
