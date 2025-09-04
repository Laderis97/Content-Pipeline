import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate, CrewPairing } from '../data/types';

export async function hotelSourcing(pairing: CrewPairing, _ctx: AgentContext, push:(r:DecisionRecord)=>void): Promise<HotelCandidate[]> {
  // Use remote Supabase instance directly
  const supabaseUrl = 'https://lekngtmdgewbppxtbypw.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxla25ndG1kZ2V3YnBweHRieXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4Mzk1NjUsImV4cCI6MjA3MjQxNTU2NX0.KtEKrTmAR3StHEJxRlzmZvAqFQm2NZmmyGrUeCqnKXA';
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_viable_hotels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey
      },
      body: JSON.stringify({ p_pairing: pairing.id })
    });

    if (response.ok) {
      const data = await response.json();
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
    } else {
      throw new Error(`Hotel sourcing failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Error calling hotel sourcing:', error);
    throw error;
  }
}
