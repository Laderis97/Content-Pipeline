import 'dotenv/config';
import express from 'express';
import { planLayover } from './orchestrator';
import { AgentContext } from './context';

const app = express();
app.use(express.json());

// Remote Supabase configuration
const supabaseUrl = 'https://lekngtmdgewbppxtbypw.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxla25ndG1kZ2V3YnBweHRieXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4Mzk1NjUsImV4cCI6MjA3MjQxNTU2NX0.KtEKrTmAR3StHEJxRlzmZvAqFQm2NZmmyGrUeCqnKXA';

app.get('/health', (_req, res) => {
  res.json({ ok: true });
  return;
});

app.post('/api/plan', async (req, res) => {
  try {
    const pairing = req.body.pairing;
    
    // Get contract constraints from remote Supabase
    const constraintsResponse = await fetch(`${supabaseUrl}/rest/v1/contract_constraints?airline_id=eq.${pairing.airlineId}&active=eq.true&order=created_at.desc&limit=1`, {
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey
      }
    });
    
    let constraints = {};
    if (constraintsResponse.ok) {
      const constraintsData = await constraintsResponse.json();
      if (constraintsData.length > 0) {
        constraints = constraintsData[0].rules || {};
      }
    }

    const ctx: AgentContext = {
      nowUtc: new Date().toISOString(),
      config: { openaiKey: process.env['OPENAI_API_KEY'], mapsKey: process.env['MAPS_API_KEY'] },
      constraints,
      log: (r) => console.log('[AUDIT]', JSON.stringify(r))
    };

    const plan = await planLayover(pairing, ctx);
    res.json(plan);
    return;
  } catch (e: any) {
    res.status(500).json({ error: String(e) });
    return;
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { pairingId, hotelId } = req.body;
    
    // Get hotel rate from remote Supabase
    const rateResponse = await fetch(`${supabaseUrl}/rest/v1/hotel_rates?hotel_id=eq.${hotelId}&valid_from=lte.${new Date().toISOString()}&valid_to=gte.${new Date().toISOString()}&order=valid_to.desc&limit=1`, {
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey
      }
    });
    
    let rate = null;
    if (rateResponse.ok) {
      const rateData = await rateResponse.json();
      if (rateData.length > 0) {
        rate = rateData[0];
      }
    }

    // Create booking in remote Supabase
    const bookingResponse = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey
      },
      body: JSON.stringify({
        pairing_id: pairingId,
        hotel_id: hotelId,
        rate_snapshot: rate,
        status: 'proposed'
      })
    });

    if (bookingResponse.ok) {
      const booking = await bookingResponse.json();
      res.json({ booking });
    } else {
      throw new Error(`Failed to create booking: ${bookingResponse.status}`);
    }
    return;
  } catch (e: any) {
    res.status(500).json({ error: String(e) });
    return;
  }
});

const port = process.env['PORT'] || 8080;
app.listen(port, () => console.log(`Server listening on :${port}`));
