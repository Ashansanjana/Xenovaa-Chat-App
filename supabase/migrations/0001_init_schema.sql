-- Xenovaa Chat — initial schema
-- Extensions
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- Enum types
create type user_role as enum ('employee', 'admin');
create type user_status as enum ('online', 'offline');
create type request_status as enum ('pending', 'accepted', 'rejected');
create type member_role as enum ('member', 'admin');
create type message_type as enum ('text', 'image', 'file');
create type delivery_status as enum ('sent', 'delivered', 'read');
create type notification_type as enum (
  'chat_request', 'request_accepted', 'new_message', 'announcement', 'mention'
);

-- Departments
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Users & org structure
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  profile_image text,
  department_id uuid references departments(id) on delete set null,
  role user_role not null default 'employee',
  status user_status not null default 'offline',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Chat requests
create table chat_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(id) on delete cascade,
  receiver_id uuid not null references users(id) on delete cascade,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint no_self_request check (sender_id <> receiver_id)
);

-- Conversations (works for 1:1 and group)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  name text,
  group_image text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  message text,
  message_type message_type not null default 'text',
  file_url text,
  reply_to_message_id uuid references messages(id) on delete set null,
  is_deleted boolean not null default false,
  deleted_for_everyone boolean not null default false,
  created_at timestamptz not null default now()
);

create table message_status (
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status delivery_status not null default 'sent',
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table pinned_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  pinned_by uuid not null references users(id) on delete cascade,
  pinned_at timestamptz not null default now()
);

-- Safety
create table blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_block check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type notification_type not null,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Company announcements
create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  posted_by uuid not null references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_chat_requests_receiver on chat_requests(receiver_id, status);
create index idx_notifications_user on notifications(user_id, is_read);
create index idx_conversation_members_user on conversation_members(user_id);
