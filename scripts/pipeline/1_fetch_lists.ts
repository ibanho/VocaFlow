/**
 * [Step 1] CEFR-J 공식 Wordlist 기반 시드 수집
 * PRD 9.4 [1]: CEFR-J → 시드 임포트 (difficulty 자동 태깅)
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, 'data');
const OUT = path.resolve(DATA_DIR, 'base_words.json');

const CEFRJ_URL = 'https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv';

// CEFR → difficulty 매핑
const CEFR_MAP: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };

// 학습 불필요 품사
const SKIP_POS = new Set(['determiner', 'be-verb', 'pronoun', 'number']);

// 기능어 필터
const STOP = new Set([
  'the','a','an','and','or','but','if','so','yet','for','nor',
  'at','by','in','of','on','to','up','as','is','am','are','was','were',
  'be','been','being','do','did','does','done','doing',
  'have','has','had','having','will','would','shall','should',
  'can','could','may','might','must',
  'i','me','my','mine','we','us','our','ours',
  'you','your','yours','he','him','his','she','her','hers',
  'it','its','they','them','their','theirs',
  'this','that','these','those','who','whom','whose','which','what',
  'not','no','yes','all','both','each','every','some','any','few',
  'more','most','other','another',
]);

interface BaseWord { word: string; difficulty: number; source: string; pos: string; }

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('[1] Fetching CEFR-J Wordlist v1.5...');
  const res = await fetch(CEFRJ_URL);
  if (!res.ok) throw new Error('Failed to fetch CEFR-J CSV');
  const csv = await res.text();

  const lines = csv.split('\n').map(l => l.trim()).filter(l => l);
  // Skip header: headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold
  const seen = new Set<string>();
  const words: BaseWord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const rawWord = (cols[0] || '').trim().toLowerCase();
    const pos = (cols[1] || '').trim().toLowerCase();
    const cefr = (cols[2] || '').trim().toUpperCase();

    // 슬래시로 된 변형어 → 첫 번째만
    const word = rawWord.split('/')[0].replace(/[^a-z]/g, '');
    if (!word || word.length < 3) continue;
    if (SKIP_POS.has(pos)) continue;
    if (STOP.has(word)) continue;
    if (seen.has(word)) continue;
    if (!CEFR_MAP[cefr]) continue;

    seen.add(word);
    words.push({
      word,
      difficulty: CEFR_MAP[cefr],
      source: 'CEFR-J',
      pos: pos === 'adjective' ? 'adj' : pos,
    });
  }

  // Sort by difficulty
  words.sort((a, b) => a.difficulty - b.difficulty);

  fs.writeFileSync(OUT, JSON.stringify(words, null, 2));
  console.log(`[1] Saved ${words.length} CEFR-J words → ${OUT}`);
  console.log(`    A1(1): ${words.filter(w=>w.difficulty===1).length}`);
  console.log(`    A2(2): ${words.filter(w=>w.difficulty===2).length}`);
  console.log(`    B1(3): ${words.filter(w=>w.difficulty===3).length}`);
  console.log(`    B2(4): ${words.filter(w=>w.difficulty===4).length}`);
}

main().catch(console.error);
