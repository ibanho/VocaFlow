import { createClient } from '@supabase/supabase-js';
import { dummyWords } from './seeds/dummy';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('Starting seed import...');

  let successCount = 0;
  let errorCount = 0;

  for (const wordObj of dummyWords) {
    const { word, meaning, pos, difficulty, source } = wordObj;

    const { error } = await supabase
      .from('words')
      .upsert(
        {
          word,
          meaning,
          pos,
          difficulty,
          source,
        },
        { onConflict: 'word' }
      );

    if (error) {
      console.error(`Failed to insert word: ${word}`, error);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\nImport completed.`);
  console.log(`Success: ${successCount}, Errors: ${errorCount}`);
}

main().catch(console.error);
