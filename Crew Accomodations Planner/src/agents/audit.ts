import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate } from '../data/types';

export async function audit(cands: HotelCandidate[], ctx: AgentContext, push: (r: DecisionRecord) => void) {
  // TODO: Implement final audit and validation
  push({ stage: 'audit', outcome: 'accept', reasons: ['audit not yet implemented'] });
  return cands;
}
