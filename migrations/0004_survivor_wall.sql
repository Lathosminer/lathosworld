alter table newsletter_subscriber add column if not exists display_name text;
alter table newsletter_subscriber add column if not exists show_on_wall boolean not null default false;
