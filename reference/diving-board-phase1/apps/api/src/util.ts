import { badRequest } from './errors';

export const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const body = await req.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as T;
  } catch {
    throw badRequest('Request body must be a JSON object');
  }
}

export function requireString(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (typeof v !== 'string' || v.trim() === '') throw badRequest(`"${key}" is required`);
  return v.trim();
}

export function optionalString(body: Record<string, unknown>, key: string): string | null {
  const v = body[key];
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw badRequest(`"${key}" must be a string`);
  return v.trim();
}

export function oneOf<T extends string>(body: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = body[key];
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw badRequest(`"${key}" must be one of: ${allowed.join(', ')}`);
  }
  return v as T;
}

/** The version the client last read, from If-Match or body.version. */
export function expectedVersion(req: Request, body: Record<string, unknown>): number {
  const raw = req.headers.get('If-Match')?.replace(/^W\//, '').replace(/"/g, '') ?? body.version;
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) {
    throw badRequest('Send the record version you are editing (If-Match header or "version")');
  }
  return n;
}
