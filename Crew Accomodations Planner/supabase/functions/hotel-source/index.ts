// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { airlineId, hotels } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE')!);

    if (hotels?.length) {
      const mapped = hotels.map((h:any)=>({
        id: h.id, airline_id: airlineId, name: h.name, brand: h.brand,
        address: h.address, city: h.city, lat: h.lat, lon: h.lon,
        rating: h.rating, reviews: h.reviews, active: true
      }));
      const { error: he } = await supabase.from('hotels').upsert(mapped, { onConflict: 'id' });
      if (he) throw he;

      const rates = hotels.flatMap((h:any)=> h.rate ? [{
        hotel_id: h.id, nightly: h.rate.nightly, taxes_fees: h.rate.taxesFees,
        valid_from: new Date(), valid_to: new Date(new Date().getTime()+7*86400000)
      }] : []);
      if (rates.length) {
        const { error: re } = await supabase.from('hotel_rates').insert(rates);
        if (re) throw re;
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 });
  }
});
