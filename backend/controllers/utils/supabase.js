import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_KEY/SUPABASE_ANON_KEY is missing from .env. Supabase client will not be initialized.');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export default supabase;
