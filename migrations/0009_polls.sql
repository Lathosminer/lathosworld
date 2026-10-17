-- Community polls: one featured question, one vote each, suggestions held for the owner.
-- Applied with the other migrations/*.sql files (Neon on deploy, PGLite in preview).

create table if not exists discussion_poll (
  id text primary key,
  bank_id text,
  week_key text,
  question text not null check (char_length(question) between 1 and 140),
  status text not null check (status in ('open', 'closed', 'suggested')),
  featured boolean not null default false,
  hidden_at timestamptz,
  hidden_reason text not null default '',
  author_id text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  deleted_at timestamptz
);

create index if not exists discussion_poll_featured_idx
  on discussion_poll (featured)
  where deleted_at is null and status = 'open';

create index if not exists discussion_poll_closed_idx
  on discussion_poll (closed_at desc)
  where deleted_at is null and status = 'closed';

create table if not exists discussion_poll_option (
  id text primary key,
  poll_id text not null references discussion_poll (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  position int not null check (position between 0 and 5)
);

create unique index if not exists discussion_poll_option_pos_idx
  on discussion_poll_option (poll_id, position);

create table if not exists discussion_poll_vote (
  poll_id text not null references discussion_poll (id) on delete cascade,
  user_id text not null,
  option_id text not null references discussion_poll_option (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create index if not exists discussion_poll_vote_option_idx
  on discussion_poll_vote (option_id);
