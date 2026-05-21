import fs from 'fs';
import path from 'path';

const FINAL_JSON_PATH = path.resolve(__dirname, 'pipeline', 'data', 'final_words.json');
const OUTPUT_SQL_PATH = path.resolve(__dirname, '..', 'supabase', 'update_korean_words.sql');

function escapeSQL(s: string): string {
  return s.replace(/'/g, "''");
}

async function main() {
  console.log('🔄 Loading final_words.json...');
  if (!fs.existsSync(FINAL_JSON_PATH)) {
    console.error(`❌ final_words.json not found! Run Step 3 first.`);
    process.exit(1);
  }

  const words = JSON.parse(fs.readFileSync(FINAL_JSON_PATH, 'utf-8'));
  console.log(`📊 Total ${words.length} words loaded.`);

  // 한글 뜻이 제대로 들어있는 단어만 필터
  const koreanWords = words.filter((w: any) => w.word && w.meaning && /[가-힣]/.test(w.meaning));
  console.log(`👉 Prepared ${koreanWords.length} words with Korean meanings for SQL generation.`);

  let sql = `-- VocaFlow Korean Translation Restoration SQL\n`;
  sql += `-- Generated on ${new Date().toISOString()}\n\n`;

  // 효율적인 Bulk Upsert를 위해 chunk 단위로 나누어 SQL 구성
  const chunkSize = 100;
  for (let i = 0; i < koreanWords.length; i += chunkSize) {
    const chunk = koreanWords.slice(i, i + chunkSize);
    
    sql += `INSERT INTO words (word, meaning, pos, difficulty, source) VALUES\n`;
    const rows = chunk.map((w: any) => {
      return `  ('${escapeSQL(w.word)}', '${escapeSQL(w.meaning)}', '${escapeSQL(w.pos)}', ${w.difficulty}, '${escapeSQL(w.source)}')`;
    });
    sql += rows.join(',\n') + '\n';
    sql += `ON CONFLICT (word) DO UPDATE SET\n`;
    sql += `  meaning = EXCLUDED.meaning,\n`;
    sql += `  pos = EXCLUDED.pos,\n`;
    sql += `  difficulty = EXCLUDED.difficulty,\n`;
    sql += `  source = EXCLUDED.source;\n\n`;
  }

  fs.writeFileSync(OUTPUT_SQL_PATH, sql);
  console.log(`\n🎉 Generated SQL file successfully!`);
  console.log(`💾 Saved to: ${OUTPUT_SQL_PATH}`);
  console.log(`👉 File size: ${(fs.statSync(OUTPUT_SQL_PATH).size / 1024).toFixed(2)} KB`);
}

main().catch(console.error);
