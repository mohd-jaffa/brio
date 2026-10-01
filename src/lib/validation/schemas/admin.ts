import * as z from "zod";

import { cursorParam, searchParam } from "./list";

/** The developer console's lists (plan §37): a page at a time, newest first. */
export const adminListQuerySchema = z.object({ cursor: cursorParam });

export type AdminListQuery = z.output<typeof adminListQuerySchema>;

/** The error log (plan §103): a page at a time, and what to look for — a reference, or words of the message. */
export const adminErrorQuerySchema = z.object({ cursor: cursorParam, search: searchParam });

export type AdminErrorQuery = z.output<typeof adminErrorQuerySchema>;
