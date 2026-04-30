---
marp: true
theme: gaia
header: 'VocaFlow: 스마트 영어 단어장 프로젝트'
footer: '1타 강사의 노하우와 일렉트론 기술의 결합'
backgroundColor: #ffffff
paginate: true
style: |
  section {
    font-family: 'Noto Sans KR', sans-serif;
  }
  h1 {
    color: #1976D2;
  }
  h2 {
    border-bottom: 2px solid #1976D2;
    padding-bottom: 10px;
  }
  code {
    background: #f4f4f4;
    color: #d81b60;
  }
---

# 📘 VocaFlow 프로젝트 기획서
### 고2 수능 영어 정복을 위한 일렉트론 기반 스마트 단어장


---

## 1. 학습 전략: 왜 지금인가?

- **고2 영어의 중요성:** 고3 때 국어/수학 시간을 벌기 위한 전략적 요충지
- **절대평가 공략:** 안정적인 1등급(90점)을 위한 시스템 구축 필요
- **단어 암기의 고질적 문제:** '밑 빠진 독에 물 붓기'식 암기 탈피

> "단어는 머리가 아니라 **시스템**으로 외우는 것이다."

---

## 2. 뇌과학 기반 암기 시스템 (Core Logic)

1. **노출 빈도:** 1분씩 10번 보는 '눈도장' 전략
2. **아웃풋 학습:** 인출(Recall) 훈련을 통한 장기 기억 전환
3. **어원/접사:** 무작정 암기가 아닌 논리적 이해 (pre-, dict- 등)
4. **덩어리 암기:** 문맥(Collocation) 속에서 단어의 쓰임 파악
5. **골든 타임:** 취침 전 10분 복습의 마법

---

## 3. 앱 콘셉트: VocaFlow

- **이름:** VocaFlow (단어가 머릿속으로 흐르다)
- **핵심 기능:** 라이트너 시스템(Leitner System) 자동화
- **사용자 경험:** - 직관적인 플래시카드 인터페이스
  - 망각 곡선에 따른 복습 알림
  - 개인별 맞춤형 오답 노트

---

## 4. UI/UX 디자인 가이드 (Material Design 3)

- **테마 컬러:** Primary `#1976D2` (신뢰), Secondary `#26A69A` (집중)
- **서체:** 영문(Roboto), 국문(Noto Sans KR)
- **주요 컴포넌트:**
  - **Cards:** 단어 노출을 위한 플래시카드 (`q-card`)
  - **Progress:** 일일 목표 달성 시각화 (`q-linear-progress`)
  - **Animation:** 카드 뒤집기 및 스와이프 인터랙션

---

## 5. 기술 아키텍처: Quasar 멀티 타겟 (Web First)

- **Frontend:** Vue 3, TypeScript, Quasar Framework (SPA/PWA/Electron/Capacitor 단일 코드베이스)
- **Backend:** Supabase (PostgreSQL, Auth, Real-time, Storage)
- **패키지 매니저:** **Bun** (빠른 설치·네이티브 TS 실행)
- **런칭 순서:**
  1. **Web (Netlify 배포)** — MVP, PWA 활성화로 모바일 브라우저 대응
  2. **Desktop (Electron)** — 시스템 트레이, 전역 단축키, 골든타임 알림
  3. **Android (Capacitor)** — Play Store 배포
  4. **iOS (Capacitor)** — App Store 배포

### 왜 Web First인가?
- **진입장벽 최소화:** 설치 불필요, URL 공유만으로 즉시 사용
- **빠른 피드백 루프:** Netlify 자동 배포 → 반복 개선 속도 극대화
- **검증 후 네이티브:** 웹에서 핵심 UX 검증 완료 후 플랫폼별 기능 확장
- **Quasar의 강점:** `quasar build -m spa/pwa/electron/capacitor` 단일 커맨드로 멀티 타겟

---

## 6. 플랫폼별 런타임 전략

### 6.1 Web (Netlify) — 1차 런칭
- **배포:** Netlify (GitHub 연동 자동 배포, 프리뷰 URL)
- **PWA 활성화:** Service Worker로 오프라인 단어장·설치형 경험
- **도메인:** `vocaflow.app` (예정)
- **Supabase 연동:** 브라우저 직접 연결, RLS로 보안 보장

### 6.2 Electron (Desktop) — 2차
- **Main Process:** 창 관리, 시스템 트레이, 전역 단축키, 로컬 파일 접근
- **Renderer Process:** 웹 앱과 동일한 Vue 코드 재사용
- **Context Bridge:** `window.api` IPC — `nodeIntegration: false`

### 6.3 Capacitor (Android/iOS) — 3·4차
- 동일 Vue 코드 + 네이티브 플러그인 (푸시 알림, 오디오, 햅틱)
- 웹에서 검증된 UX 그대로 이식

---

## 7. 데이터베이스 설계 (Schema v2)

### Table: `words` (사전 데이터)
- `word`, `meaning`, `pos` (품사), `difficulty` (1~5, 수능 기준)
- `example_en`, `example_ko`, `root_info` (어원/접사)
- `collocations[]` (덩어리 표현), `synonyms[]`, `antonyms[]`
- `audio_url`, `source` (수능/모의고사/EBS 출처 태그)

### Table: `user_progress` (개인 기록)
- `user_id`, `word_id`, `box_level` (1~5), `next_review_at`
- `wrong_count`, `correct_streak`, `avg_response_ms`
- `last_seen_at`, `first_learned_at`

### Table: `review_logs` (인출 이력, 오답 노트 근거)
- `user_id`, `word_id`, `result` (pass/fail), `response_ms`, `reviewed_at`

### Table: `ai_generated_examples` (LLM 예문 검수 큐)
- `word_id`, `example_en`, `example_ko`, `status` (pending/approved/rejected), `reviewed_by`

### Table: `dictionary_cache` (외부 사전 API 응답 캐시)
- PK: (`word`, `provider`) — provider ∈ `free-dict`/`mw`/`papago`/`datamuse`
- `payload` (JSONB 원본), `fetched_at`, `expires_at` (TTL 30일)
- 조회 순서: `words` → `dictionary_cache` → 외부 API → 캐시 저장
- RLS: 공용 캐시 — 읽기 공개, 쓰기는 서비스 롤만

> **AI 예문 가이드라인:** 수능 지문 톤(교육적·중립적), CEFR B1~B2 난이도, 문장당 15~25 단어. 검수 통과 전까지 학습 노출 금지.

---

## 8. 라이트너 알고리즘 스펙

### 박스별 복습 주기 (Spaced Repetition)
| Box | 주기 | 의미 |
|-----|------|------|
| 1 | 당일 (4시간 후) | 신규/오답 단어 |
| 2 | 1일 후 | 1차 통과 |
| 3 | 3일 후 | 단기 기억 진입 |
| 4 | 7일 후 | 중기 기억 |
| 5 | 14일 후 → 30일 후 | 장기 기억 (마스터) |

### 승급/강등 규칙
- **정답 + 응답 ≤ 3초:** `box_level = min(5, current + 1)` 승급, `correct_streak += 1`
- **정답 + 응답 > 3초:** 박스 유지 (승급 보류) — 인출 속도 반영
- **오답:** `box_level = max(1, current - 2)`, `wrong_count += 1` (2단계 강등으로 재학습 강제)
- **스킵(응답 없이 넘김):** 판정 보류, `next_review_at = now + 4h`

### 세션·유지 정책
- **일일 한도:** 신규 20 단어, 복습 100 단어 (집중도 유지)
- **30일 미접속 시:** Box 3 이상 단어를 Box 2로 일괄 강등 (기억 재활성화)
- **골든타임:** 사용자 지정 시각(기본 22:00) ± 30분 윈도우에 Box 1~2 단어 우선 노출, `review_logs.is_golden_hour = true` 기록

---

## 9. 영단어 데이터 수급 전략

### 9.1 오픈소스 시드 (무료·합법)
| 소스 | 규모 | 용도 |
|------|------|------|
| **CEFR-J Wordlist** | A1~B2 약 7,800개 | 난이도 자동 매핑 (A1=1 ~ C1=5) |
| **NGSL** | 상위 2,800 고빈도 | 필수 어휘 베이스 |
| **NAWL** | 학술 어휘 963개 | 수능 지문 톤 매칭 |
| **COCA 빈도 리스트** | 5,000/20,000 | 빈도 가중치 |
| **Wiktionary / WordNet** | 덤프 전체 | 뜻·품사·동의어·어원 |

### 9.2 수능 특화 코퍼스 (핵심 차별점)
- **평가원 기출 지문 빈도 분석:** 최근 10년 수능/모평 토큰화 → Python `spaCy` 표제어 추출 → 빈도순 정렬
- **EBS 수능특강/수능완성 어휘:** 교재 어휘 추출 (개인 학습 목적, 재배포 불가)
- 상용 단어장(능률/워드마스터 등)은 **저작권상 수급 불가** — 참고만

### 9.3 한글 뜻 소스
- **KorLex (Open Multilingual WordNet)** — 학술용 무료
- **국립국어원 표준국어대사전 API** — 공공데이터포털 신청
- **Stardict 오픈 사전 덤프** — 백업 소스

### 9.4 데이터 파이프라인
```
[1] CEFR-J + NGSL → 3,000개 시드 임포트 (difficulty 자동 태깅)
[2] KorLex/사전 API로 한글 뜻 매핑
[3] 기출 코퍼스에서 KWIC 추출 → 진짜 수능 예문 확보
[4] 부족분은 LLM 생성 → ai_generated_examples 검수 큐
[5] Etymonline 크롤링(robots 준수) 또는 LLM으로 어원/접사 보강
```

### 9.5 MVP 최소 구성 (3,000 단어)
- CEFR-J B1~B2 약 2,000개
- 수능 기출 고빈도 상위 1,000개 (직접 추출)
- 중복 제거 후 `source` 컬럼에 `CEFR-J`/`NGSL`/`수능기출` 태깅

### 9.6 사전 API 연동 (Phase 4 — 단어 직접 추가 기능)
| API | 한도 | 용도 |
|-----|------|------|
| **Free Dictionary API** (dictionaryapi.dev) | 무제한·무인증 | 영영 뜻/발음/예문 1차 소스 |
| **Merriam-Webster Learner's** | 1,000/일 | 학습자 정제 예문 품질 보강 |
| **Papago Translation** (네이버 OpenAPI) | 10,000/일 | 한글 뜻 자동 생성 |
| **Datamuse API** | 무제한·무인증 | 동의어/연관어 → `synonyms[]` |
| **Wiktionary 파싱** | 덤프/REST | 어원·접사 보강 |

**조회 우선순위:** `words` → `dictionary_cache` (TTL 30일) → 외부 API → 캐시 저장 → `ai_generated_examples` 검수 큐

**보안 원칙:** API 키는 Electron Main Process `.env`에만 저장, Renderer는 `window.api.lookupWord()` IPC로만 접근. 키를 Renderer 번들에 포함 금지.

---

## 10. 성공 지표 (KPIs)

- **학습 지표:** 일일 복습 완료율 ≥ 80%, 7일 리텐션 ≥ 60%
- **시스템 지표:** Box 5 도달 단어 수 (주간), 평균 인출 응답시간 단축률
- **최종 목표:** 사용자 자체 모의고사 영어 등급 추적 (옵트인)

---

## 11. 향후 로드맵 (Milestones)

### Phase 0: 스펙 확정 ✅
- 데이터 모델 v2 + 라이트너 알고리즘 스펙 문서화

### Phase 1: Web MVP (Netlify 런칭)
- Supabase Auth + DB 스키마 DDL 적용
- Quasar SPA 모드 + 라이트너 복습 엔진 + 플래시카드 UI
- 시드 단어 3,000개 임포트
- **Netlify 자동 배포** + PWA 매니페스트
- 목표: 실사용자 테스트 시작

### Phase 2: Web 고도화
- 오답 노트 대시보드 + AI 예문 검수 워크플로우
- 통계 / 리텐션 분석 + 주간 학습 리포트 (이메일)
- 사전 API 연동 (단어 직접 추가 기능)

### Phase 3: Desktop (Electron)
- Electron 패키징 (Win/Mac/Linux)
- 시스템 트레이 + 골든타임 복습 알림
- 전역 단축키

### Phase 4: Android (Capacitor)
- Capacitor 빌드 + 네이티브 푸시 알림
- Play Store 출시

### Phase 5: iOS (Capacitor)
- iOS 빌드 + Apple 푸시 (APNs)
- App Store 출시

---

# Q&A
## 성공적인 개발과 수능 1등급을 응원합니다!