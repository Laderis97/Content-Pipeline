import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate } from '../data/types';
import { scoreHotel } from '../scoring';

export async function scheduleOptimizer(cands: HotelCandidate[], ctx: AgentContext, push: (r: DecisionRecord) => void) {
  const scored = cands.map(h => ({ h, s: scoreHotel(h) }));
  scored.sort((a, b) => b.s - a.s);
  
  const top = scored[0]?.h;
  if (top) push({ stage: 'scheduleOptimizer', subjectId: top.id, outcome: 'accept', reasons: ['top score'] });
  
  return top;
}
