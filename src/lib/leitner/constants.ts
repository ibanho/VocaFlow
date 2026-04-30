/**
 * 라이트너 알고리즘 상수 — docs/Phase0_Leitner_Algorithm.md 참조
 * 이 값을 변경하면 학습 리듬 전체에 영향이 있으므로 PRD 동기 갱신 필수.
 */

export type BoxLevel = 1 | 2 | 3 | 4 | 5;

export const BOX_INTERVALS_HOURS: Record<BoxLevel, number> = {
  1: 4, // 4시간
  2: 24, // 1일
  3: 72, // 3일
  4: 168, // 7일
  5: 336, // 14일
};

export const SLOW_RESPONSE_THRESHOLD_MS = 3000;
export const MAX_DAILY_NEW_WORDS = 20;
export const MAX_DAILY_REVIEWS = 100;
export const SKIP_DEFER_HOURS = 4;
export const INACTIVE_DEMOTION_DAYS = 30;
