# VocaFlow Phase 1 작업 계획서 — Web MVP

> **목표:** Quasar SPA/PWA + Supabase + 라이트너 엔진으로 실사용 가능한 웹 MVP를 Netlify에 배포
> **기준일:** 2026-04-24
> **선행 문서:** `VocaFlow_PRD.md` · `docs/Phase0_ERD.md` · `docs/Phase0_Leitner_Algorithm.md`

---

## 0. 완료 정의 (Definition of Done)

Phase 1이 "완료"되려면 아래가 모두 참이어야 합니다.

- [ ] `vocaflow.app`(또는 Netlify 임시 도메인)에서 누구나 접속 가능
- [ ] 이메일/OAuth로 회원가입 → 로그인 → 오늘의 복습 세션 진입까지 1분 이내
- [ ] 시드 단어 최소 1,000개(MVP 하위 목표) 임포트 완료, `source` 태깅 정확
- [ ] 플래시카드에서 정답/오답/스킵 입력 → 라이트너 규칙대로 `user_progress`·`review_logs` 갱신
- [ ] 망각곡선 기반 `next_review_at` 정렬로 "오늘의 복습" 목록 노출
- [ ] PWA 매니페스트 + Service Worker 등록 → 모바일 브라우저에서 "홈 화면 추가" 가능
- [ ] `bun run typecheck` / `bun run lint` / `judgeReview` 단위 테스트 통과
- [ ] Netlify 자동 배포 (main push → production, PR → preview)

---

## 1. 마일스톤 & 순서

### M1. 프로젝트 스캐폴드 (0.5일)
- Quasar CLI로 Vue 3 + TS + Vite 프로젝트 초기화 (`bunx create-quasar`)
- Bun 전용 환경: `bun.lockb` 커밋, `package-lock.json`·`yarn.lock`·`pnpm-lock.yaml` `.gitignore`에 추가
- 폴더 규약 확정 (§5 참고)
- `bun run dev` / `bun run build`(SPA) 동작 확인
- ESLint + Prettier + TypeScript strict 모드 활성화
- Vitest 설정

### M2. Supabase 스키마 적용 (0.5일)
- Supabase 프로젝트 생성 → `.env.local`에 URL/Anon Key/Service Role 기입
- `docs/Phase0_ERD.md`의 DDL을 마이그레이션 파일로 분리:
  - `supabase/migrations/0001_init_words.sql`
  - `supabase/migrations/0002_init_user_progress.sql`
  - `supabase/migrations/0003_init_review_logs.sql`
  - `supabase/migrations/0004_init_dictionary_cache.sql`
  - `supabase/migrations/0005_init_ai_examples.sql`
  - `supabase/migrations/0006_rls_policies.sql`
  - `supabase/migrations/0007_views.sql`
- Supabase MCP `apply_migration`으로 적용
- `supabase gen types` → `src/types/supabase.ts` 생성 커밋
- `get_advisors`로 보안/성능 경고 0건 확인

### M3. 시드 단어 임포트 (1일)
- `scripts/import_seed.ts` 작성 (Bun 직접 실행, idempotent)
- 소스별 로더 모듈:
  - `scripts/seeds/cefrj.ts` — CEFR-J B1~B2 약 2,000개 (난이도 매핑 A1=1…C1=5)
  - `scripts/seeds/ngsl.ts` — NGSL 상위 고빈도 단어 (difficulty는 빈도→분위수 변환)
  - `scripts/seeds/suneung.ts` — 수능 기출 코퍼스 상위 1,000 (수동 CSV 시작, 추후 spaCy 파이프라인)
- 중복 제거 키: `LOWER(word)` — 동일 표제어는 `source` 병합(`,` 구분)
- `ON CONFLICT (word) DO UPDATE` 로 재실행 안전성 보장
- **KPI:** 최소 1,000개 성공, 목표 3,000개

### M4. 인증 플로우 (0.5일)
- Supabase Auth 싱글턴 (`src/lib/supabase.ts`) — 환경변수는 `VITE_SUPABASE_*` 만 Renderer 노출
- Quasar 레이아웃: `/login`, `/signup`, `/(auth)/*` 보호 라우트
- `beforeEach` 라우터 가드 → 세션 체크
- 이메일·비밀번호 + Google OAuth(선택) 1개 Provider
- 로그아웃 + 세션 만료 시 복귀 UX

### M5. 라이트너 엔진 (순수 함수) (1일) — **핵심**
- 파일: `src/lib/leitner/judge.ts` (순수 함수)
- 시그니처:
  ```ts
  export function judgeReview(input: ReviewInput): ReviewResult
  export function buildNextReviewAt(box: 1|2|3|4|5, from: Date): Date
  export function demoteInactiveBoxes(progress: UserProgress[], now: Date): UserProgress[]
  ```
- 상수는 `src/lib/leitner/constants.ts`로 분리 (`BOX_INTERVALS`, `SLOW_RESPONSE_THRESHOLD_MS` 등)
- 단위 테스트 `src/lib/leitner/__tests__/judge.spec.ts` — `docs/Phase0_Leitner_Algorithm.md` §7 케이스 전부 + 엣지:
  - 오답: Box 3 → 1 (2단계 강등)
  - 오답: Box 2 → 1 (클램프)
  - 정답 ≤ 3000ms: Box 2 → 3
  - 정답 > 3000ms: Box 2 유지
  - 정답: Box 5 → 5 (상한 클램프)
  - 스킵: 박스 유지, `next_review_at = now + 4h`
- **DB·Date.now() 의존 금지** — `now` 주입, Supabase I/O는 §M6 커맨드 계층이 담당

### M6. 복습 커맨드 계층 (1일)
- `src/lib/reviews/repository.ts` — Supabase 래퍼:
  - `fetchDueReviews(userId, limit=100)` — `next_review_at <= now()` 정렬
  - `fetchNewWords(userId, quota)` — `user_progress`에 없는 `words` 중 `difficulty` ASC
  - `submitReview(userId, wordId, reviewInput)` — judge 결과로 `user_progress` upsert + `review_logs` insert 트랜잭션 (RPC 또는 2-step)
- 세션 빌더 `src/lib/reviews/session.ts`:
  - `buildSession(userId)` → due(최대 100) + new(일일 잔여) 3:1 인터리빙
  - 일일 한도 체크는 `review_logs`의 오늘 insert 수로 계산
- Supabase Edge Function 또는 PostgreSQL RPC로 트랜잭션 묶기 (클라이언트 2-step은 race 위험 → 후순위)

### M7. 플래시카드 UI (1.5일)
- 라우트 `/study` — 오늘의 세션
- 컴포넌트:
  - `FlashCard.vue` — `q-card` + 앞면(영단어)/뒷면(뜻+예문+어원) 뒤집기 애니메이션
  - `SessionProgress.vue` — `q-linear-progress` 일일 목표 시각화
  - `ReviewActions.vue` — "알아요 / 모르겠어요 / 스킵" 버튼 (키보드: 1 / 2 / Space)
- 응답시간 측정: 카드 앞면 노출 시각 기록 → 버튼 클릭 시 `response_ms`
- MD3 테마: Primary `#1976D2`, Secondary `#26A69A` (`quasar.config.ts`에 토큰)
- 서체: Roboto + Noto Sans KR (CDN or self-host)

### M8. 홈·네비게이션·기본 페이지 (0.5일)
- 홈 `/` — 오늘의 복습 개수, 박스 분포(`v_box_distribution`), "학습 시작" CTA
- 하단 네비 `q-tabs` — 홈 / 학습 / 단어장 / 설정
- 단어장 `/vocab` — 내 단어 목록(페이징), 박스 필터
- 설정 `/settings` — 골든타임 시각 저장(일단 localStorage), 로그아웃

### M9. PWA 설정 (0.5일)
- `quasar.config.ts` → `pwa` 모드 활성화, `workbox` GenerateSW
- `public/icons/` 192·512 PNG, `manifest.json` (이름/테마컬러)
- 오프라인 fallback 페이지
- `bun run build -m pwa` 결과 Netlify 배포 타겟으로 사용

### M10. Netlify 배포 (0.5일)
- `netlify.toml`:
  ```toml
  [build]
    command = "bun run build -m pwa"
    publish = "dist/pwa"
  [build.environment]
    NODE_VERSION = "20"
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```
- Netlify Site 연결 → main push 자동 배포, PR preview 활성화
- 환경변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록 (Service Role은 **절대 금지**)
- Netlify MCP로 배포 상태 확인

### M11. 마감 QA + Phase 1 종료 (0.5일)
- 실사용 시나리오 3개 수동 테스트 (Chrome DevTools MCP):
  1. 신규 가입 → 20개 신규 + 복습 세션 완료
  2. 의도적 오답 → Box 강등 확인 → `next_review_at` 4h 뒤 설정 확인
  3. 모바일 Safari/Chrome에서 PWA 설치 → 오프라인 첫 화면 로드
- `get_advisors` 최종 0건 확인
- `main` 브랜치 보호, Phase 2 백로그(오답노트 대시보드·AI 예문 검수) 이슈화 (**GitHub MCP는 Phase 1 종료 후 연결**)

---

## 2. 간트 요약 (총 ~7.5일, 1인 기준)

```
Day 1  M1 스캐폴드 + M2 스키마
Day 2  M3 시드 임포트 (오전) + M4 인증 (오후)
Day 3  M5 라이트너 엔진 + 단위 테스트
Day 4  M6 복습 커맨드 계층
Day 5  M7 플래시카드 UI (전일)
Day 6  M7 마무리 + M8 홈/네비
Day 7  M9 PWA + M10 Netlify 배포
Day 8  M11 QA + 백로그 정리
```

병렬 가능 구간: M3(시드)과 M4(인증)는 독립 → 교차 진행 가능.

---

## 3. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| CEFR-J/NGSL 원본 CSV 파싱 포맷 변형 | 시드 임포트 실패 | 각 로더 상단에 스키마 어서션, 실패 시 개별 소스 스킵 후 진행 |
| Supabase RLS 잘못 설정 → 본인 데이터도 못 읽음 | 전 기능 마비 | RLS 정책 각각에 대해 `execute_sql`로 긍정/부정 테스트 케이스 확인 |
| 플래시카드 응답시간 측정 오차 (탭 백그라운드) | 승급 판정 왜곡 | `document.visibilityState` 감지 시 현재 카드 스킵 처리 |
| Netlify 빌드에서 Bun 미지원 | 배포 실패 | `NODE_VERSION=20` + `bun install` 커맨드를 `netlify.toml`에 명시, 필요 시 Netlify Build Plugin 또는 공식 Bun 지원 확인 |
| 수능 기출 코퍼스 수급 지연 | MVP 단어 3,000 목표 미달 | CEFR-J + NGSL 만으로 1,000개 먼저 런칭, 수능 코퍼스는 Phase 2 초기에 추가 |
| Supabase 2-step 제출 중 네트워크 단절로 부분 커밋 | 진도 불일치 | Edge Function 또는 Postgres RPC로 하나의 트랜잭션으로 묶기 (M6) |

---

## 4. 범위 제외 (Phase 1에서 **하지 않는 것**)

Phase 2 이후로 연기 — 현재 구현 금지:

- 오답 노트 대시보드 / 통계·주간 리포트 이메일
- AI 예문 생성 파이프라인 및 검수 UI
- 외부 사전 API 조회 (`dictionary_cache` 테이블은 생성만, 로직 미구현)
- 시스템 트레이 / 전역 단축키 / 골든타임 푸시 알림 (Electron — Phase 3)
- 모바일 네이티브 푸시 (Capacitor — Phase 4~5)
- 소셜 기능, 랭킹, 학급 관리
- 오디오 TTS 재생 (audio_url 저장만, UI 재생 미구현)

---

## 5. 폴더 규약

```
f:\2026\VocaFlow\
├─ src/
│  ├─ lib/
│  │  ├─ supabase.ts                  # 싱글턴 클라이언트
│  │  ├─ leitner/
│  │  │  ├─ judge.ts                  # 순수 함수 (테스트 대상)
│  │  │  ├─ constants.ts
│  │  │  └─ __tests__/judge.spec.ts
│  │  └─ reviews/
│  │     ├─ repository.ts             # Supabase I/O
│  │     └─ session.ts                # 세션 빌더
│  ├─ pages/                          # Quasar 라우트 페이지
│  ├─ components/                     # FlashCard, SessionProgress 등
│  ├─ composables/                    # useSession, useAuth
│  ├─ stores/                         # Pinia (필요 시)
│  └─ types/supabase.ts               # gen types 결과
├─ supabase/migrations/               # SQL 마이그레이션
├─ scripts/
│  ├─ import_seed.ts                  # idempotent 시드 엔트리
│  └─ seeds/{cefrj,ngsl,suneung}.ts
├─ netlify.toml
├─ quasar.config.ts
└─ docs/                              # 기획/스펙 (임의 생성 금지)
```

---

## 6. 체크리스트 (진행 추적용)

- [ ] M1 스캐폴드 완료 — `bun run dev` OK
- [ ] M2 스키마 적용 — `get_advisors` 0건
- [ ] M3 시드 ≥ 1,000개 임포트
- [ ] M4 로그인/가입/로그아웃 동작
- [ ] M5 `judgeReview` 단위 테스트 전부 green
- [ ] M6 `submitReview` 트랜잭션 정합성 확인 (오답 시 box_after 강등 로그 확인)
- [ ] M7 플래시카드 키보드·애니메이션·응답시간 측정
- [ ] M8 홈·박스 분포·단어장 페이지 동작
- [ ] M9 PWA 설치·오프라인 fallback 확인
- [ ] M10 Netlify main push 자동 배포 green
- [ ] M11 시나리오 3종 수동 QA 통과 → Phase 2 백로그 작성

---

## 7. Phase 2 이후 메모

Phase 1 종료 직후 착수 후보:

1. **GitHub 리모트 연결** — Phase 1 종료 트리거, `GITHUB_PERSONAL_ACCESS_TOKEN` 주입 후 GitHub MCP 활성화
2. **오답 노트 대시보드** — `review_logs`에서 `result='fail'` 빈도/최근 단어 뽑기
3. **AI 예문 파이프라인** — Anthropic SDK + 프롬프트 캐싱, `ai_generated_examples` 검수 UI
4. **사전 API 연동** — Free Dictionary → MW → Papago → Datamuse 순, `dictionary_cache` TTL 30일
5. **수능 기출 코퍼스 spaCy 파이프라인** — 시드 3,000 완성
