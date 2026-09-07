import { requireThat } from './index.ts';
import type { Draft, MovePacket, Position } from './index.ts';
import { jsonByteLength, WALK_LIMITS } from './limits.ts';

export type MoveContext = {
  limits: {
    maxOutputBytes: number;
    maxPacketBytes: number;
    maxPathsPerInput: number;
    maxPathDepth: number;
    maxAncestorVisitsPerInput: number;
    maxReservedDrafts: number;
  };
  paths: { complete: boolean; included: number; truncatedInputIds: string[] };
  reserves: { total: number; included: number; omitted: number };
};

/**
 * Return only complete root-to-input paths. A bounded preview is not the graph:
 * omitted paths remain in storage, and every omission is explicitly reported.
 * Each input gets its own budget, so a branching input cannot starve the others.
 * Iteration (rather than recursion) also bounds stack use on very deep walks.
 */
export function collectAncestryPaths(
  selected: readonly Position[],
  byId: ReadonlyMap<string, Position>,
): { orderedPaths: string[][]; truncatedInputIds: string[] } {
  const orderedPaths: string[][] = [];
  const truncatedInputIds: string[] = [];
  for (const input of selected) {
    const pending = [{ id: input.id, reversePath: [] as string[] }];
    let visited = 0;
    let included = 0;
    let truncated = false;
    while (pending.length > 0) {
      if (included >= WALK_LIMITS.maxPathsPerInput || visited >= WALK_LIMITS.maxAncestorVisitsPerInput) {
        truncated = true;
        break;
      }
      const { id, reversePath } = pending.pop()!;
      requireThat(!reversePath.includes(id), 'CYCLE', 'Stored ancestry contains a cycle.');
      const position = byId.get(id);
      requireThat(position && position.explorationId === input.explorationId,
        'INVALID_PARENT', 'Stored ancestry has a missing or cross-exploration parent.');
      visited++;
      const path = [...reversePath, id];
      if (position.parentIds.length === 0) {
        orderedPaths.push(path.reverse());
        included++;
      } else if (path.length >= WALK_LIMITS.maxPathDepth) {
        // Do not present a cut-off path as a complete path from the root.
        truncated = true;
      } else {
        // Reverse push preserves the recorded parent order under a LIFO traversal.
        for (let i = position.parentIds.length - 1; i >= 0; i--) {
          pending.push({ id: position.parentIds[i]!, reversePath: path });
        }
      }
    }
    if (truncated) truncatedInputIds.push(input.id);
  }
  return { orderedPaths, truncatedInputIds };
}

/**
 * Keep required context verbatim; budget only ancestry/reserve previews. If the
 * required context itself cannot fit, fail before a move or receipt is saved.
 * Only the four newest-created reserves are considered; there is no unbounded
 * search through old drafts for smaller candidates that happen to fit.
 */
export function boundMoveContext(
  required: Omit<MovePacket, 'orderedPaths' | 'reserves' | 'context'>,
  byId: ReadonlyMap<string, Position>,
  reserves: readonly Draft[],
): MovePacket & { context: MoveContext } {
  const ancestry = collectAncestryPaths(required.selectedInputs, byId);
  const omittedInputs = new Set(ancestry.truncatedInputIds);
  const context: MoveContext = {
    limits: {
      maxOutputBytes: WALK_LIMITS.maxOutputBytes,
      maxPacketBytes: WALK_LIMITS.maxPacketBytes,
      maxPathsPerInput: WALK_LIMITS.maxPathsPerInput,
      maxPathDepth: WALK_LIMITS.maxPathDepth,
      maxAncestorVisitsPerInput: WALK_LIMITS.maxAncestorVisitsPerInput,
      maxReservedDrafts: WALK_LIMITS.maxReservedDrafts,
    },
    paths: { complete: omittedInputs.size === 0, included: ancestry.orderedPaths.length,
      truncatedInputIds: [...omittedInputs] },
    reserves: { total: reserves.length, included: 0, omitted: reserves.length },
  };
  const packet: MovePacket & { context: MoveContext } = {
    ...required, orderedPaths: ancestry.orderedPaths, reserves: [], context,
  };
  // Preview paths are optional; selected findings and their direct parents are not.
  while (jsonByteLength(packet) > WALK_LIMITS.maxPacketBytes && packet.orderedPaths.length > 0) {
    const removed = packet.orderedPaths.pop()!;
    omittedInputs.add(removed[removed.length - 1]!);
    context.paths = { complete: false, included: packet.orderedPaths.length,
      truncatedInputIds: required.selectedInputs.map(p => p.id).filter(id => omittedInputs.has(id)) };
  }
  requireThat(jsonByteLength(packet) <= WALK_LIMITS.maxPacketBytes, 'CONTEXT_BUDGET_EXCEEDED',
    'Required context exceeds the move-packet byte budget. Select fewer positions or shorten the direction; nothing was saved.');

  for (const reserve of reserves.slice(-WALK_LIMITS.maxReservedDrafts).reverse()) {
    packet.reserves.push(reserve);
    context.reserves.included = packet.reserves.length;
    context.reserves.omitted = reserves.length - packet.reserves.length;
    if (jsonByteLength(packet) > WALK_LIMITS.maxPacketBytes) {
      packet.reserves.pop();
      context.reserves.included = packet.reserves.length;
      context.reserves.omitted = reserves.length - packet.reserves.length;
    }
  }
  return packet;
}
