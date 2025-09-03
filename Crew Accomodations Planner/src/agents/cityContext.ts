import { AgentContext } from '../context';
import { CrewPairing, DecisionRecord } from '../data/types';

export async function cityContext(pairing: CrewPairing, _ctx: AgentContext, push:(r:DecisionRecord)=>void){
  const lastLeg = pairing.legs[pairing.legs.length-1];
  const city = { city: lastLeg.arrIata, arrAirport: lastLeg.arrIata };
  push({ stage:'cityContext', outcome:'accept', reasons:[`arrival ${city.arrAirport}`], details: city });
  return city;
}
