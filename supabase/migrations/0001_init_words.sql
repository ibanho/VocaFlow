-- 0001_init_words.sql
-- 사전 테이블 (공용, 읽기 공개)

CREATE TABLE IF NOT EXISTS public.words (
  id              BIGSERIAL PRIMARY KEY,
  word            TEXT NOT NULL UNIQUE,
  meaning         TEXT NOT NULL,
  pos             TEXT,
  difficulty      SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
  example_en      TEXT,
  example_ko      TEXT,
  root_info       JSONB,
  collocations    TEXT[],
  synonyms        TEXT[],
  antonyms        TEXT[],
  audio_url       TEXT,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_words_difficulty ON public.words(difficulty);
CREATE INDEX IF NOT EXISTS idx_words_source     ON public.words(source);
CREATE INDEX IF NOT EXISTS idx_words_word_lower ON public.words(LOWER(word));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_words_updated_at ON public.words;
CREATE TRIGGER trg_words_updated_at
  BEFORE UPDATE ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
