import 'dotenv/config';
import express from 'express';
import { planLayover } from './orchestrator';
import { AgentContext } from './context';
import { supabaseAdmin } from './services/supabase';

const app = express();
app.use(express.json());

app.get('/health', (_req, res)=> res.json({ ok:true }));

app.post('/api/plan', async (req, res) => {
  try {
    const pairing = req.body.pairing;
    const { data: cs } = await supabaseAdmin.from('contract_constraints')
      .select('rules').eq('airline_id', pairing.airlineId).eq('active', true)
      .order('created_at', { ascending:false }).limit(1).maybeSingle();

    const ctx: AgentContext = {
      nowUtc: new Date().toISOString(),
      config: { openaiKey: process.env.OPENAI_API_KEY, mapsKey: process.env.MAPS_API_KEY },
      constraints: (cs?.rules ?? {}),
      log: (r)=>console.log('[AUDIT]', JSON.stringify(r))
    };

    const plan = await planLayover(pairing, ctx);
    res.json(plan);
  } catch (e:any) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/bookings', async (req, res)=>{
  try {
    const { pairingId, hotelId } = req.body;
    const { data: rate } = await supabaseAdmin.from('hotel_rates')
      .select('nightly, taxes_fees').eq('hotel_id', hotelId)
      .lte('valid_from', new Date().toISOString())
      .gte('valid_to', new Date().toISOString())
      .order('valid_to', { ascending:false }).limit(1).maybeSingle();

    const { data, error } = await supabaseAdmin.from('bookings')
      .insert({ pairing_id: pairingId, hotel_id: hotelId, rate_snapshot: rate||null, status:'proposed' })
      .select().single();
    if (error) throw error;
    res.json({ booking: data });
  } catch (e:any) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log(`Server listening on :${port}`));
