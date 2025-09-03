import { Constraints } from './data/types';

export interface AgentContext {
  nowUtc: string;
  config: { openaiKey?: string; mapsKey?: string; };
  constraints: Constraints;
  log: (rec: any) => void;
}
