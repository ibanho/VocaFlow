import { getSupabase } from '../supabase';

export interface DictionaryResponse {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms: string[];
      antonyms: string[];
    }>;
  }>;
}

const PROVIDER = 'free-dict';
const CACHE_TTL_DAYS = 30;

export async function fetchDictionaryInfo(word: string): Promise<DictionaryResponse | null> {
  const supabase = getSupabase();
  const lowerWord = word.toLowerCase().trim();

  // 1. Check cache (Safely wrapped in try-catch to ensure graceful degradation)
  try {
    const { data: cacheData, error: cacheError } = await supabase
      .from('dictionary_cache')
      .select('payload, expires_at')
      .eq('word', lowerWord)
      .eq('provider', PROVIDER)
      .maybeSingle(); // maybeSingle() is safer than single() to avoid throwing errors on empty rows

    if (!cacheError && cacheData && new Date(cacheData.expires_at) > new Date()) {
      return cacheData.payload as unknown as DictionaryResponse;
    }
  } catch (cacheErr) {
    console.warn('[Dictionary Cache] Lookup failed, fallback to public API:', cacheErr);
  }

  // 2. Fetch from API
  try {
    // eslint-disable-next-line no-undef
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lowerWord)}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Dictionary API error: ${res.status}`);
    }

    const data: DictionaryResponse[] = await res.json();
    if (!data || data.length === 0) return null;

    const payload = data[0];

    // 3. Save to cache (Non-blocking try-catch to prevent RLS/cache writes from breaking the flow)
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

      await supabase.from('dictionary_cache').upsert({
        word: lowerWord,
        provider: PROVIDER,
        payload: payload,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'word, provider' });
    } catch (saveCacheErr) {
      console.warn('[Dictionary Cache] Saving to cache failed (non-blocking):', saveCacheErr);
    }

    return payload || null;
  } catch (error) {
    console.error('Dictionary API Error:', error);
    return null;
  }
}

// 원격 DB 마이그레이션 완료 후 정석대로 'google-translate' 프로바이더 사용
const TRANSLATE_PROVIDER = 'google-translate';

/**
 * 실시간 구글 번역 API를 호출하고 결과를 캐싱하여 반환합니다.
 * DB 마이그레이션 미적용 등의 캐시 저장 실패 시에도 번역 결과를 정상 반환하도록 안전하게 처리되었습니다.
 */
export async function fetchRealtimeTranslation(word: string, englishDefinition?: string): Promise<string> {
  const supabase = getSupabase();
  const lowerWord = word.toLowerCase().trim();

  // 1. 캐시 조회 (동일 단어에 대한 번역)
  try {
    const { data: cacheData, error: cacheError } = await supabase
      .from('dictionary_cache')
      .select('payload, expires_at')
      .eq('word', lowerWord)
      .eq('provider', TRANSLATE_PROVIDER)
      .maybeSingle();

    if (!cacheError && cacheData && new Date(cacheData.expires_at) > new Date()) {
      const cached = cacheData.payload as { translated_meaning: string };
      if (cached && cached.translated_meaning) {
        return cached.translated_meaning;
      }
    }
  } catch (cacheErr) {
    console.warn('[Translate Cache] Lookup failed, fallback to live API:', cacheErr);
  }

  // 2. 번역 대상 문장 결정
  // 영문 정의가 없으면 단어 자체를 번역 대상으로 삼음
  const sourceText = englishDefinition || word;

  // 3. 구글 무료 번역 API 호출
  try {
    const encodedText = encodeURIComponent(sourceText.trim());
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodedText}`;
    
    // eslint-disable-next-line no-undef
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Translate API error: ${res.status}`);
    
    const data = await res.json();
    if (!data || !data[0]) throw new Error('Invalid translation response');
    
    let translatedText = data[0].map((item: any) => item[0]).join('');
    translatedText = translatedText.replace(/\s+/g, ' ').trim();

    // 4. 캐시 저장 (비동기, 무장애 Fallback 보장)
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

      await supabase.from('dictionary_cache').upsert({
        word: lowerWord,
        provider: TRANSLATE_PROVIDER,
        payload: { translated_meaning: translatedText, source_text: sourceText },
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'word, provider' });
    } catch (saveCacheErr) {
      console.warn('[Translate Cache] Saving to cache failed (non-blocking DDL failover):', saveCacheErr);
    }

    return translatedText;
  } catch (error) {
    console.error('Realtime Translation Error:', error);
    return '';
  }
}

