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

async function listProgress() {
  console.log('--- Checking user_progress table ---');
  try {
    const { data, error, status } = await supabase
      .from('user_progress')
      .select('*')
      .limit(10);
    
    if (error) {
      console.log('❌ Failed to fetch user_progress!');
      console.log('Status:', status);
      console.log('Error:', error);
    } else {
      console.log('✅ Fetch successful!');
      console.log('Count:', data.length);
      console.log('Sample progress records:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

listProgress();
