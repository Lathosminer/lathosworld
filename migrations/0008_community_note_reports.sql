-- Reports on community notes. Three reports hold a note for the owner.
-- Applied with the other migrations/*.sql files (Neon on deploy, PGLite in preview).

create table if not exists discussion_note_report (
  id text primary key,
  note_id text not null references discussion_note (id) on delete cascade,
  reporter_id text not null,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (note_id, reporter_id)
);

create index if not exists discussion_note_report_note_idx
  on discussion_note_report (note_id);

create index if not exists discussion_note_report_reporter_created_idx
  on discussion_note_report (reporter_id, created_at desc);
