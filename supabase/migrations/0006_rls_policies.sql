-- 0006_rls_policies.sql
-- Row Level Security: 본인 데이터만 접근, 사전은 읽기 공개, 캐시는 읽기 공개

-- words: 누구나 읽기, 쓰기는 서비스 롤(RLS 우회) 전용
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "words_read_all" ON public.words;
CREATE POLICY "words_read_all" ON public.words
  FOR SELECT USING (true);

-- user_progress: 본인 레코드만 CRUD
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_progress_select" ON public.user_progress;
DROP POLICY IF EXISTS "own_progress_insert" ON public.user_progress;
DROP POLICY IF EXISTS "own_progress_update" ON public.user_progress;
DROP POLICY IF EXISTS "own_progress_delete" ON public.user_progress;

CREATE POLICY "own_progress_select" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_progress_insert" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_progress_update" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id)
             WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_progress_delete" ON public.user_progress
  FOR DELETE USING (auth.uid() = user_id);

-- review_logs: 본인 기록만 조회/삽입 (수정·삭제는 불가 — 감사 로그)
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_logs_select" ON public.review_logs;
DROP POLICY IF EXISTS "own_logs_insert" ON public.review_logs;

CREATE POLICY "own_logs_select" ON public.review_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_logs_insert" ON public.review_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- dictionary_cache: 공용 캐시 — 누구나 조회 및 삽입/갱신 가능 (사전 API 비용 절감 목적)
ALTER TABLE public.dictionary_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dict_cache_read_authenticated" ON public.dictionary_cache;
DROP POLICY IF EXISTS "dict_cache_read_all" ON public.dictionary_cache;
DROP POLICY IF EXISTS "dict_cache_insert_all" ON public.dictionary_cache;
DROP POLICY IF EXISTS "dict_cache_update_all" ON public.dictionary_cache;

CREATE POLICY "dict_cache_read_all" ON public.dictionary_cache
  FOR SELECT USING (true);
CREATE POLICY "dict_cache_insert_all" ON public.dictionary_cache
  FOR INSERT WITH CHECK (true);
CREATE POLICY "dict_cache_update_all" ON public.dictionary_cache
  FOR UPDATE USING (true) WITH CHECK (true);

-- ai_generated_examples: 인증 사용자 읽기 (검수 대시보드), 쓰기는 서비스 롤 전용
ALTER TABLE public.ai_generated_examples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_examples_read_authenticated" ON public.ai_generated_examples;

CREATE POLICY "ai_examples_read_authenticated" ON public.ai_generated_examples
  FOR SELECT TO authenticated USING (true);
