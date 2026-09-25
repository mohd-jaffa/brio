-- ============================================================
-- BAKER becomes USER (plan §139.11.1, tracker R2.2).
--
-- The product serves home businesses of every kind, not only bakers. The
-- enum value is renamed in place, so every existing profile follows without
-- a rewrite, and a new profile defaults to USER. DEV is unchanged and still
-- gets no business data (plan §5).
-- ============================================================

alter type public.user_role rename value 'BAKER' to 'USER';

alter table public.profiles alter column role set default 'USER';
