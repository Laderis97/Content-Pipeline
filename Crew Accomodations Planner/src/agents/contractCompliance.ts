import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate } from '../data/types';

export async function contractCompliance(cands: HotelCandidate[], ctx: AgentContext, push: (r: DecisionRecord) => void) {
  const C = ctx.constraints;
  const ok: HotelCandidate[] = [];
  
  for (const h of cands) {
    const reasons: string[] = [];
    
    if (C.maxCommuteMinutes && (h.etaMinutes ?? 999) > C.maxCommuteMinutes) 
      reasons.push(`ETA>${C.maxCommuteMinutes}`);
    
    if (C.minHotelRating && (h.rating ?? 0) < C.minHotelRating) 
      reasons.push(`rating<${C.minHotelRating}`);
    
    if (C.maxNightlyUsd && (h.rate?.nightly ?? 1e9) > C.maxNightlyUsd) 
      reasons.push(`rate>${C.maxNightlyUsd}`);
    
    if (C.minReviews && (h.reviews ?? 0) < C.minReviews) 
      reasons.push(`reviews<${C.minReviews}`);
    
    if (reasons.length) {
      push({ stage: 'contractCompliance', subjectId: h.id, outcome: 'reject', reasons });
    } else {
      push({ stage: 'contractCompliance', subjectId: h.id, outcome: 'accept', reasons: ['compliant'] });
      ok.push(h);
    }
  }
  
  return ok;
}
