import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { HOME_PERIODS } from "@/constants/ranges";
import { OPEN_STATUSES, PAYMENT_STATUSES } from "@/constants/statuses";

/**
 * What Home asks for (plan §139.10, §116): the period its tiles read over,
 * and the filters on its orders due — how far along, and how paid — which
 * combine.
 */
export const dashboardQuerySchema = z.object({
  period: z.enum(HOME_PERIODS, { error: VALIDATION_MESSAGES.invalid }).default("TODAY"),
  status: z.enum(OPEN_STATUSES, { error: VALIDATION_MESSAGES.invalid }).optional(),
  payment: z.enum(PAYMENT_STATUSES, { error: VALIDATION_MESSAGES.invalid }).optional(),
});

export type DashboardQuery = z.output<typeof dashboardQuerySchema>;
