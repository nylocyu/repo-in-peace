-- Migration: own cemeteries + Central Cemetery -> one private cemetery per user. Run once in the SQL editor.
-- Graves stay in their owner's cemetery; the next sync of each user re-checks them against GitHub.
-- Drops the Central Cemetery placements, invites, guests and the Realtime policy.
begin;

alter table graves drop constraint private_not_central;
alter table graves drop column central_plot;
drop table guests;
drop table cemeteries;
drop policy "listen to cemeteries you know the topic of" on realtime.messages;

create table users (
  login text primary key,
  api_key text,
  ai_asked boolean not null default false
);
alter table users enable row level security;

commit;
