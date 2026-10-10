/**
 * Document ids for records the phone creates (problem reports, message posts).
 * Shape: `<prefix>-<yyyymmdd>-<hhmmss>-<4 of a-z0-9>`, matching the Worker's checks
 * (apps/api/src/feedback.ts and messages.ts).
 *
 * The 4-character tail comes from crypto.getRandomValues with rejection sampling,
 * so every character is equally likely and the tail cannot be predicted from
 * earlier ids. Math.random was used before; it is neither unpredictable nor
 * uniform here (short strings were padded with '0').
 */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const LIMIT = 252 // largest multiple of 36 that fits in a byte; bytes at or above it are dropped

export type RandomBytes = (n: number) => Uint8Array

const cryptoBytes: RandomBytes = (n) => crypto.getRandomValues(new Uint8Array(n))

export function randomTail(length = 4, bytes: RandomBytes = cryptoBytes): string {
  let out = ''
  while (out.length < length) {
    for (const b of bytes(length * 2)) {
      if (b < LIMIT) out += ALPHABET[b % 36]
      if (out.length === length) break
    }
  }
  return out
}

export function docId(prefix: string, now: Date = new Date(), bytes: RandomBytes = cryptoBytes): string {
  const iso = now.toISOString()
  return `${prefix}-${iso.slice(0, 10).replaceAll('-', '')}-${iso.slice(11, 19).replaceAll(':', '')}-${randomTail(4, bytes)}`
}
