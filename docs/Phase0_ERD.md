# VocaFlow Phase 0: 데이터 모델 (ERD)

> **목적:** Supabase PostgreSQL 스키마 확정
> **버전:** v2.0 (2026-04-24)

---

## 1. ERD (Entity Relationship Diagram)

```
┌──────────────────┐         ┌──────────────────────┐
│   auth.users     │ 1     N │   user_progress      │
│  (Supabase Auth) │─────────│  user_id, word_id PK │
└──────────────────┘         │  box_level           │
         │ 1                  │  next_review_at      │
         │                    │  wrong_count         │
         │                    │  correct_streak      │
         │                    │  avg_response_ms     │
         │                    └──────────┬───────────┘
         │                               │ N
         │                               │
         │ N                             │ 1
┌────────┴─────────┐              ┌──────┴───────────┐
│   review_logs    │         N    │     words        │
│  user_id (FK)    │──────────────│  id PK           │
│  word_id (FK)    │         1    │  word UNIQUE     │
│  result          │              │  meaning         │
│  response_ms     │              │  pos             │
│  reviewed_at     │              │  difficulty      │
└──────────────────┘              │  example_en/ko   │
                                   │  root_info       │
                                   │  collocations[]  │
                                   │  synonyms[]      │
                                   │  antonyms[]      │
                                   │  audio_url       │
                                   │  source          │
                                   └──────┬───────────┘
                                          │ 1
                                          │
                                          │ N
                            ┌─────────────┴────────────┐
                            │ ai_generated_examples    │
                            │  id PK, word_id FK       │
                            │  example_en, example_ko  │
                            │  status (pending/        │
                            │   approved/rejected)     │
                            │  reviewed_by             │
                            └──────────────────────────┘
```

---

## 2. 테이블 DDL

### 2.1 `words` — 사전 데이터

```sql
CREATE TABLE words (
  id              BIGSERIAL PRIMARY KEY,
  word            TEXT NOT NULL UNIQUE,
  meaning         TEXT NOT NULL,
  pos             TEXT,                       -- 품사 (noun/verb/adj...)
  difficulty      SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
  example_en      TEXT,
  example_ko      TEXT,
  root_info       JSONB,                      -- {prefix, root, suffix, origin}
  collocations    TEXT[],                     -- 덩어리 표현
  synonyms        TEXT[],
  antonyms        TEXT[],
  audio_url       TEXT,
  source          TEXT,                       -- 수능/모의고사/EBS/공통
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_words_difficulty ON words(difficulty);
CREATE INDEX idx_words_source ON words(source);
```

### 2.2 `user_progress` — 개인 학습 상태

```sql
CREATE TABLE user_progress (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id          BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  box_level        SMALLINT NOT NULL DEFAULT 1 CHECK (box_level BETWEEN 1 AND 5),
  next_review_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  wrong_count      INTEGER NOT NULL DEFAULT 0,
  correct_streak   INTEGER NOT NULL DEFAULT 0,
  avg_response_ms  INTEGER,                   -- 최근 10회 평균
  last_seen_at     TIMESTAMPTZ,
  first_learned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, word_id)
);

CREATE INDEX idx_progress_due ON user_progress(user_id, next_review_at);
CREATE INDEX idx_progress_box ON user_progress(user_id, box_level);
```

### 2.3 `review_logs` — 인출 이력 (오답 노트/분석 근거)

```sql
CREATE TABLE review_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id       BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  result        TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'skip')),
  response_ms   INTEGER,
  box_before    SMALLINT,
  box_after     SMALLINT,
  is_golden_hour BOOLEAN DEFAULT false,       -- 취침 전 복습 여부
  reviewed_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logs_user_time ON review_logs(user_id, reviewed_at DESC);
CREATE INDEX idx_logs_word ON review_logs(word_id);
```

### 2.4 `dictionary_cache` — 외부 사전 API 응답 캐시

```sql
CREATE TABLE dictionary_cache (
  word        TEXT NOT NULL,
  provider    TEXT NOT NULL,              -- 'free-dict' / 'mw' / 'papago' / 'datamuse'
  payload     JSONB NOT NULL,             -- 원본 응답 그대로 저장
  fetched_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,       -- TTL 30일 기본
  PRIMARY KEY (word, provider)
);

CREATE INDEX idx_cache_expires ON dictionary_cache(expires_at);
```

- **조회 순서:** `words` → `dictionary_cache` → 외부 API → 캐시 저장
- **TTL 만료 시:** 재조회 후 `payload` 갱신
- **RLS:** 공용 캐시이므로 읽기 공개, 쓰기는 서비스 롤만

### 2.5 `ai_generated_examples` — LLM 예문 검수 큐

```sql
CREATE TABLE ai_generated_examples (
  id          BIGSERIAL PRIMARY KEY,
  word_id     BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  example_en  TEXT NOT NULL,
  example_ko  TEXT NOT NULL,
  model       TEXT,                           -- claude-opus-4-7 등
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_examples_status ON ai_generated_examples(status);
```

---

## 3. Row Level Security (RLS)

```sql
-- user_progress: 본인 레코드만
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

-- review_logs: 본인 기록만 조회/삽입
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_logs_select" ON review_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_logs_insert" ON review_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- words: 누구나 읽기, 쓰기는 관리자 역할만
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "words_read_all" ON words FOR SELECT USING (true);
```

---

## 4. 파생 뷰 (대시보드용)

### 4.1 일일 학습 요약

```sql
CREATE VIEW v_daily_summary AS
SELECT
  user_id,
  DATE(reviewed_at) AS day,
  COUNT(*) FILTER (WHERE result = 'pass') AS pass_count,
  COUNT(*) FILTER (WHERE result = 'fail') AS fail_count,
  AVG(response_ms) AS avg_response_ms
FROM review_logs
GROUP BY user_id, DATE(reviewed_at);
```

### 4.2 Box 분포

```sql
CREATE VIEW v_box_distribution AS
SELECT
  user_id,
  box_level,
  COUNT(*) AS word_count
FROM user_progress
GROUP BY user_id, box_level;
```

---

## 5. 마이그레이션 순서

1. `words` (참조 대상, 선행)
2. `auth.users` — Supabase Auth 활성화
3. `user_progress` (words, users 참조)
4. `review_logs` (words, users 참조)
5. `ai_generated_examples` (words 참조)
6. RLS 정책 적용
7. 뷰 생성
8. 시드 데이터 (수능 필수 3000 단어) CSV 임포트
