# VocaFlow — AI Agent 작업 지침

> 본 문서는 VocaFlow 프로젝트에 참여하는 모든 AI 코딩 에이전트(Cursor, Copilot, Antigravity, Claude 등)를 위한 공통 개발 지침입니다.
> 고2 수능 영어 정복을 위한 라이트너 시스템 기반 스마트 단어장을 구축합니다.
> 상세 기획: `VocaFlow_PRD.md` · 알고리즘: `docs/Phase0_Leitner_Algorithm.md` · 스키마: `docs/Phase0_ERD.md`

---

## 1. 프로젝트 요지 및 기술 스택

- **타겟:** 고2 수능 영어 1등급 준비생
- **주요 기능:** 망각곡선 기반 라이트너 복습 자동화, 인출 훈련, 오답 노트
- **Frontend:** Vue 3 + TypeScript + Quasar Framework (SPA/PWA/Electron/Capacitor 단일 코드베이스)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Hosting:** Netlify (1차 웹 런칭용)
- **UI/UX:** Material Design 3 (Primary `#1976D2`, Secondary `#26A69A`)

---

## 2. ⚡ 런타임 및 패키지 매니저 규칙 (필수)

**모든 패키지 관리는 `Bun`을 사용합니다.** (npm, yarn, pnpm 사용 절대 금지)
- **설치:** `bun install`
- **스크립트 실행:** `bun run dev` / `bun run build`
- **패키지 추가/제거:** `bun add <pkg>` / `bun remove <pkg>`
- **TS 파일 즉시 실행:** `bun run scripts/import_seed.ts`
- **Quasar CLI:** `bunx quasar` 또는 `bun run quasar`
- **Lock 파일:** `bun.lockb`만 커밋하며, 타 패키지 매니저의 lock 파일이 생성된 경우 즉시 삭제하십시오.

---

## 3. 🧠 도메인 규칙 및 라이트너 알고리즘 제약

라이트너 엔진 로직을 수정하거나 구현할 때 아래의 규칙을 절대 변경하지 마십시오.

1. **오답 패널티:** 오답 시 현재 단계에서 **2단계 강등**됩니다. (`box_level = max(1, current - 2)`)
2. **정답 승급:** 정답 시 응답 시간이 3초 이하일 때만 승급합니다. (`box_level = min(5, current + 1)`)
3. **지연 정답:** 정답이더라도 응답 시간이 3초를 초과하면 박스가 유지됩니다.
4. **스킵:** 응답을 스킵하면 판정이 보류되며 다음 복습이 4시간 뒤로 설정됩니다. (`next_review_at = now + 4h`)
5. **순수 함수:** 라이트너 판정 로직(`judgeReview()` 등)은 상태를 가지지 않는 순수 함수로 작성하여 단위 테스트가 가능해야 합니다.

---

## 4. 🗄 데이터 및 Supabase 규칙

- **데이터베이스 접근:** `words` 테이블은 읽기 공개, `user_progress` 및 `review_logs`는 RLS(Row Level Security)를 통해 본인 레코드만 접근할 수 있도록 강제합니다.
- **AI 생성 콘텐츠:** AI가 생성한 예문은 즉시 `words` 테이블에 쓰지 않고 반드시 `ai_generated_examples` 테이블을 거쳐 검수 후 승인(`status = 'approved'`)되어야 합니다.
- **클라이언트 인스턴스:** Supabase 클라이언트는 싱글턴 패턴으로 관리하며 환경 변수는 `.env.local`을 참조합니다.

---

## 5. 🛠 작업 프로세스 및 코드 품질 규칙

- **언어 수준:** TypeScript strict 모드를 유지하며, 명시적인 이유 없이 `any` 타입 사용을 금지합니다.
- **아키텍처:** 웹 MVP 검증 후 Desktop(Electron) 및 Mobile(Capacitor)로 확장하는 구조입니다. 웹과 네이티브 코드를 명확히 분리하여, 핵심 UI는 Vue로 재사용하고 플랫폼 종속적인 로직만 분기 처리하세요.
- **보안:** API 키, DB 비밀번호, 기타 민감 정보는 어떠한 경우에도 코드 내에 하드코딩해서는 안 되며, 환경 변수(`.env.local`)를 통해서만 주입하세요. (해당 파일은 Git에 커밋되지 않습니다.)
- **테스트:** 알고리즘 및 데이터 파이프라인 관련 함수는 예외 케이스를 포함한 단위 테스트를 필수로 작성하세요.

---

## 6. 🤝 Git 및 커밋 규칙

- **브랜치 전략:** `feature/<topic>`, `fix/<topic>`, `chore/<topic>` 형식을 준수하여 작업 후 `main` 브랜치로 통합합니다.
- **Conventional Commits:** 커밋 메시지는 `feat:`, `fix:`, `docs:`, `chore:` 접두사를 활용해 명확하게 작성합니다.
  - 예: `feat: 라이트너 판정 순수 함수 구현`
- 원자적(Atomic) 커밋을 지향하며, 작업 단위가 너무 커지지 않도록 기능별로 나누어 커밋하십시오.
- 코드를 커밋하기 전에는 `bun run lint` 및 `bun run typecheck`를 실행하여 오류가 없는지 확인하세요.

---

## 7. 🔌 MCP 서버 활용 가이드

현재 프로젝트에는 `.mcp.json`에 정의된 MCP(Model Context Protocol) 도구들이 있습니다.
CLI나 수동 설정보다 다음 MCP를 우선적으로 활용하여 작업을 수행하십시오.

- `supabase`: DB 스키마 관리, RLS 설정, 마이그레이션. (`SUPABASE_ACCESS_TOKEN` 필요)
- `context7`: Quasar, Vue, Supabase 최신 공식 문서 실시간 참조용. (지식 부족/버전 변경 시 필수 사용)
- `chrome-devtools`: 웹 UI 및 동작 디버깅용.
- `netlify` / `github`: 배포 확인 및 PR/이슈 관리용 (필요 환경 변수 설정 시).
