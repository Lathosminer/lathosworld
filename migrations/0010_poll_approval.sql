-- Polls stay pending until the owner approves them. Rotation only features approved polls.
-- Applied with the other migrations/*.sql files (Neon on deploy, PGLite in preview).

alter table discussion_poll drop constraint if exists discussion_poll_status_check;

alter table discussion_poll add constraint discussion_poll_status_check
  check (status in ('open', 'closed', 'pending', 'approved', 'suggested'));

update discussion_poll set status = 'pending' where status = 'suggested';

alter table discussion_poll add column if not exists approved_at timestamptz;

-- A seeded question that went live on its own comes back to the queue.
update discussion_poll
set status = 'pending',
    featured = false,
    hidden_at = coalesce(hidden_at, now()),
    hidden_reason = case when hidden_reason = '' then 'approval' else hidden_reason end
where status = 'open'
  and deleted_at is null
  and bank_id is not null
  and approved_at is null;

-- Polls the owner already published, and closed results, count as approved.
update discussion_poll
set approved_at = created_at
where approved_at is null
  and deleted_at is null
  and status in ('open', 'closed');

create index if not exists discussion_poll_queue_idx
  on discussion_poll (created_at)
  where deleted_at is null and status in ('pending', 'approved');
