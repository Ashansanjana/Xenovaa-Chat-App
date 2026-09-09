-- Links an accepted chat request to the 1:1 conversation it created, so the
-- frontend can jump straight from "Connections" / relationship status to the chat.
alter table chat_requests
  add column conversation_id uuid references conversations(id) on delete set null;
