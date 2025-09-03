import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate } from '../data/types';

export async function preference(cands: HotelCandidate[], ctx: AgentContext, push: (r: DecisionRecord) => void) {
  // TODO: Implement preference analysis based on crew preferences
  push({ stage: 'preference', outcome: 'accept', reasons: ['preferences not yet implemented'] });
  return cands;
}
