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

  // 1. Check cache
  const { data: cacheData } = await supabase
    .from('dictionary_cache')
    .select('payload, expires_at')
    .eq('word', lowerWord)
    .eq('provider', PROVIDER)
    .single();

  if (cacheData && new Date(cacheData.expires_at) > new Date()) {
    return cacheData.payload as unknown as DictionaryResponse;
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

    // 3. Save to cache
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await supabase.from('dictionary_cache').upsert({
      word: lowerWord,
      provider: PROVIDER,
      payload: payload,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, { onConflict: 'word, provider' });

    return payload || null;
  } catch (error) {
    console.error('Dictionary API Error:', error);
    return null;
  }
}
