create table if not exists security_answer (
  id serial primary key,
  user_id text not null,
  question text not null,
  answer_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists security_answer_user_idx on security_answer (user_id);
