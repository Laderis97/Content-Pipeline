import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate, CrewPairing } from '../data/types';
import { supabaseAdmin } from '../services/supabase';

export async function geoDistance(pairing: CrewPairing, hotels: HotelCandidate[], ctx: AgentContext, push:(r:DecisionRecord)=>void) {
  if (!hotels.length) return hotels;

  // Call the deployed Supabase Edge Function to get ETAs
  const supabaseUrl = 'https://lekngtmdgewbppxtbypw.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxla25ndG1kZ2V3YnBweHRieXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4Mzk1NjUsImV4cCI6MjA3MjQxNTU2NX0.KtEKrTmAR3StHEJxRlzmZvAqFQm2NZmmyGrUeCqnKXA';
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/eta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        pairing_id: pairing.id,
        hotels: hotels.map(h => ({ id: h.id, lat: h.lat, lon: h.lon }))
      })
    });

    if (response.ok) {
      const data = await response.json();
      const updatedHotels = hotels.map(h => {
        const eta = data.etas?.find((e: any) => e.hotel_id === h.id);
        return eta ? { ...h, etaMinutes: eta.eta_minutes, distanceKm: eta.distance_km } : h;
      });
      
      push({
        stage: 'geoDistance',
        outcome: 'accept',
        reasons: ['ETAs calculated via Edge Function']
      });
      
      return updatedHotels;
    } else {
      throw new Error(`ETA edge failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Error calling ETA Edge Function:', error);
    push({
      stage: 'geoDistance',
      outcome: 'accept',
      reasons: ['falling back to cached travel times due to Edge Function error']
    });
    return hotels;
  }
}
