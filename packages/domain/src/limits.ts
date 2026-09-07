/** Application policy, independent of a transport's separate request-body limit. */
export const WALK_LIMITS = Object.freeze({
  maxOutputBytes: 64 * 1024,
  maxPacketBytes: 256 * 1024,
  maxPathsPerInput: 8,
  maxPathDepth: 64,
  maxAncestorVisitsPerInput: 2048,
  maxReservedDrafts: 4,
});

/** Count serialized UTF-8 bytes, not JavaScript's UTF-16 code units. */
export function jsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
