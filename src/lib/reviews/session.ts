import { repository, type Card } from './repository';
import { MAX_DAILY_NEW_WORDS, MAX_DAILY_REVIEWS } from '../leitner/constants';

export async function buildSession(userId: string): Promise<Card[]> {
  // 1. Fetch due reviews
  const due = await repository.fetchDueReviews(userId, MAX_DAILY_REVIEWS);

  // 2. Fetch new words quota
  await repository.getTodayReviewCount(userId); // Use if needed later
  // Optional: We can count only new word insertions for today, but for MVP we simplify
  // by just checking how many we have done today. Let's assume we want to fill up to MAX_DAILY_NEW_WORDS.
  // Actually, a more precise way is to count today's new word encounters, but this requires more complex queries.
  // We'll just fetch a static quota for now, assuming the user hasn't exhausted it if it's a new session.
  // In a robust implementation, we track "todayNewCount". Here we just use a flat quota.
  const newWordsQuota = MAX_DAILY_NEW_WORDS; 
  const fresh = await repository.fetchNewWords(userId, newWordsQuota);

  return interleave(due, fresh, 3, 1);
}

/**
 * Interleaves two arrays based on a ratio.
 * For example, interleave(arrA, arrB, 3, 1) will try to place 3 items from arrA, then 1 from arrB.
 */
function interleave<T>(arrA: T[], arrB: T[], ratioA: number, ratioB: number): T[] {
  const result: T[] = [];
  let i = 0;
  let j = 0;

  while (i < arrA.length || j < arrB.length) {
    // Add up to ratioA items from arrA
    for (let count = 0; count < ratioA && i < arrA.length; count++) {
      result.push(arrA[i++] as T);
    }
    // Add up to ratioB items from arrB
    for (let count = 0; count < ratioB && j < arrB.length; count++) {
      result.push(arrB[j++] as T);
    }
  }

  return result;
}
