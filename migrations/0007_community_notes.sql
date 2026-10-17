-- Community notes: short context on a post, rated helpful or not.
-- A note stays off the public post until readers mark it helpful.
-- Applied with the other migrations/*.sql files (Neon on deploy, PGLite in preview).

create table if not exists discussion_note (
  id text primary key,
  post_id text not null references discussion_post (id) on delete cascade,
  author_id text not null,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  hidden_at timestamptz,
  hidden_reason text not null default ''
);

create unique index if not exists discussion_note_author_post_idx
  on discussion_note (post_id, author_id)
  where deleted_at is null;

create index if not exists discussion_note_post_idx
  on discussion_note (post_id, created_at)
  where deleted_at is null;

create table if not exists discussion_note_rating (
  id text primary key,
  note_id text not null references discussion_note (id) on delete cascade,
  rater_id text not null,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  unique (note_id, rater_id)
);

create index if not exists discussion_note_rating_note_idx
  on discussion_note_rating (note_id);
