create table if not exists newsletter_subscriber (
  id serial primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);
