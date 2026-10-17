-- Giveaway entry tracking: one entrant per site account, one entry per platform.
-- Comments on /giveaway reuse discussion_post with scope 'giveaway'.
-- Applied with the other migrations/*.sql files (Neon on deploy, PGLite in preview).

alter table discussion_post drop constraint if exists discussion_post_scope_check;

alter table discussion_post add constraint discussion_post_scope_check
  check (scope = 'board' or scope = 'giveaway' or scope like 'clip:%');

create table if not exists giveaway_entrant (
  user_id text primary key,
  twitch_user_id text,
  twitch_login text,
  twitch_status text not null default 'none'
    check (twitch_status in ('none', 'verified', 'not_following', 'rejected')),
  twitch_checked_at timestamptz,
  youtube_channel_id text,
  youtube_title text,
  youtube_status text not null default 'none'
    check (youtube_status in ('none', 'verified', 'not_subscribed', 'self_reported', 'rejected')),
  youtube_checked_at timestamptz,
  x_handle text check (x_handle is null or char_length(x_handle) between 1 and 15),
  x_status text not null default 'none'
    check (x_status in ('none', 'pending', 'verified', 'not_following', 'rejected')),
  x_repost_status text not null default 'none'
    check (x_repost_status in ('none', 'pending', 'verified', 'not_found', 'rejected')),
  x_checked_at timestamptz,
  tiktok_handle text check (tiktok_handle is null or char_length(tiktok_handle) between 2 and 24),
  tiktok_status text not null default 'none'
    check (tiktok_status in ('none', 'unverified', 'verified', 'rejected')),
  admin_note text not null default '' check (char_length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One platform account can only be entered once, across all site accounts.
create unique index if not exists giveaway_entrant_twitch_idx
  on giveaway_entrant (twitch_user_id) where twitch_user_id is not null;

create unique index if not exists giveaway_entrant_youtube_idx
  on giveaway_entrant (lower(youtube_channel_id)) where youtube_channel_id is not null;

create unique index if not exists giveaway_entrant_x_idx
  on giveaway_entrant (lower(x_handle)) where x_handle is not null;

create unique index if not exists giveaway_entrant_tiktok_idx
  on giveaway_entrant (lower(tiktok_handle)) where tiktok_handle is not null;

-- Rate limiting for entry actions.
create table if not exists giveaway_action (
  id text primary key,
  user_id text not null,
  action text not null check (char_length(action) between 1 and 40),
  created_at timestamptz not null default now()
);

create index if not exists giveaway_action_user_created_idx
  on giveaway_action (user_id, created_at desc);

-- Live-stream draws. A re-draw marks the previous pick and picks again.
create table if not exists giveaway_draw (
  id text primary key,
  user_id text not null,
  entries int not null,
  pool_entries int not null,
  verified_only boolean not null default false,
  status text not null default 'picked' check (status in ('picked', 'redrawn')),
  created_at timestamptz not null default now()
);

create index if not exists giveaway_draw_created_idx on giveaway_draw (created_at desc);

create index if not exists discussion_post_giveaway_author_idx
  on discussion_post (author_id, created_at)
  where scope = 'giveaway';
