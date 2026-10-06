/**
 * Order references: DB-<yyyymmdd>-<6 chars>. The suffix uses an alphabet
 * without look-alike characters (no 0/O, 1/I/L) so it survives being read
 * aloud or retyped by a manufacturer's CSR.
 */
export const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const REFERENCE_PATTERN = /\bDB-(\d{8})-([2-9A-HJKMNP-Z]{6})\b/;

export type RandomBytes = (n: number) => Uint8Array;

interface CryptoLike {
  getRandomValues<T extends Uint8Array>(a: T): T;
}

const defaultRandom: RandomBytes = (n) => {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!c) throw new Error('No crypto.getRandomValues available; pass a RandomBytes source.');
  return c.getRandomValues(new Uint8Array(n));
};

function yyyymmdd(d: Date): string {
  const y = d.getUTCFullYear().toString().padStart(4, '0');
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}${m}${day}`;
}

export function generateOrderReference(at: Date | string, random: RandomBytes = defaultRandom): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date for order reference');
  // Rejection sampling keeps the distribution uniform over 31 symbols.
  const limit = 256 - (256 % REFERENCE_ALPHABET.length);
  let suffix = '';
  while (suffix.length < 6) {
    for (const b of random(12)) {
      if (b < limit && suffix.length < 6) suffix += REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length];
    }
  }
  return `DB-${yyyymmdd(d)}-${suffix}`;
}

export function isOrderReference(s: string): boolean {
  return new RegExp(`^${REFERENCE_PATTERN.source}$`).test(s);
}

/** Find an order reference in e.g. a reply subject ("Re: [DB-20261006-ABC234] ..."). */
export function findOrderReference(text: string): string | null {
  const m = REFERENCE_PATTERN.exec(text.toUpperCase());
  return m ? m[0] : null;
}
