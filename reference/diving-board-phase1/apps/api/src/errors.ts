import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new ApiError(404, 'not_found', `${what} not found`);
export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, 'bad_request', message, details);
export const forbidden = (message = 'Not allowed') => new ApiError(403, 'forbidden', message);

/** The record changed since the client read it. The response carries the current copy. */
export const conflict = (current: unknown) =>
  new ApiError(409, 'version_conflict', 'This record was changed on another device. Review the latest copy and save again.', current);

export function errorResponse(err: unknown, c: Context) {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message, details: err.details ?? null } }, err.status);
  }
  console.error(err);
  return c.json({ error: { code: 'internal', message: 'Internal error' } }, 500);
}
