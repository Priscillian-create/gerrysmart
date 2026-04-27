import type { NextRequest } from "next/server";
import { handleApiError } from "./errors";

type RouteContext<TParams = Record<string, string>> = {
  params: Promise<TParams>;
};

type RouteHandler<TParams = Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<TParams>
) => Promise<Response>;

export function withRoute<TParams = Record<string, string>>(
  handler: RouteHandler<TParams>
) {
  return async (request: NextRequest, context: RouteContext<TParams>) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
