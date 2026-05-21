import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hbmanxmtzjsnbgnhdwqf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibWFueG10empzbmJnbmhkd3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Nzg5NjcsImV4cCI6MjA5MjU1NDk2N30.tHYDb7keSpBExniXGtzAcXEs5ElhkElmckF5WJrm32E';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function findUntranslated() {
  console.log('Fetching all words from Supabase...');
  const { data, error } = await supabase
    .from('words')
    .select('word, meaning, pos, difficulty, source');

  if (error) {
    console.error('❌ Failed to fetch words:', error);
    process.exit(1);
  }

  console.log(`Total words in DB: ${data.length}`);

  // 한글(가-힣)이 포함되지 않은 단어 필터링
  const untranslated = data.filter(w => {
    if (!w.meaning) return true;
    return !/[가-힣]/.test(w.meaning);
  });

  console.log(`❌ Untranslated (no Korean) words count: ${untranslated.length}`);
  if (untranslated.length > 0) {
    console.log('Sample untranslated words:');
    console.log(JSON.stringify(untranslated.slice(0, 50), null, 2));
  }
}

findUntranslated().catch(console.error);
