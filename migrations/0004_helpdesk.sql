create table if not exists help_ticket (
  id serial primary key,
  name text not null,
  email text not null,
  message text not null,
  answer text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists help_ticket_email_created_idx on help_ticket (email, created_at);
