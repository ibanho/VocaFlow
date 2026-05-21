/**
 * [Step 3a] Papago API로 영영 뜻 → 한글 번역
 * 
 * 사전 조건:
 *   - .env.local에 NAVER_PAPAGO_CLIENT_ID, NAVER_PAPAGO_CLIENT_SECRET 설정
 *   - scripts/pipeline/data/final_words.json 존재 (3단계 완료 후)
 * 
 * 실행: bun run scripts/pipeline/3a_papago_translate.ts
 */
import fs from 'fs';
import path from 'path';

// .env.local 수동 로드 (Bun 스크립트용)
const envPath = path.resolve(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const CLIENT_ID = process.env.NAVER_PAPAGO_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_PAPAGO_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ .env.local에 NAVER_PAPAGO_CLIENT_ID / NAVER_PAPAGO_CLIENT_SECRET를 설정하세요.');
  console.error('   발급: https://console.ncloud.com → AI Services → Papago Translation');
  process.exit(1);
}

const DATA_DIR = path.resolve(__dirname, 'data');
const FINAL = path.resolve(DATA_DIR, 'final_words.json');
const BACKUP = path.resolve(DATA_DIR, 'final_words.backup.json');
const PROGRESS = path.resolve(DATA_DIR, 'papago_progress.json');

const PAPAGO_URL = 'https://naveropenapi.apigw.ntruss.com/nmt/v1/translation';
const BATCH_DELAY_MS = 120;  // rate limit 안전 마진
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
 * Papago 번역 호출
 */
async function translateWithPapago(text: string): Promise<string | null> {
  try {
    const res = await fetch(PAPAGO_URL, {
      method: 'POST',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': CLIENT_ID!,
        'X-NCP-APIGW-API-KEY': CLIENT_SECRET!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'en', target: 'ko', text }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`  Papago error ${res.status}: ${body.slice(0, 100)}`);
      return null;
    }

    const data = await res.json() as any;
    return data?.message?.result?.translatedText || null;
  } catch (e) {
    console.error(`  Papago fetch error:`, e);
    return null;
  }
}

/**
 * 영어 단어 + 영영 정의 → 번역용 텍스트 구성
 * "abandon: to give up completely" → Papago → "포기하다: 완전히 포기하다"
 * 결과에서 첫 번째 부분만 추출
 */
function buildTranslationInput(word: string, defEn?: string): string {
  if (defEn && defEn.length > 5) {
    // 정의가 너무 길면 60자로 자름
    const trimmed = defEn.length > 60 ? defEn.slice(0, 60) : defEn;
    return trimmed;
  }
  return word;
}

/**
 * 번역 결과 정제: 불필요한 기호 제거, 괄호 깨짐 방지
 */
function cleanTranslation(raw: string): string {
  let cleaned = raw
    .replace(/\.$/, '')        // 끝 마침표 제거
    .replace(/^"(.*)"$/, '$1') // 따옴표 제거
    .trim();

  // 문장 전체가 번역되어 너무 길면 첫 번째 뜻만 추출하되, 괄호가 도중에 짤리지 않도록 정교하게 파싱
  if (cleaned.length > 30) {
    // 괄호 안에 있는 콤마는 분할 기준에서 제외하는 정규식 적용
    // 외부 콤마나 세미콜론으로만 분할
    const parts = cleaned.split(/[,;](?![^(]*\))/);
    const firstPart = parts[0];
    if (firstPart) {
      cleaned = firstPart.trim();
    }
  }

  return cleaned;
}

async function main() {
  console.log('🌐 [3a] Papago 한글 번역 시작');

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

  // 한글이 아닌 뜻을 가진 단어 필터 (영영 정의만 있는 것)
  const needsKorean = words.filter(w => {
    if (!w.meaning) return true;
    // 한글이 포함되어 있으면 이미 번역됨
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
  console.log(`  🔑 Papago Client ID: ${CLIENT_ID!.slice(0, 8)}...`);

  let translated = 0;
  let failed = 0;
  let consecutiveErrors = 0;

  for (let i = startIdx; i < needsKorean.length; i++) {
    const fw = needsKorean[i];
    if (!fw) continue;
    const input = buildTranslationInput(fw.word, fw.definition_en || fw.meaning);
    const result = await translateWithPapago(input);

    if (result) {
      fw.meaning = cleanTranslation(result);
      translated++;
      consecutiveErrors = 0;
    } else {
      failed++;
      consecutiveErrors++;

      // 연속 5회 실패 → API 문제로 판단하고 중단
      if (consecutiveErrors >= 5) {
        console.error(`\n  ⛔ 연속 ${consecutiveErrors}회 실패 — 중단합니다.`);
        console.error('     API 키, 네트워크, 사용량 한도를 확인하세요.');
        // 중간 저장
        fs.writeFileSync(PROGRESS, JSON.stringify({ lastIndex: i }));
        fs.writeFileSync(FINAL, JSON.stringify(words, null, 2));
        console.log(`  💾 중간 저장 완료 (${i}/${needsKorean.length})`);
        process.exit(1);
      }
    }

    // 진행률 출력
    if ((i + 1) % SAVE_INTERVAL === 0) {
      const pct = (((i + 1) / needsKorean.length) * 100).toFixed(1);
      console.log(`  📝 ${i + 1}/${needsKorean.length} (${pct}%) — 번역 ${translated}, 실패 ${failed}`);

      // 중간 저장
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

  console.log('\n✅ [3a] Papago 번역 완료!');
  console.log(`  📊 결과: 번역 성공 ${translated}, 실패 ${failed}`);
  console.log(`  📊 전체: ${words.length}개 중 한글뜻 ${koCount}개, 영영뜻 ${validCount - koCount}개, 뜻없음 ${words.length - validCount}개`);
  console.log(`\n  다음 단계: bun run scripts/pipeline/4_push_to_db.ts`);
}

main().catch(console.error);
