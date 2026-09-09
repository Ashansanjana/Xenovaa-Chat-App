-- Adds the "On Break" manual presence status. Online/Break are chosen by the
-- user while connected (via the set_status socket event); Offline remains
-- system-controlled only, set automatically when the last socket disconnects
-- (e.g. on logout). Without this, every attempt to write status = 'break'
-- fails at the database level (invalid enum value) — the failure is silent
-- to the end user (no ack on the set_status socket event), but it also
-- breaks presence broadcasts and delivered-receipt upgrades on every
-- reconnect afterward, since the same enum violation aborts the rest of
-- that code path too.
alter type user_status add value 'break';
