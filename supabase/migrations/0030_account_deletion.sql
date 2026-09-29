-- ============================================================
-- An owner deletes their own account (plan §139.17.5, R8.10; the user,
-- 2026-09-28). Google Play asks it of every app that makes accounts.
--
-- It deletes everything of the account and its business, at once, for good,
-- in one transaction: the business and every row that is its own (customers,
-- products, orders with their items, charges and payments, the stock ledger,
-- expenses and their categories, notifications and the audit trail — each is
-- ON DELETE CASCADE from `bakeries`), the queue's work that names the account
-- or the business, the profile, and the sign-in itself (Auth's identities,
-- sessions and tokens go with the user).
--
-- Only the server calls it, through the service role, after the owner has
-- typed their sign-in number, their email and their password twice, and the
-- password has been checked (`deleteAccount`, src/features/auth/account.ts).
-- It answers the business's id, so the server can then remove the logo's
-- file, which is kept in Storage rather than in a table.
--
-- SECURITY DEFINER because the service role may not delete from auth.users;
-- the owner of this function may. No signed-in user can call it.
-- ============================================================

create or replace function public.delete_account(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  business uuid;
begin
  -- An owner's account only: a developer's is removed from the dashboard.
  select p.bakery_id into business
    from public.profiles as p
   where p.id = p_user_id and p.role = 'USER'
   for update;
  if not found then
    raise exception 'no such owner' using errcode = 'P0001', hint = 'RECORD_NOT_FOUND';
  end if;

  -- The queue's work, which names the account or the business only in its payload.
  delete from public.jobs as j
   where j.payload ->> 'userId' = p_user_id::text
      or j.payload ->> 'bakeryId' = business::text;

  -- The profile first: it names the business, which cannot go while it does.
  delete from public.profiles as p where p.id = p_user_id;
  -- The business, and with it every row that is its own.
  delete from public.bakeries as b where b.id = business and b.owner_id = p_user_id;
  -- The sign-in: its identities, sessions and tokens go with it.
  delete from auth.users as u where u.id = p_user_id;

  return business;
end;
$$;

revoke all on function public.delete_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_account(uuid) to service_role;
