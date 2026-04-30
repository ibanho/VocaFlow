import { dummyWords } from './seeds/dummy';
import fs from 'fs';

const sqlLines = dummyWords.map(w => 
  `INSERT INTO words (word, meaning, pos, difficulty, source) VALUES ('${w.word.replace(/'/g, "''")}', '${w.meaning.replace(/'/g, "''")}', '${w.pos}', ${w.difficulty}, '${w.source}') ON CONFLICT (word) DO NOTHING;`
);

fs.writeFileSync('supabase/seed_dummy.sql', sqlLines.join('\n'));
console.log('Created seed_dummy.sql');
