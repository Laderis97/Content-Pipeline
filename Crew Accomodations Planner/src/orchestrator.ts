import { AgentContext } from './context';
import { CrewPairing, PlanResult, DecisionRecord, HotelCandidate } from './data/types';
import { flightIngest } from './agents/flightIngest';
import { cityContext } from './agents/cityContext';
import { hotelSourcing } from './agents/hotelSourcing';
import { geoDistance } from './agents/geoDistance';
import { contractCompliance } from './agents/contractCompliance';
import { scheduleOptimizer } from './agents/scheduleOptimizer';

export async function planLayover(pairing: CrewPairing, ctx: AgentContext): Promise<PlanResult> {
  const audit: DecisionRecord[] = [];
  const push = (r: DecisionRecord) => { audit.push(r); ctx.log(r); };

  const normalized = await flightIngest(pairing, ctx, push);
  const city = await cityContext(normalized, ctx, push);
  const sourced = await hotelSourcing(normalized, ctx, push);
  const withTimes: HotelCandidate[] = await geoDistance(normalized, sourced, ctx, push);
  const compliant = await contractCompliance(withTimes, ctx, push);
  const chosen = await scheduleOptimizer(compliant, ctx, push);

  return { city: city.city, arrAirport: city.arrAirport, candidates: compliant, chosen, audit };
}
