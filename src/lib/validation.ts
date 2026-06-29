import { z } from "zod";
import { ApiError } from "@/lib/errors";

export async function parseBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  const body = await request.json().catch(() => {
    throw new ApiError(400, "INVALID_JSON", "The request body must be valid JSON.");
  });

  return schema.parse(body);
}

export function parseQuery<TSchema extends z.ZodTypeAny>(
  url: URL,
  schema: TSchema
): z.infer<TSchema> {
  return schema.parse(Object.fromEntries(url.searchParams.entries()));
}

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().uuid().optional()
});
