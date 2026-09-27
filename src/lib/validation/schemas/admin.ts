import * as z from "zod";

import { cursorParam } from "./list";

/** The developer console's lists (plan §37): a page at a time, newest first. */
export const adminListQuerySchema = z.object({ cursor: cursorParam });

export type AdminListQuery = z.output<typeof adminListQuerySchema>;
