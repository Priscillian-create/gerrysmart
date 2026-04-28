import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";

type RouteContext<TParams = Record<string, string>> = {
  params: Promise<TParams>;
};

type RouteHandler<TParams = Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<TParams>
) => Promise<Response>;

function buildCorsHeaders(request: Pick<Request, "headers">) {
  const origin = request.headers.get("origin");
  const headers = new Headers();

  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Set-Cookie");
  headers.set("Access-Control-Allow-Credentials", "true");

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function withCors(response: Response, request: Pick<Request, "headers">) {
  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  buildCorsHeaders(request).forEach((value, key) => {
    nextResponse.headers.set(key, value);
  });

  return nextResponse;
}

export function createCorsPreflightResponse(request: Pick<Request, "headers">) {
  return new NextResponse(null, {
    status: 200,
    headers: buildCorsHeaders(request)
  });
}

export function withRoute<TParams = Record<string, string>>(
  handler: RouteHandler<TParams>
) {
  return async (request: NextRequest, context: RouteContext<TParams>) => {
    try {
      const response = await handler(request, context);
      return withCors(response, request);
    } catch (error) {
      return withCors(handleApiError(error), request);
    }
  };
}
