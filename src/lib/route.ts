import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { handleApiError } from "@/lib/errors";

type RouteContext<TParams = Record<string, string>> = {
  params: Promise<TParams>;
};

type RouteHandler<TParams = Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<TParams>
) => Promise<Response>;

function withCors(response: Response, request: Request | NextRequest) {
  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  applyCorsHeaders(nextResponse.headers, request.headers.get("origin"));

  return nextResponse;
}

export function createCorsPreflightResponse(request: Request | NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: buildCorsHeaders(request.headers.get("origin"))
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
