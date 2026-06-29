import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { PosDataError } from "@/lib/pos-data.js";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null
        }
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof PosDataError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null
        }
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request payload is invalid.",
          details: error.flatten()
        }
      },
      { status: 400 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "A record with the same unique value already exists."
          }
        },
        { status: 409 }
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "The requested record was not found."
          }
        },
        { status: 404 }
      );
    }

    if (error.code === "P2021") {
      return NextResponse.json(
        {
          error: {
            code: "SCHEMA_MISSING",
            message: "Database schema is not applied. Run Prisma push or migrations."
          }
        },
        { status: 503 }
      );
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        error: {
          code: "DB_CONNECTION_FAILED",
          message: "Cannot connect to the database. Check DATABASE_URL and network."
        }
      },
      { status: 503 }
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred."
      }
    },
    { status: 500 }
  );
}
