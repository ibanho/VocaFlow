-- 0005_init_ai_examples.sql
-- LLM 생성 예문 검수 큐 (승인 전 words.example_* 로 승격 금지)

CREATE TABLE IF NOT EXISTS public.ai_generated_examples (
  id          BIGSERIAL PRIMARY KEY,
  word_id     BIGINT NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  example_en  TEXT NOT NULL,
  example_ko  TEXT NOT NULL,
  model       TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_examples_status ON public.ai_generated_examples(status);
CREATE INDEX IF NOT EXISTS idx_ai_examples_word   ON public.ai_generated_examples(word_id);
