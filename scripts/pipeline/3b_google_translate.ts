/**
 * [Step 3b] Google Translate API로 영영 뜻 → 한글 번역
 * 
 * 특징:
 *   - API 키가 필요 없는 무료 우회 엔드포인트(gtx) 활용
 *   - .env.local에 의존하지 않으므로 설정 번거로움 없음
 *   - 50개 단어마다 중간 저장 및 진행률 백업 제공 -> 안전한 재시작 가능
 *   - rate limit 회피를 위해 안전한 간격(500ms) 유지
 * 
 * 실행: bun run scripts/pipeline/3b_google_translate.ts
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, 'data');
const FINAL = path.resolve(DATA_DIR, 'final_words.json');
const BACKUP = path.resolve(DATA_DIR, 'final_words.backup.json');
const PROGRESS = path.resolve(DATA_DIR, 'google_progress.json');

const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=';
const BATCH_DELAY_MS = 500;  // 구글 rate limit 안전 마진
const SAVE_INTERVAL = 50;    // 50개마다 중간 저장

interface FinalWord {
  word: string;
  meaning: string;
  pos: string;
  difficulty: number;
  source: string;
  corpus_freq: number;
  definition_en?: string;
  phonetic?: string;
  synonyms?: string[];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Google 번역 호출
 */
async function translateWithGoogle(text: string): Promise<string | null> {
  try {
    const url = GOOGLE_URL + encodeURIComponent(text);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!res.ok) {
      console.error(`  Google error ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json() as any;
    // [[["포기하다","abandon",null,null,1]],null,"en"] 형태로 들어오므로 안전하게 파싱
    const translatedText = data?.[0]?.[0]?.[0];
    return translatedText || null;
  } catch (e) {
    console.error(`  Google fetch error:`, e);
    return null;
  }
}

/**
 * 영어 단어 + 영영 정의 → 번역용 텍스트 구성
 */
function buildTranslationInput(word: string, defEn?: string): string {
  if (defEn && defEn.length > 5) {
    const trimmed = defEn.length > 60 ? defEn.slice(0, 60) : defEn;
    return trimmed;
  }
  return word;
}

/**
 * 번역 결과 정제
 */
function cleanTranslation(raw: string): string {
  let cleaned = raw
    .replace(/\.$/, '')        // 끝 마침표 제거
    .replace(/^"(.*)"$/, '$1') // 따옴표 제거
    .trim();

  // "포기하다: 완전히 포기하다" 형태에서 앞부분만 남기기
  if (cleaned.includes(':')) {
    const split = cleaned.split(':');
    cleaned = split[0].trim();
  }

  // 너무 길면 첫 번째 의미만
  if (cleaned.length > 30) {
    const parts = cleaned.split(/[,;]/);
    cleaned = parts[0].trim();
  }

  return cleaned;
}

async function main() {
  console.log('🌐 [3b] Google 무료 API 한글 번역 시작');

  if (!fs.existsSync(FINAL)) {
    console.error(`❌ ${FINAL} 파일이 없습니다. 먼저 3_translate_merge.ts를 실행하세요.`);
    process.exit(1);
  }

  const words: FinalWord[] = JSON.parse(fs.readFileSync(FINAL, 'utf-8'));

  // 백업 생성 (최초 1회)
  if (!fs.existsSync(BACKUP)) {
    fs.writeFileSync(BACKUP, JSON.stringify(words, null, 2));
    console.log(`  📦 백업 생성: ${path.basename(BACKUP)}`);
  }

  // 한글이 아닌 뜻을 가진 단어 필터 (영영 정의만 있거나 빈 값)
  const needsKorean = words.filter(w => {
    if (!w.meaning) return true;
    return !/[가-힣]/.test(w.meaning);
  });

  // 중간 저장에서 복구
  let startIdx = 0;
  if (fs.existsSync(PROGRESS)) {
    const prog = JSON.parse(fs.readFileSync(PROGRESS, 'utf-8'));
    startIdx = prog.lastIndex || 0;
    console.log(`  ♻️ 이전 진행 복구: ${startIdx}/${needsKorean.length}부터 재개`);
  }

  console.log(`  📊 총 ${words.length}개 중 ${needsKorean.length}개 한글 번역 필요`);

  let translated = 0;
  let failed = 0;
  let consecutiveErrors = 0;

  for (let i = startIdx; i < needsKorean.length; i++) {
    const fw = needsKorean[i];
    const input = buildTranslationInput(fw.word, fw.definition_en || fw.meaning);
    const result = await translateWithGoogle(input);

    if (result) {
      fw.meaning = cleanTranslation(result);
      translated++;
      consecutiveErrors = 0;
      
      // 콘솔 로그 출력 (간소화)
      console.log(`  [${i + 1}/${needsKorean.length}] 번역 완료: ${fw.word} -> ${fw.meaning}`);
    } else {
      failed++;
      consecutiveErrors++;

      // 연속 5회 실패 → API 문제로 판단하고 중단
      if (consecutiveErrors >= 5) {
        console.error(`\n  ⛔ 연속 ${consecutiveErrors}회 실패 — 중단합니다.`);
        console.error('     네트워크 및 Rate Limit 차단 상태를 확인하세요.');
        // 중간 저장
        fs.writeFileSync(PROGRESS, JSON.stringify({ lastIndex: i }));
        fs.writeFileSync(FINAL, JSON.stringify(words, null, 2));
        console.log(`  💾 중간 저장 완료 (${i}/${needsKorean.length})`);
        process.exit(1);
      }
    }

    // 주기적 중간 저장
    if ((i + 1) % SAVE_INTERVAL === 0) {
      const pct = (((i + 1) / needsKorean.length) * 100).toFixed(1);
      console.log(`\n  📝 중간 저장 수행: ${i + 1}/${needsKorean.length} (${pct}%) — 성공 ${translated}, 실패 ${failed}`);

      fs.writeFileSync(PROGRESS, JSON.stringify({ lastIndex: i + 1 }));
      fs.writeFileSync(FINAL, JSON.stringify(words, null, 2));
    }

    await sleep(BATCH_DELAY_MS);
  }

  // 최종 저장
  fs.writeFileSync(FINAL, JSON.stringify(words, null, 2));

  // 진행 파일 정리
  if (fs.existsSync(PROGRESS)) fs.unlinkSync(PROGRESS);

  // 통계
  const koCount = words.filter(w => /[가-힣]/.test(w.meaning)).length;
  const validCount = words.filter(w => w.meaning).length;

  console.log('\n✅ [3b] Google 무료 API 번역 완료!');
  console.log(`  📊 결과: 번역 성공 ${translated}, 실패 ${failed}`);
  console.log(`  📊 전체: ${words.length}개 중 한글뜻 ${koCount}개, 영영뜻 ${validCount - koCount}개, 뜻없음 ${words.length - validCount}개`);
  console.log(`\n  다음 단계: bun run scripts/pipeline/4_push_to_db.ts`);
}

main().catch(console.error);
