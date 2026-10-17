-- Automatic moderation: hidden posts, strikes, and temporary mutes.
-- Applied with the other migrations/*.sql files (Neon on deploy, PGLite in preview).

alter table discussion_post add column if not exists hidden_at timestamptz;

alter table discussion_post add column if not exists hidden_reason text not null default '';

create index if not exists discussion_post_hidden_idx
  on discussion_post (hidden_at desc)
  where hidden_at is not null;

create table if not exists discussion_strike (
  id text primary key,
  user_id text not null,
  post_id text not null references discussion_post (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);

create unique index if not exists discussion_strike_user_post_idx
  on discussion_strike (user_id, post_id);

create index if not exists discussion_strike_user_created_idx
  on discussion_strike (user_id, created_at desc);

create table if not exists discussion_mute (
  user_id text primary key,
  until timestamptz not null,
  created_at timestamptz not null default now()
);
