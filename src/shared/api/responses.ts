import { NextResponse } from "next/server";
import { type ErrorMessageCode, getErrorMessage } from "@/constants/messages";
import { type AppError } from "@/shared/errors/app-error";

export interface ApiErrorPayload {
  success: false;
  error: {
    code: ErrorMessageCode;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface ApiSuccessPayload<TData> {
  success: true;
  data: TData;
}

export function buildErrorPayload(error: AppError, requestId: string): ApiErrorPayload {
  return {
    success: false,
    error: {
      code: error.code,
      message: getErrorMessage(error.code),
      requestId,
      details: error.details,
    },
  };
}

export function successResponse<TData>(
  data: TData,
  requestId: string,
  status = 200,
): NextResponse<ApiSuccessPayload<TData>> {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        "x-request-id": requestId,
      },
    },
  );
}

export function errorResponse(error: AppError, requestId: string): NextResponse<ApiErrorPayload> {
  return NextResponse.json(buildErrorPayload(error, requestId), {
    status: error.statusCode,
    headers: {
      "x-request-id": requestId,
    },
  });
}
