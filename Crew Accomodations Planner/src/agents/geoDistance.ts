import { AgentContext } from '../context';
import { DecisionRecord, HotelCandidate, CrewPairing } from '../data/types';

export async function geoDistance(pairing: CrewPairing, hotels: HotelCandidate[], ctx: AgentContext, push:(r:DecisionRecord)=>void){
  if (!hotels.length) return hotels;
  const hotelIds = hotels.map(h=>h.id);
  const window = { startUtc: ctx.nowUtc, endUtc: ctx.nowUtc };
  const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/eta`, {
    method:'POST', 
    headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}` },
    body: JSON.stringify({ pairingId: pairing.id, airportIata: pairing.legs.at(-1)!.arrIata, hotelIds, window, mode:'drive' })
  });
  if (!res.ok) throw new Error(`eta edge failed: ${res.status}`);
  const rows = await res.json();
  rows.forEach((r:any)=> push({ stage:'geoDistance', subjectId:r.hotel_id, outcome:'score', score:r.minutes, reasons:[`ETA ${r.minutes}m`] }));
  return hotels;
}
