import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hbmanxmtzjsnbgnhdwqf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibWFueG10empzbmJnbmhkd3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Nzg5NjcsImV4cCI6MjA5MjU1NDk2N30.tHYDb7keSpBExniXGtzAcXEs5ElhkElmckF5WJrm32E';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function queryWords() {
  const targets = ['said', 'little', 'down'];
  console.log('Querying words from remote database:', targets);

  const { data, error } = await supabase
    .from('words')
    .select('word, meaning, pos, difficulty, example_en, example_ko')
    .in('word', targets);

  if (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }

  console.log('✅ Query results:', JSON.stringify(data, null, 2));
}

queryWords().catch(console.error);
