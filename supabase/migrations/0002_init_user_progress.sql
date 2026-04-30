-- 0002_init_user_progress.sql
-- 개인 학습 상태 (라이트너 박스 / 다음 복습 시각)

CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id          BIGINT NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  box_level        SMALLINT NOT NULL DEFAULT 1 CHECK (box_level BETWEEN 1 AND 5),
  next_review_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  wrong_count      INTEGER NOT NULL DEFAULT 0,
  correct_streak   INTEGER NOT NULL DEFAULT 0,
  avg_response_ms  INTEGER,
  last_seen_at     TIMESTAMPTZ,
  first_learned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_due ON public.user_progress(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_progress_box ON public.user_progress(user_id, box_level);
