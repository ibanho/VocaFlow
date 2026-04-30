# VocaFlow — Claude Code 작업 지침

> 고2 수능 영어 정복을 위한 라이트너 시스템 기반 스마트 단어장
> 상세 기획: `VocaFlow_PRD.md` · 알고리즘: `docs/Phase0_Leitner_Algorithm.md` · 스키마: `docs/Phase0_ERD.md`

---

## 제품 요지

- **타겟:** 고2 수능 영어 1등급 준비생
- **핵심 가치:** 망각곡선 기반 라이트너 복습 자동화 + 인출(recall) 훈련 + 오답 노트
- **학습 원칙 5가지:** 노출 빈도 / 아웃풋 학습 / 어원·접사 / 덩어리(collocation) / 골든타임(취침 전 10분)

## 기술 스택

| 레이어 | 선택 |
|--------|------|
| Frontend | Vue 3 + TypeScript + Quasar Framework (SPA/PWA/Electron/Capacitor 단일 코드베이스) |
| Backend  | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Hosting  | **Netlify** (1차 런칭) |
| 패키지 매니저 | **Bun** (npm/yarn/pnpm 대신) |
| UI       | Material Design 3, Primary `#1976D2`, Secondary `#26A69A` |
| 서체     | Roboto (영문) / Noto Sans KR (국문) |

### Bun 사용 규칙
- **설치:** `bun install` (never `npm install`)
- **스크립트:** `bun run dev` / `bun run build` (never `npm run`)
- **패키지 추가/제거:** `bun add <pkg>` / `bun remove <pkg>`
- **실행:** TS 파일 직접 실행 가능 — `bun run scripts/import_seed.ts`
- **락파일:** `bun.lockb` 커밋 (npm/yarn 락파일은 커밋 금지·생성 시 삭제)
- **Quasar CLI 호환:** `bunx quasar` 또는 `bun run quasar` 사용
- **Node 호환:** Quasar/Electron 빌드 시 Node API 필요하면 Bun이 대부분 대체. 비호환 발견 시 해당 명령만 예외 기록

### 런칭 순서 (Web First)
1. **Web (Netlify + PWA)** — MVP, 설치 불필요
2. **Desktop (Electron)** — 시스템 트레이·전역 단축키·골든타임 알림
3. **Android (Capacitor)** — Play Store
4. **iOS (Capacitor)** — App Store

**원칙:** 웹에서 핵심 UX 검증 → 플랫폼별 기능만 네이티브에서 추가. Vue 코드는 공유, 플랫폼 특화 로직만 분기.

### Electron 프로세스 분리 (Phase 3에서 적용)
- **Main (Node.js):** 창 관리, 시스템 트레이, 전역 단축키, 파일 접근
- **Renderer (Vue):** 웹 앱과 동일 코드 재사용
- **Context Bridge:** `window.api`로만 노출, `nodeIntegration: false`

---

## 데이터 모델 (요약)

4개 테이블 — 전체 DDL은 `docs/Phase0_ERD.md` 참조.

- `words` — 사전 (word, meaning, pos, difficulty, example_en/ko, root_info, collocations[], synonyms[], antonyms[], source)
- `user_progress` — 개인 상태 (box_level 1~5, next_review_at, wrong_count, correct_streak, avg_response_ms)
- `review_logs` — 인출 이력 (result pass/fail/skip, response_ms, box_before/after, is_golden_hour)
- `ai_generated_examples` — LLM 예문 검수 큐 (status pending/approved/rejected)
- `dictionary_cache` — 외부 사전 API 응답 캐시 (word+provider PK, TTL 30일)

**RLS 필수:** `user_progress`, `review_logs`는 본인 레코드만 접근. `words`는 읽기 공개.

---

## 단어 데이터 수급 (시드 전략)

전체 전략은 `VocaFlow_PRD.md` §9 참조. 구현 시 원칙:

- **시드 소스 우선순위:** CEFR-J (난이도 매핑) > NGSL/NAWL (빈도) > 수능 기출 코퍼스 (차별점)
- **저작권 금지 소스:** 상용 단어장(능률/워드마스터 등), EBS 교재 재배포
- **`source` 컬럼 태깅 필수:** `CEFR-J` / `NGSL` / `수능기출` / `AI` — 추적·필터링용
- **난이도 매핑:** CEFR A1=1, A2=2, B1=3, B2=4, C1=5 → `words.difficulty`
- **MVP 목표:** 3,000 단어 (CEFR-J B1~B2 약 2,000 + 수능 기출 상위 1,000)
- **AI 생성 예문은 `ai_generated_examples` 검수 큐로만** — 승인 전 `words.example_*`에 직접 쓰기 금지
- **크롤링 시 robots.txt 준수** — Etymonline 등

임포트 스크립트는 `scripts/import_seed.ts`에 통합, idempotent 하게 작성.

### 사전 API (Phase 4 도입)
- **조합:** Free Dictionary (무인증) + Merriam-Webster Learner's (정제 예문) + Papago (한글 뜻) + Datamuse (동의어)
- **조회 순서:** `words` → `dictionary_cache` → 외부 API → 캐시 저장 → 검수 큐
- **보안:** API 키는 Main Process `.env`에만 두고 Renderer는 `window.api.lookupWord()` IPC만 호출. 키를 Renderer 번들에 포함 절대 금지
- **캐시 TTL:** 30일, 만료 시 재조회

---

## 라이트너 알고리즘 핵심 규칙

전체 스펙은 `docs/Phase0_Leitner_Algorithm.md` 참조. 구현 시 다음을 절대 바꾸지 말 것:

| 상황 | 처리 |
|------|------|
| 오답 | `box_level = max(1, current - 2)` — **2단계 강등** |
| 정답 + 응답 ≤ 3초 | `box_level = min(5, current + 1)` 승급 |
| 정답 + 응답 > 3초 | 박스 유지 (승급 보류) |
| 응답 스킵 | 판정 보류, `next_review_at = now + 4h` |

**복습 주기:** Box 1=4h / 2=1d / 3=3d / 4=7d / 5=14d→30d
**일일 한도:** 신규 20, 복습 100
**30일 미접속 시:** Box 3 이상 → Box 2 일괄 강등

---

## 작업 원칙 (Claude 전용)

### 파일/문서
- **기획·스펙 문서(`*.md`) 임의 생성 금지** — 사용자가 명시 요청 시에만 작성
- PRD 수정 시 Phase 0 문서(`docs/Phase0_*.md`)와의 정합성 확인
- Marp 프리젠테이션 형식(`VocaFlow_PRD.md`)이므로 `---` 슬라이드 구분자 유지

### 코드
- **TypeScript strict 모드** 유지, `any` 최소화
- Supabase 클라이언트는 싱글턴으로 관리, 환경변수는 `.env.local`
- 라이트너 판정 로직은 **순수 함수**로 분리 (테스트 가능성)
- Electron IPC는 Context Bridge를 통해서만 — `ipcRenderer` 직접 노출 금지

### 테스트
- `judgeReview()` 등 알고리즘 함수는 단위 테스트 필수 (엣지 케이스 포함)
- DB 테스트는 실제 Supabase 로컬 인스턴스 권장 — 모킹 지양

### MCP 서버 (프로젝트 `.mcp.json`)
| 서버 | 용도 | 요구 환경변수 | 활성화 시점 |
|------|------|--------------|------------|
| `supabase` | DB·RLS·마이그레이션 | `SUPABASE_ACCESS_TOKEN` | Phase 1 착수 시 |
| `context7` | Quasar/Vue/Supabase 문서 조회 | 없음 | 즉시 |
| `chrome-devtools` | 웹 UI 디버깅 | 없음 | Phase 1~2 |
| `playwright` | E2E 테스트 자동화 | 없음 | Phase 2+ |
| `netlify` | 배포 상태·프리뷰 | `NETLIFY_AUTH_TOKEN` | Phase 1 배포 시 |
| `github` | 저장소·PR·이슈 | `GITHUB_PERSONAL_ACCESS_TOKEN` | **Phase 1 종료 후** (리모트 저장소 연결 후) |

- `.env.example` 참고하여 `.env.local`에 실제 값 입력 (gitignore됨)
- 인증 없는 서버(context7/chrome-devtools/playwright)는 키 없이 즉시 사용 가능
- **GitHub 리모트는 Phase 1 완료 후 연결** — 그 전까지 로컬 git만 사용, PR 리뷰/이슈 관리 등 GitHub MCP 기능은 유보
- MCP 기능이 해결할 수 있는 작업은 **수동 CLI 대신 MCP 도구 우선 사용**

### Git / 버전 관리
- **기본 브랜치:** `main`
- **브랜치 전략:** `feature/<topic>`, `fix/<topic>`, `chore/<topic>` 분기 → `main`으로 PR
- **커밋 메시지 규칙 (Conventional Commits):**
  - `feat: 라이트너 판정 함수 구현`
  - `fix: 오답 시 박스 클램프 버그`
  - `docs: ERD 다이어그램 갱신`
  - `chore: bun 의존성 업데이트`
- **원자 커밋:** 기능 단위로 쪼개기, 대형 커밋 지양
- **보호 파일 커밋 금지:** `.env*`, 키 파일, `package-lock.json`/`yarn.lock`/`pnpm-lock.yaml` (Bun만 사용)
- **커밋 전:** `bun run lint` / `bun run typecheck` 통과 확인
- **사용자 명시 요청 없이 push/force-push 금지**

---

## 로드맵 (현재 위치 추적)

1. ✅ **Phase 0:** 데이터 모델 v2 + 라이트너 스펙 문서화 (완료)
2. ⏳ **Phase 1 — Web MVP:** Supabase Auth + 스키마 DDL + Quasar SPA/PWA + 라이트너 엔진 + 플래시카드 + **Netlify 배포**
3. ⏳ **Phase 2 — Web 고도화:** 오답 노트 대시보드 + AI 예문 검수 + 통계/리포트 + 사전 API 연동
4. ⏳ **Phase 3 — Desktop:** Electron 패키징 + 시스템 트레이 + 골든타임 알림 + 전역 단축키
5. ⏳ **Phase 4 — Android:** Capacitor 빌드 + 푸시 알림 + Play Store 출시
6. ⏳ **Phase 5 — iOS:** Capacitor 빌드 + APNs + App Store 출시

## 성공 지표 (KPI)

- 일일 복습 완료율 ≥ 80%
- 7일 리텐션 ≥ 60%
- Box 5 도달 단어 수 (주간 추적)
- 평균 인출 응답시간 단축률

---

## AI 예문 생성 가이드라인

LLM으로 예문 보강 시:
- **톤:** 수능 지문 스타일 (교육적·중립적, 자극적 소재 배제)
- **난이도:** CEFR B1~B2
- **길이:** 문장당 15~25 단어
- **검수 전 노출 금지** — `ai_generated_examples.status = 'approved'` 통과 후에만 `words.example_en/ko`로 승격
