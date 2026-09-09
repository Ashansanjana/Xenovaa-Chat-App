-- "Delete for me" hides a message only for the deleting user, without touching the
-- shared row (that's what messages.is_deleted / deleted_for_everyone are for).
create table message_deletions (
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index idx_message_deletions_user on message_deletions(user_id);
