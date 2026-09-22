import { ZodError } from "zod";
import { ERROR_MESSAGES } from "@/constants/messages";
import { errorResponse, successResponse } from "@/shared/api/responses";
import { AppError, InternalServerError, ValidationError, toAppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/logging/logger";

interface ApiContext {
  requestId: string;
}

interface HandlerOptions {
  successStatus?: number;
}

type ApiHandler<TData> = (context: ApiContext) => Promise<TData>;

export function createRequestId(headers?: Headers) {
  const incoming = headers?.get("x-request-id")?.trim();

  if (incoming) {
    return incoming;
  }

  return `req_${crypto.randomUUID()}`;
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch (error) {
    throw new ValidationError("VALIDATION_INVALID_JSON", { cause: String(error) });
  }
}

export function normalizeApiError(error: unknown): AppError {
  if (error instanceof ZodError) {
    return new ValidationError(
      "VALIDATION_ERROR",
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return toAppError(error);
}

export async function withApiHandler<TData>(
  request: Request,
  handler: ApiHandler<TData>,
  options: HandlerOptions = {},
) {
  const requestId = createRequestId(request.headers);

  try {
    const data = await handler({ requestId });
    return successResponse(data, requestId, options.successStatus ?? 200);
  } catch (error) {
    const appError = normalizeApiError(error);
    const logError =
      appError instanceof InternalServerError ? appError : new Error(appError.message);

    logger.error(
      "API request failed",
      {
        code: appError.code,
        statusCode: appError.statusCode,
        details: appError.details,
        errorName: logError.name,
        errorMessage: logError.message,
      },
      requestId,
    );

    return errorResponse(appError, requestId);
  }
}
