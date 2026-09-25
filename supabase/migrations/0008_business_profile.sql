-- ============================================================
-- The business profile and its logo (plan §139.11.2, §56, §118;
-- §133.2 B1–B3; tracker R2.6, R2.7).
--
-- 1. The fields Business details edits: the catch phrase and the city are
--    new, and every field is bounded as its schema is (src/lib/validation).
-- 2. The logo reference: where the one current logo is stored, and its type.
-- 3. `bakeries` stays SELECT-only for the API role (§139.11.2). Edits go
--    through two functions that act only on the caller's own business, and
--    only for its owner — so no route needs the service-role key to serve a
--    request. The write grants 0004 meant to withhold are revoked.
-- 4. The private bucket the logo lives in, readable and writable only
--    inside the caller's own business's folder (§56).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Profile fields
-- ------------------------------------------------------------

alter table public.bakeries
  add column if not exists tagline text,
  add column if not exists city text;

-- The name's old check only had a floor; the registration schema allows 160.
alter table public.bakeries drop constraint if exists bakeries_business_name_check;

alter table public.bakeries
  add constraint bakeries_business_name_length check (char_length(btrim(business_name)) between 2 and 160),
  add constraint bakeries_tagline_length check (tagline is null or char_length(btrim(tagline)) between 1 and 80),
  -- Nullable: businesses registered before the city was asked for have none
  -- until they add it. Registration asks for it from R2.4.
  add constraint bakeries_city_length check (city is null or char_length(btrim(city)) between 2 and 80),
  add constraint bakeries_address_length check (address is null or char_length(btrim(address)) between 1 and 300);

-- ------------------------------------------------------------
-- 2. The logo reference
-- ------------------------------------------------------------

-- `logo` was never written: nothing could upload one (§133.2 B2).
alter table public.bakeries rename column logo to logo_path;
update public.bakeries set logo_path = null where logo_path is not null;

alter table public.bakeries add column if not exists logo_mime_type text;

alter table public.bakeries
  -- Only inside this business's own folder, as `bakeries/{id}/logo/{logo id}`
  -- (§56), so a stored reference can never point at another business's file.
  add constraint bakeries_logo_path_shape check (
    logo_path is null
    or logo_path ~ ('^bakeries/' || id::text || '/logo/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  ),
  add constraint bakeries_logo_mime_type check (
    logo_mime_type is null or logo_mime_type in ('image/png', 'image/jpeg', 'image/webp')
  ),
  add constraint bakeries_logo_pair check ((logo_path is null) = (logo_mime_type is null));

-- ------------------------------------------------------------
-- 3. Edits, for the owner only
-- ------------------------------------------------------------

-- Every field at once: the Business details form sends the whole profile, so
-- clearing the catch phrase and leaving it alone stay different things.
create or replace function public.update_business_profile(
  p_business_name text,
  p_tagline text,
  p_city text,
  p_address text,
  p_phone text
)
returns setof public.bakeries
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with updated as (
    update public.bakeries as b
       set business_name = p_business_name,
           tagline = p_tagline,
           city = p_city,
           address = p_address,
           phone = p_phone
     where b.id = public.current_profile_bakery_id()
       and b.owner_id = auth.uid()
    returning b.*
  )
  select * from updated;

  if not found then
    raise exception 'no business for this caller' using errcode = 'P0001', hint = 'RECORD_NOT_FOUND';
  end if;
end;
$$;

-- Points the business at its new logo and hands back the one it replaced, so
-- the server deletes that file only once nothing refers to it (§118). The new
-- file must already be stored: a reference to nothing is refused.
create or replace function public.set_business_logo(p_path text, p_mime_type text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  business uuid := public.current_profile_bakery_id();
  previous text;
begin
  select b.logo_path into previous
    from public.bakeries as b
   where b.id = business
     and b.owner_id = auth.uid()
     for update;

  if not found then
    raise exception 'no business for this caller' using errcode = 'P0001', hint = 'RECORD_NOT_FOUND';
  end if;

  if not exists (
    select 1 from storage.objects as o
     where o.bucket_id = 'business-logos' and o.name = p_path
  ) then
    raise exception 'logo file not stored' using errcode = 'P0001', hint = 'UPLOAD_FAILED';
  end if;

  update public.bakeries
     set logo_path = p_path,
         logo_mime_type = p_mime_type
   where id = business;

  return previous;
end;
$$;

revoke all on function public.update_business_profile(text, text, text, text, text) from public, anon;
revoke all on function public.set_business_logo(text, text) from public, anon;
grant execute on function public.update_business_profile(text, text, text, text, text) to authenticated;
grant execute on function public.set_business_logo(text, text) to authenticated;

-- 0004 meant a signed-in user to have SELECT on these two tables and nothing
-- more, but only granted it: Supabase's default privileges had already given
-- `authenticated` every privilege, so RLS alone stood between a client and an
-- UPDATE, and nothing at all before a TRUNCATE. Every write to them runs as
-- the service role (registration, the session) or through the functions above.
revoke insert, update, delete, truncate, references, trigger on public.bakeries, public.profiles from authenticated;

-- ------------------------------------------------------------
-- 4. The logo bucket
-- ------------------------------------------------------------

-- Private: a logo is read through /api/business/logo, never by a storage URL.
-- The limits repeat the server's own checks (500 KB; PNG, JPEG or WebP).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-logos', 'business-logos', false, 512000, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A file is reachable only inside `bakeries/{the caller's business}/`. There is
-- no UPDATE policy: a new logo is always a new file, never an overwrite.
drop policy if exists business_logos_select_own on storage.objects;
create policy business_logos_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = 'bakeries'
  and (storage.foldername(name))[2] = public.current_profile_bakery_id()::text
);

drop policy if exists business_logos_insert_own on storage.objects;
create policy business_logos_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = 'bakeries'
  and (storage.foldername(name))[2] = public.current_profile_bakery_id()::text
);

drop policy if exists business_logos_delete_own on storage.objects;
create policy business_logos_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = 'bakeries'
  and (storage.foldername(name))[2] = public.current_profile_bakery_id()::text
);
