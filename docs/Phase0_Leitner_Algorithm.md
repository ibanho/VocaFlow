# VocaFlow Phase 0: 라이트너 알고리즘 스펙

> **목적:** 복습 엔진 구현 전 알고리즘을 확정하여 Phase 2 개발 시 모호성 제거
> **버전:** v1.0 (2026-04-24)

---

## 1. 핵심 개념

- **Box(박스):** 단어의 숙련도 단계 (1~5)
- **Leitner System:** 정답 시 상위 박스로, 오답 시 하위 박스로 이동
- **Spaced Repetition:** 박스가 높을수록 복습 주기가 길어짐

---

## 2. 박스별 복습 주기

| Box | 다음 복습까지 | 상태 | 일일 노출 우선순위 |
|-----|-------------|------|-----------------|
| 1   | 4시간       | 신규/오답 | **최우선** |
| 2   | 1일         | 1차 통과 | 높음 |
| 3   | 3일         | 단기 기억 | 중간 |
| 4   | 7일         | 중기 기억 | 낮음 |
| 5   | 14일        | 장기 기억 | 최저 |
| 5+  | 30일 → 90일 | 마스터   | 유지 확인 |

---

## 3. 승급/강등 규칙

### 3.1 판정 입력
- `is_correct: boolean` — 사용자가 뜻을 맞췄는가
- `response_ms: number` — 카드 노출부터 답변까지 경과시간
- `current_box: 1~5`

### 3.2 판정 로직 (의사코드)

```typescript
function judgeReview(input: ReviewInput): ReviewResult {
  const { is_correct, response_ms, current_box } = input;

  // 1) 오답: 2단계 강등 (최소 Box 1)
  if (!is_correct) {
    return {
      next_box: Math.max(1, current_box - 2),
      next_review_at: addHours(now(), BOX_INTERVALS[1]),
      reason: "WRONG_ANSWER",
    };
  }

  // 2) 정답이지만 응답 느림 (3초 초과): 승급 보류
  if (response_ms > 3000) {
    return {
      next_box: current_box, // 유지
      next_review_at: addHours(now(), BOX_INTERVALS[current_box]),
      reason: "SLOW_RESPONSE_HOLD",
    };
  }

  // 3) 정답 + 빠른 응답: 승급
  const next = Math.min(5, current_box + 1);
  return {
    next_box: next,
    next_review_at: addHours(now(), BOX_INTERVALS[next]),
    reason: "PROMOTE",
  };
}
```

### 3.3 상수 정의

```typescript
const BOX_INTERVALS = {
  1: 4,       // 4시간
  2: 24,      // 1일
  3: 72,      // 3일
  4: 168,     // 7일
  5: 336,     // 14일
};

const SLOW_RESPONSE_THRESHOLD_MS = 3000;
const MAX_DAILY_NEW_WORDS = 20;
const MAX_DAILY_REVIEWS = 100;
```

---

## 4. 일일 세션 구성 알고리즘

### 4.1 세션 생성 쿼리 우선순위

```sql
-- 1순위: 복습 기한 도래한 단어 (next_review_at <= now())
-- 2순위: Box 1 (오답/신규) 중 미노출
-- 3순위: 신규 단어 (user_progress 레코드 없음) — 일일 한도 내
```

### 4.2 세션 구성 의사코드

```typescript
async function buildSession(userId: string): Promise<Card[]> {
  const due = await fetchDueReviews(userId);           // next_review_at <= now
  const overdueLimited = due.slice(0, MAX_DAILY_REVIEWS);

  const newWordsQuota = Math.max(0, MAX_DAILY_NEW_WORDS - countTodayNew(userId));
  const fresh = await fetchNewWords(userId, newWordsQuota);

  // 낮은 박스부터 + 신규 단어를 3:1 비율로 인터리빙 (집중도 유지)
  return interleave(overdueLimited, fresh, 3, 1);
}
```

---

## 5. 골든 타임 복습 (취침 전 10분)

- 사용자 지정 시각(기본 22:00) ± 30분 윈도우에 **시스템 트레이 알림**
- 해당 세션은 **당일 Box 1~2 단어 우선** 노출 (단기→장기 전환 강화)
- 골든 타임 완료 시 `box_level` 승급 판정에 **보너스 플래그** 기록 (분석용)

---

## 6. 엣지 케이스

| 상황 | 처리 |
|------|------|
| 연속 오답 3회 | `wrong_count` 누적 → "집중 학습" 배지, 해당 단어 어원/예문 강제 노출 |
| 30일 미접속 | Box 3 이상 단어를 Box 2로 일괄 강등 (기억 재활성화) |
| 응답 없이 스킵 | 판정 보류, `next_review_at = now + 4h` |
| 뜻 2개 중 1개만 입력 | 부분 정답 → Box 유지 (승급 안 함) |

---

## 7. 검증 테스트 케이스

```typescript
describe("judgeReview", () => {
  it("정답+빠른응답: Box 2 → 3 승급", () => { ... });
  it("정답+느린응답: Box 2 유지", () => { ... });
  it("오답: Box 3 → 1 강등 (2단계)", () => { ... });
  it("오답: Box 2 → 1 (최소값 클램프)", () => { ... });
  it("정답: Box 5 → 5 (최대값 클램프)", () => { ... });
});
```
