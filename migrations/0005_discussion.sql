-- Fan discussion: board threads, nested replies, and clip comments.
-- Applied with the other migrations/*.sql files (Neon on deploy, PGLite in preview).

create table if not exists discussion_post (
  id text primary key,
  scope text not null check (scope = 'board' or scope like 'clip:%'),
  parent_id text references discussion_post (id) on delete cascade,
  root_id text not null,
  author_id text not null,
  title text check (title is null or char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (parent_id is null or parent_id <> id)
);

create index if not exists discussion_post_scope_created_idx
  on discussion_post (scope, created_at desc);

create index if not exists discussion_post_root_idx
  on discussion_post (root_id, created_at);

create index if not exists discussion_post_author_created_idx
  on discussion_post (author_id, created_at desc);

create table if not exists discussion_report (
  id text primary key,
  post_id text not null references discussion_post (id) on delete cascade,
  reporter_id text not null,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create index if not exists discussion_report_post_idx on discussion_report (post_id);

create index if not exists discussion_report_reporter_created_idx
  on discussion_report (reporter_id, created_at desc);

create table if not exists discussion_ban (
  user_id text primary key,
  banned_by text not null,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);
