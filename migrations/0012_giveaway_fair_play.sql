-- Giveaway fair-play: ticker opt-out, exclusion list, claim tracking, published entry list.
-- Applied with the other migrations/*.sql files (Neon on deploy, PGLite in preview).

alter table giveaway_entrant add column if not exists ticker_hidden boolean not null default false;

-- Admin-editable: emails, user ids, or social handles (lowercased, no "@") that can't win.
create table if not exists giveaway_exclusion (
  value text primary key check (char_length(value) between 1 and 200),
  note text not null default '' check (char_length(note) <= 120),
  created_at timestamptz not null default now()
);

alter table giveaway_draw add column if not exists claim_status text not null default 'waiting';

alter table giveaway_draw drop constraint if exists giveaway_draw_claim_status_check;

alter table giveaway_draw add constraint giveaway_draw_claim_status_check
  check (claim_status in ('waiting', 'claimed', 'expired'));

alter table giveaway_draw add column if not exists claimed_at timestamptz;

-- Snapshot of the entry list the owner chose to publish (names + entry counts only).
create table if not exists giveaway_published (
  id text primary key,
  body text not null,
  created_at timestamptz not null default now()
);
