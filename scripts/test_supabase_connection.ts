import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- Env Verification ---');
console.log(`URL: ${SUPABASE_URL || 'Missing'}`);
console.log(`KEY: ${SUPABASE_KEY ? `${SUPABASE_KEY.slice(0, 10)}...${SUPABASE_KEY.slice(-10)}` : 'Missing'}`);
console.log('------------------------');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function testConnection() {
  console.log('Connecting to Supabase...');
  
  // 1. 간단하게 words 테이블에서 1개의 레코드를 가져옵니다.
  const { data, error, status } = await supabase
    .from('words')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Connection Failed!');
    console.error(`HTTP Status: ${status}`);
    console.error('Error Details:', error);
    process.exit(1);
  }

  console.log('✅ Connection Successful!');
  console.log(`HTTP Status: ${status}`);
  console.log('Sample Data Retrieved:', data);
}

testConnection().catch((err) => {
  console.error('❌ Unexpected Error during connection test:', err);
  process.exit(1);
});
