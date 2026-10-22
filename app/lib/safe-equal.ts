/**
 * Constant-time string comparison (pure JS — safe to use from the edge
 * proxy as well as Node routes). Length difference is folded into the
 * accumulator so the loop always runs over the longer input.
 */
export function safeEqualStr(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let diff = ba.length ^ bb.length;
  const len = Math.max(ba.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}
