import { getJson, patchJson, postFile } from "@/lib/api/client";
import { apiRoutes } from "@/lib/query/keys";
import type { BusinessProfileInput } from "@/lib/validation";

import type { BusinessProfile } from "./types";

/** What the browser may ask the API about the business (plan §139.13). */
export const BusinessClient = {
  get: () => getJson<BusinessProfile>(apiRoutes.business.profile),
  update: (payload: BusinessProfileInput) => patchJson<BusinessProfile>(apiRoutes.business.profile, payload),
  uploadLogo: (file: Blob) => postFile<BusinessProfile>(apiRoutes.business.logo, file),
};
