import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate, CrewPairing } from '../data/types';
import { supabaseAdmin } from '../services/supabase';

export async function geoDistance(pairing: CrewPairing, hotels: HotelCandidate[], ctx: AgentContext, push:(r:DecisionRecord)=>void) {
  if (!hotels.length) return hotels;
  
  // For now, just return the hotels as-is since we have travel times in the database
  // In production, this would call the Edge Function to compute/update ETAs
  push({
    stage: 'geoDistance',
    outcome: 'accept',
    reasons: ['using cached travel times from database']
  });
  
  return hotels;
}
