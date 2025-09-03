import { CrewPairing, DecisionRecord } from '../data/types';
import { AgentContext } from '../context';

export async function flightIngest(pairing: CrewPairing, _ctx: AgentContext, push:(r:DecisionRecord)=>void){
  push({ stage:'flightIngest', outcome:'accept', reasons:['normalized input'] });
  return pairing;
}
