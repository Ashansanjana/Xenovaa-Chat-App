-- Lets any employee report a message or a user; admins view/resolve these from
-- the admin dashboard ("view/moderate reports" in the feature list).
create type report_status as enum ('open', 'resolved', 'dismissed');

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  reported_user_id uuid references users(id) on delete cascade,
  message_id uuid references messages(id) on delete cascade,
  reason text not null,
  status report_status not null default 'open',
  resolved_by uuid references users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint report_has_target check (reported_user_id is not null or message_id is not null)
);

create index idx_reports_status on reports(status, created_at);
