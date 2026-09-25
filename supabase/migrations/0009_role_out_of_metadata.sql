-- ============================================================
-- The role leaves user_metadata (plan §139.14 BUG-17, tracker R2.3).
--
-- Registration wrote `role` into Supabase's user_metadata, which a signed-in
-- user can edit for themselves. Nothing reads it, but a future read would be a
-- privilege escalation. Registration no longer writes it, and the copies
-- already there are removed. The role lives on `profiles`, which only the
-- server writes.
-- ============================================================

update auth.users
   set raw_user_meta_data = raw_user_meta_data - 'role'
 where raw_user_meta_data ? 'role';
