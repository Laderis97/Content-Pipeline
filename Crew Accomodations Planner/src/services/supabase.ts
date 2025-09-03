import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

export const supabaseAnon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
export const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
