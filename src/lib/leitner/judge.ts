import {
  BOX_INTERVALS_HOURS,
  SKIP_DEFER_HOURS,
  SLOW_RESPONSE_THRESHOLD_MS,
  type BoxLevel,
} from './constants';

export type ReviewReason =
  | 'WRONG_ANSWER'
  | 'SLOW_RESPONSE_HOLD'
  | 'PROMOTE'
  | 'SKIP'
  | 'MASTERED';

export interface ReviewInput {
  is_correct: boolean;
  response_ms: number;
  current_box: BoxLevel;
  now: Date;
}

export interface SkipInput {
  current_box: BoxLevel;
  now: Date;
}

export interface ReviewResult {
  next_box: BoxLevel;
  next_review_at: Date;
  reason: ReviewReason;
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function clampBox(n: number): BoxLevel {
  if (n < 1) return 1;
  if (n > 5) return 5;
  return n as BoxLevel;
}

/**
 * 라이트너 판정 — 순수 함수. DB·Date.now() 의존 없음.
 * 상세 규칙은 docs/Phase0_Leitner_Algorithm.md §3 참조.
 */
export function judgeReview(input: ReviewInput): ReviewResult {
  const { is_correct, response_ms, current_box, now } = input;

  if (!is_correct) {
    const next: BoxLevel = clampBox(current_box - 2);
    return {
      next_box: next,
      next_review_at: addHours(now, BOX_INTERVALS_HOURS[next]),
      reason: 'WRONG_ANSWER',
    };
  }

  if (response_ms > SLOW_RESPONSE_THRESHOLD_MS) {
    return {
      next_box: current_box,
      next_review_at: addHours(now, BOX_INTERVALS_HOURS[current_box]),
      reason: 'SLOW_RESPONSE_HOLD',
    };
  }

  const next = clampBox(current_box + 1);
  return {
    next_box: next,
    next_review_at: addHours(now, BOX_INTERVALS_HOURS[next]),
    reason: next === 5 && current_box === 5 ? 'MASTERED' : 'PROMOTE',
  };
}

/**
 * 스킵 판정 — 판정 보류, next_review_at = now + 4h.
 */
export function judgeSkip(input: SkipInput): ReviewResult {
  return {
    next_box: input.current_box,
    next_review_at: addHours(input.now, SKIP_DEFER_HOURS),
    reason: 'SKIP',
  };
}

/**
 * Box 레벨 기준 다음 복습 시각 계산 (공용 헬퍼).
 */
export function buildNextReviewAt(box: BoxLevel, from: Date): Date {
  return addHours(from, BOX_INTERVALS_HOURS[box]);
}
