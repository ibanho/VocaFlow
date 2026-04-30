-- 0004_init_dictionary_cache.sql
-- 외부 사전 API 응답 캐시 (Phase 4 활용, Phase 1에선 테이블만 생성)

CREATE TABLE IF NOT EXISTS public.dictionary_cache (
  word        TEXT NOT NULL,
  provider    TEXT NOT NULL CHECK (provider IN ('free-dict', 'mw', 'papago', 'datamuse')),
  payload     JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (word, provider)
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON public.dictionary_cache(expires_at);
