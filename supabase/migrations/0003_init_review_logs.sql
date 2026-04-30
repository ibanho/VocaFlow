-- 0003_init_review_logs.sql
-- 인출 이력 (오답 노트·통계 근거)

CREATE TABLE IF NOT EXISTS public.review_logs (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id        BIGINT NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  result         TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'skip')),
  response_ms    INTEGER,
  box_before     SMALLINT CHECK (box_before BETWEEN 1 AND 5),
  box_after      SMALLINT CHECK (box_after  BETWEEN 1 AND 5),
  is_golden_hour BOOLEAN NOT NULL DEFAULT false,
  reviewed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_user_time ON public.review_logs(user_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_word      ON public.review_logs(word_id);
