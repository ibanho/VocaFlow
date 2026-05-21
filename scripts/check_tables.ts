import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function checkTables() {
  console.log('--- 1. Checking dictionary_cache table ---');
  try {
    const { data, error, status } = await supabase
      .from('dictionary_cache')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ dictionary_cache Table Check Failed!');
      console.log('Status:', status);
      console.log('Error:', error);
    } else {
      console.log('✅ dictionary_cache Table exists!');
      console.log('Data sample:', data);
    }
  } catch (err) {
    console.error('Unexpected error checking dictionary_cache:', err);
  }

  console.log('\n--- 2. Checking review_logs table ---');
  try {
    const { data, error, status } = await supabase
      .from('review_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ review_logs Table Check Failed!');
      console.log('Status:', status);
      console.log('Error:', error);
    } else {
      console.log('✅ review_logs Table exists!');
      console.log('Data sample:', data);
    }
  } catch (err) {
    console.error('Unexpected error checking review_logs:', err);
  }
}

checkTables();
