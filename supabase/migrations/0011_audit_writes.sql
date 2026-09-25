-- ============================================================
-- The audit trail is written by the server only (plan §133.7 G1,
-- §139.14 BUG-20, tracker R2.10).
--
-- A signed-in user could INSERT into audit_logs directly, so the trail could
-- be forged for their own business. The server now writes every row through
-- the service role, with the acting user it took from the session
-- (src/lib/audit/auditLog.ts). A signed-in user keeps SELECT, and nothing
-- else: Supabase's default privileges had given `authenticated` every
-- privilege on the table, not only the INSERT that 0004 granted.
-- ============================================================

drop policy if exists audit_logs_insert_own on public.audit_logs;

revoke insert, update, delete, truncate, references, trigger on public.audit_logs from authenticated;
