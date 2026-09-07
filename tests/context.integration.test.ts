import { test, expect } from 'vitest';
import { outputs, snapshot } from '../packages/protocol/src/index.ts';
import { Store } from '../packages/storage/src/index.ts';
import { seed } from './fixtures.ts';

// These exercise the actual Zod contracts, not a local substitute for the SDK.
// They require installing package.json dependencies; see docs/bounded-context.md.
test('the protocol preserves context-budget and omission metadata', () => {
  const store = new Store();
  try {
    const initial = store.create(seed);
    const packet = store.prepare({ explorationId: initial.exploration.id,
      selectedIds: [initial.exploration.rootId], humanDirection: 'One move only.', requestId: 'context-packet' });
    expect(outputs.packet.packet.parse(packet)).toEqual(packet);
    expect(snapshot.parse(store.read(initial.exploration.id)).activeMove?.context).toEqual(packet.context);
    expect(packet.context?.limits.maxOutputBytes).toBe(65536);
    expect(packet.context?.paths.complete).toBe(true);
    expect(packet.context?.reserves.omitted).toBe(0);
    expect(() => outputs.packet.packet.parse({ ...packet,
      context: { ...packet.context, unexpected: 'must not be silently discarded' } })).toThrow();
  } finally { store.close(); }
});

test('the protocol still reads legacy packets with no context summary', () => {
  const store = new Store();
  try {
    const initial = store.create(seed);
    const packet = store.prepare({ explorationId: initial.exploration.id,
      selectedIds: [initial.exploration.rootId], humanDirection: 'One move only.', requestId: 'legacy-packet' });
    delete packet.context;
    expect(outputs.packet.packet.parse(packet)).toEqual(packet);
    expect(snapshot.parse({ ...store.read(initial.exploration.id), activeMove: packet }).activeMove?.context).toBeUndefined();
  } finally { store.close(); }
});
