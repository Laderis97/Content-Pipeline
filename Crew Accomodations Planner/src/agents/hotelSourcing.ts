import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate, CrewPairing } from '../data/types';
import { supabaseAdmin } from '../services/supabase';

export async function hotelSourcing(pairing: CrewPairing, _ctx: AgentContext, push:(r:DecisionRecord)=>void): Promise<HotelCandidate[]> {
  const { data, error } = await supabaseAdmin.rpc('get_viable_hotels', { p_pairing: pairing.id });
  if (error) throw error;
  
  const cands: HotelCandidate[] = (data||[]).map((r:any)=>({
    id: r.hotel_id, 
    name: r.name, 
    brand: r.brand,
    lat: 0, // Will be filled from hotels table if needed
    lon: 0, // Will be filled from hotels table if needed
    etaMinutes: r.eta_minutes, 
    distanceKm: r.distance_km, 
    rating: r.rating,
    rate: r.nightly? { hotelId: r.hotel_id, currency: 'USD', nightly: r.nightly } : undefined
  }));
  
  push({ stage: 'hotelSourcing', outcome: 'score', score: cands.length, reasons: [`found ${cands.length} hotels`] });
  return cands;
}
