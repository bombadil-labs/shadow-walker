import type { MoveOutput } from '../packages/domain/src/index.ts';
export const seed = { title: 'A discovery walk', intention: 'What makes a discovery change the next question?',
  frame: { label: 'Semantic Walk', constraints: ['Do not consolidate prematurely.'] }, requestId: 'create-1' };
export function proposal(parent: string): MoveOutput {
  return { positions: [{ localId: 'arrival', kind: 'excavation', meaning: 'A comparison may reveal a mismatch rather than a reusable operation.',
    parentIds: [parent], anchors: [{id: 'a1', detail: 'The stated intention asks for discoveries to change the next question.', source: 'Original intention'}],
    structuralViews: [{label: 'Feedback', entities: ['question','finding'], relationships: ['finding redirects question'],
      invariants: ['Direction remains revisable'], applicability: 'Guided discovery', anchorIds: ['a1'], omissions: ['No observed session yet'], mismatches: []}],
    uncertainty: ['This is a hypothesis about the process, not an observation.'], nextQuestion: 'What would a mismatch invite us to ask next?',
    semanticShift: { baselineArrivalIds: [parent], summary: 'The walk shifts from generic discovery toward mismatch as a productive signal.',
      newlySalient: [{span:'mismatch',salience:'high'},{span:'redirects',salience:'medium'}], receded: [],
      preservedInvariants: ['Direction remains revisable'], unexpectedConnections: ['Mismatch can generate the next question rather than terminate the walk.'],
      newAffordances: ['Ask what the mismatch exposes.'], surprise: {level:'medium',notes:'The fixture records a path-relative walker report, not a mechanistic measurement.'} }
  }] };
}
