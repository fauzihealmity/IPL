import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/lib/permissions";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Converts any thrown error into the app-wide error envelope:
 *   { success: false, message, code }
 * Never leaks stack traces to the client — full detail is logged
 * server-side only.
 */
export function apiError(error: unknown) {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return NextResponse.json(
      { success: false, message: error.message, code: error.code },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        message: "Data yang dikirim tidak valid.",
        code: "VALIDATION_ERROR",
        errors: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // eslint-disable-next-line no-console
  console.error("[API_ERROR]", error);

  return NextResponse.json(
    {
      success: false,
      message: "Terjadi kesalahan pada server.",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
