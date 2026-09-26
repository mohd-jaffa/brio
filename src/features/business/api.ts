import type { Tenant } from "@/lib/supabase/tenant";

import { LOGO_BUCKET, type LogoMimeType } from "@/constants/uploads";
import { logActionSafe } from "@/lib/audit/auditLog";
import { externalServiceError, notFoundError, validationError } from "@/lib/errors";
import { fromPostgrestError } from "@/lib/errors/fromSupabaseError";
import { logger } from "@/lib/logger";
import { apiRoutes } from "@/lib/query/keys";
import { requireRow } from "@/lib/supabase/writes";
import type { BusinessProfilePayload } from "@/lib/validation";

import { logoPath, logoVersion, sniffLogoType } from "./logo";
import type { BusinessProfile, BusinessRow } from "./types";

/**
 * The business's own profile and its logo (plan §139.11.2, §56; tracker R2.6,
 * R2.7). Read with the caller's client, so RLS shows only their business.
 * `bakeries` is SELECT-only for that client: an edit goes through the two
 * functions in 0008_business_profile.sql, which act only for the owner.
 */
const COLUMNS = "id, business_name, tagline, city, address, phone, logo_path, logo_mime_type, name_changed_at";

export function toBusinessProfile(row: BusinessRow): BusinessProfile {
  return {
    id: row.id,
    name: row.business_name,
    tagline: row.tagline,
    city: row.city,
    address: row.address,
    phone: row.phone,
    logoUrl: row.logo_path ? `${apiRoutes.business.logo}?v=${logoVersion(row.logo_path)}` : null,
    nameChangedAt: row.name_changed_at,
  };
}

function findBusiness(tenant: Tenant): Promise<BusinessRow> {
  const { supabase: client, bakeryId } = tenant;
  return requireRow<BusinessRow>(
    client.from("bakeries").select(COLUMNS).eq("id", bakeryId).maybeSingle(),
    "RECORD_NOT_FOUND",
  );
}

const audit = (tenant: Tenant, before: Partial<BusinessRow>, after: Partial<BusinessRow>) =>
  logActionSafe(tenant, {
    action: "UPDATE",
    entity_type: "bakeries",
    entity_id: tenant.bakeryId,
    previous_data: before,
    new_data: after,
  });

export async function getBusiness(tenant: Tenant): Promise<BusinessProfile> {
  return toBusinessProfile(await findBusiness(tenant));
}

export async function updateBusiness(
  tenant: Tenant,
  input: BusinessProfilePayload,
): Promise<BusinessProfile> {
  const { supabase: client } = tenant;
  const before = await findBusiness(tenant);
  const after = await requireRow<BusinessRow>(
    client
      .rpc("update_business_profile", {
        p_business_name: input.name,
        p_tagline: input.tagline,
        p_city: input.city,
        p_address: input.address,
        p_phone: input.phone,
      })
      .select(COLUMNS)
      .maybeSingle(),
    "RECORD_NOT_FOUND",
  );
  await audit(tenant, before, after);
  return toBusinessProfile(after);
}

/** A file nothing refers to any more. Failing to remove one is logged, not fatal. */
async function removeLogoFile(tenant: Tenant, path: string) {
  const { supabase: client, bakeryId } = tenant;
  const { error } = await client.storage.from(LOGO_BUCKET).remove([path]);
  if (error) {
    logger.warn("Logo file not removed", { bakeryId, logoId: logoVersion(path), reason: error.message });
  }
}

/**
 * Replaces the logo in the order §118 sets: the new file is checked, then
 * stored, then the business is pointed at it, and only then is the old file
 * deleted. A failure at any step before the switch leaves the old logo in
 * place and takes the new file away again, so there is never a moment with
 * no logo, or two. The size was already checked as the body was read.
 */
export async function replaceLogo(
  tenant: Tenant,
  file: Uint8Array,
): Promise<BusinessProfile> {
  const { supabase: client, bakeryId } = tenant;
  const type = sniffLogoType(file);
  if (!type) throw validationError("LOGO_TYPE_NOT_ALLOWED");

  const path = logoPath(bakeryId, crypto.randomUUID());
  const stored = await client.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: type, upsert: false });
  if (stored.error) throw externalServiceError("UPLOAD_FAILED", undefined, stored.error);

  const switched = await client.rpc("set_business_logo", { p_path: path, p_mime_type: type });
  if (switched.error) {
    await removeLogoFile(tenant, path);
    throw fromPostgrestError(switched.error);
  }

  const previous = switched.data as string | null;
  if (previous) await removeLogoFile(tenant, previous);
  await audit(tenant, { logo_path: previous }, { logo_path: path, logo_mime_type: type });

  return getBusiness(tenant);
}

/** The current logo's bytes, for /api/business/logo to answer with. */
export async function readLogo(
  tenant: Tenant,
): Promise<{ file: Blob; type: LogoMimeType; version: string }> {
  const row = await findBusiness(tenant);
  if (!row.logo_path || !row.logo_mime_type) throw notFoundError();

  const { data, error } = await tenant.supabase.storage.from(LOGO_BUCKET).download(row.logo_path);
  if (error || !data) throw externalServiceError("EXTERNAL_SERVICE_ERROR", undefined, error);
  return { file: data, type: row.logo_mime_type, version: logoVersion(row.logo_path) };
}
