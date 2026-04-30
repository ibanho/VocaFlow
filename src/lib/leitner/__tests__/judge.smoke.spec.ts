import { describe, it, expect } from 'vitest';
import { judgeReview } from '../judge';

describe('leitner scaffold smoke test', () => {
  it('정답 + 빠른 응답: Box 2 → 3 승급', () => {
    const now = new Date('2026-04-24T00:00:00Z');
    const r = judgeReview({ is_correct: true, response_ms: 1200, current_box: 2, now });
    expect(r.next_box).toBe(3);
    expect(r.reason).toBe('PROMOTE');
  });

  it('정답 + 느린 응답: Box 2 유지', () => {
    const now = new Date('2026-04-24T00:00:00Z');
    const r = judgeReview({ is_correct: true, response_ms: 3500, current_box: 2, now });
    expect(r.next_box).toBe(2);
    expect(r.reason).toBe('SLOW_RESPONSE_HOLD');
  });

  it('오답: Box 3 → 1 강등 (2단계)', () => {
    const now = new Date('2026-04-24T00:00:00Z');
    const r = judgeReview({ is_correct: false, response_ms: 1500, current_box: 3, now });
    expect(r.next_box).toBe(1);
    expect(r.reason).toBe('WRONG_ANSWER');
  });

  it('오답: Box 2 → 1 (최소값 클램프)', () => {
    const now = new Date('2026-04-24T00:00:00Z');
    const r = judgeReview({ is_correct: false, response_ms: 2000, current_box: 2, now });
    expect(r.next_box).toBe(1);
    expect(r.reason).toBe('WRONG_ANSWER');
  });

  it('정답: Box 5 → 5 (최대값 클램프)', () => {
    const now = new Date('2026-04-24T00:00:00Z');
    const r = judgeReview({ is_correct: true, response_ms: 1000, current_box: 5, now });
    expect(r.next_box).toBe(5);
    expect(r.reason).toBe('MASTERED');
  });
});
