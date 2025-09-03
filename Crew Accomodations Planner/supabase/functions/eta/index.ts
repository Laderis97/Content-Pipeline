// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

serve(async (req) => {
  try {
    const { pairingId, airportIata, hotelIds, window, mode } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE')!);

    // Fetch airport & hotels
    const { data: airport } = await supabase.from('airports').select('lat,lon').eq('iata', airportIata).single();
    const { data: hotels } = await supabase.from('hotels').select('id,lat,lon').in('id', hotelIds);

    const rows = (hotels || []).map((h: any) => {
      const km = haversine(airport.lat, airport.lon, h.lat, h.lon);
      const minutes = Math.round((km / 30) * 60); // naive urban avg
      return {
        pairing_id: pairingId,
        hotel_id: h.id,
        airport_iata: airportIata,
        mode: mode || 'drive',
        minutes,
        distance_km: km,
        window_start: window?.startUtc || new Date().toISOString(),
        window_end: window?.endUtc || new Date().toISOString()
      };
    });

    // Upsert
    const { error } = await supabase.from('travel_times')
      .upsert(rows, { onConflict: 'pairing_id,hotel_id,mode' });
    if (error) throw error;

    return new Response(JSON.stringify(rows), { 
      status: 200, 
      headers: { 'content-type': 'application/json' } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 });
  }
});
