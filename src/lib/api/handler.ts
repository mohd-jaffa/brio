import type { ZodType } from "zod";
import { ZodError } from "zod";

import { AppError, toAppError, validationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { errorResponse, successResponse } from "./responses";

/**
 * What every route handler is wrapped in (AGENTS.md §24). One place decides
 * the response envelope, the request id that ties a failure to its log line,
 * and how a thrown value becomes an HTTP status — so no route repeats any of
 * it, and no route can answer in a shape the client does not expect.
 */
export interface ApiContext {
  requestId: string;
}

interface HandlerOptions {
  /** The status a success answers with; 200 unless the route creates something. */
  successStatus?: number;
}

/** The id this request is known by in the logs and in the error payload. */
export function createRequestId(headers?: Headers): string {
  return headers?.get("x-request-id")?.trim() || `req_${crypto.randomUUID()}`;
}

/**
 * The request's JSON body, parsed by `schema` when one is given. Validating
 * here rather than in each route means a malformed body and an invalid body
 * both answer with the same envelope and neither reaches the data layer.
 */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T>;
export async function readJson(request: Request): Promise<unknown>;
export async function readJson<T>(request: Request, schema?: ZodType<T>): Promise<T | unknown> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw validationError("VALIDATION_INVALID_JSON", { cause: String(error) });
  }
  return schema ? schema.parse(body) : body;
}

/** Any thrown value as an AppError — a Zod failure keeps which field went wrong. */
export function normalizeApiError(error: unknown): AppError {
  if (error instanceof ZodError) {
    return validationError(
      "VALIDATION_ERROR",
      error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  return toAppError(error);
}

export async function withApiHandler<TData>(
  request: Request,
  handler: (context: ApiContext) => Promise<TData>,
  options: HandlerOptions = {},
) {
  const requestId = createRequestId(request.headers);

  try {
    return successResponse(await handler({ requestId }), requestId, options.successStatus ?? 200);
  } catch (error) {
    const appError = normalizeApiError(error);

    // The cause is logged, never returned: it is the driver's own text, and it
    // names tables, columns and sometimes values (AGENTS.md §10).
    logger.error(
      "API request failed",
      {
        kind: appError.kind,
        code: appError.code,
        httpStatus: appError.httpStatus,
        traceId: appError.traceId,
        details: appError.details,
        cause: appError.cause instanceof Error ? appError.cause.message : appError.cause,
      },
      requestId,
    );

    return errorResponse(appError, requestId);
  }
}
