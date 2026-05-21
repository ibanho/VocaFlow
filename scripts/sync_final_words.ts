import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hbmanxmtzjsnbgnhdwqf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibWFueG10empzbmJnbmhkd3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Nzg5NjcsImV4cCI6MjA5MjU1NDk2N30.tHYDb7keSpBExniXGtzAcXEs5ElhkElmckF5WJrm32E';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const FINAL_JSON_PATH = path.resolve(__dirname, 'pipeline', 'data', 'final_words.json');

async function syncWords() {
  console.log('🔄 Checking final_words.json file...');
  if (!fs.existsSync(FINAL_JSON_PATH)) {
    console.error(`❌ final_words.json not found at: ${FINAL_JSON_PATH}`);
    process.exit(1);
  }

  const fileData = fs.readFileSync(FINAL_JSON_PATH, 'utf-8');
  const words = JSON.parse(fileData);
  console.log(`📊 Loaded ${words.length} words from final_words.json`);

  // 의미(meaning) 필드가 유효한 단어들만 필터
  const validWords = words.filter((w: any) => w.word && w.meaning);
  console.log(`👉 Prepared ${validWords.length} words to sync (upsert)`);

  const chunkSize = 100;
  let successCount = 0;

  for (let i = 0; i < validWords.length; i += chunkSize) {
    const chunk = validWords.slice(i, i + chunkSize);
    const payload = chunk.map((w: any) => ({
      word: w.word,
      meaning: w.meaning,
      pos: w.pos,
      difficulty: w.difficulty,
      source: w.source,
    }));

    const { error } = await supabase
      .from('words')
      .upsert(payload, { onConflict: 'word' });

    if (error) {
      console.error(`❌ Error upserting chunk ${i / chunkSize + 1}:`, error);
    } else {
      successCount += payload.length;
      console.log(`✅ Synced chunk ${i / chunkSize + 1} (${successCount}/${validWords.length} words)`);
    }
  }

  console.log(`\n🎉 DB Sync finished! Successfully updated ${successCount} words.`);
}

syncWords().catch(console.error);
