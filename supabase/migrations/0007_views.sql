-- 0007_views.sql
-- 대시보드 파생 뷰 (security_invoker 로 RLS 승계 — advisor security 0건 유지)

CREATE OR REPLACE VIEW public.v_daily_summary
WITH (security_invoker = true) AS
SELECT
  user_id,
  DATE(reviewed_at) AS day,
  COUNT(*) FILTER (WHERE result = 'pass') AS pass_count,
  COUNT(*) FILTER (WHERE result = 'fail') AS fail_count,
  COUNT(*) FILTER (WHERE result = 'skip') AS skip_count,
  AVG(response_ms)::INTEGER                AS avg_response_ms
FROM public.review_logs
GROUP BY user_id, DATE(reviewed_at);

CREATE OR REPLACE VIEW public.v_box_distribution
WITH (security_invoker = true) AS
SELECT
  user_id,
  box_level,
  COUNT(*) AS word_count
FROM public.user_progress
GROUP BY user_id, box_level;
