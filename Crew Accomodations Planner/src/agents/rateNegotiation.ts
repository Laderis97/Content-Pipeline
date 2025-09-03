import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate } from '../data/types';

export async function rateNegotiation(cands: HotelCandidate[], ctx: AgentContext, push: (r: DecisionRecord) => void) {
  // TODO: Implement rate negotiation logic
  push({ stage: 'rateNegotiation', outcome: 'accept', reasons: ['rate negotiation not yet implemented'] });
  return cands;
}
