import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAnon() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_ANON_KEY'];
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }
  return createClient(url, key);
}

function getSupabaseAdmin() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  return createClient(url, key);
}

export const supabaseAnon = getSupabaseAnon();
export const supabaseAdmin = getSupabaseAdmin();
