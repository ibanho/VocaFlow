import { getSupabase } from '../supabase';
import { type ReviewInput, judgeReview, type ReviewResult, type SkipInput, judgeSkip } from '../leitner/judge';
import type { BoxLevel } from '../leitner/constants';

export interface Card {
  id: string; // word_id
  word: string;
  meaning: string;
  pos: string;
  source: string;
  box_level: number;
  is_new: boolean;
}

export const repository = {
  async fetchDueReviews(userId: string, limit = 100): Promise<Card[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_progress')
      .select(`
        word_id,
        box_level,
        next_review_at,
        words ( id, word, meaning, pos, source )
      `)
      .eq('user_id', userId)
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      id: row.words.id,
      word: row.words.word,
      meaning: row.words.meaning,
      pos: row.words.pos,
      source: row.words.source,
      box_level: row.box_level,
      is_new: false,
    }));
  },

  async fetchNewWords(userId: string, quota: number): Promise<Card[]> {
    if (quota <= 0) return [];
    const supabase = getSupabase();

    // MVP: Get all learned word IDs to exclude them.
    const { data: progress } = await supabase
      .from('user_progress')
      .select('word_id')
      .eq('user_id', userId);

    const learnedIds = (progress || []).map((p: { word_id: string }) => p.word_id);

    let query = supabase
      .from('words')
      .select('*')
      .order('difficulty', { ascending: true })
      .limit(quota);

    if (learnedIds.length > 0) {
      query = query.not('id', 'in', `(${learnedIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((w: any) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
      pos: w.pos,
      source: w.source,
      box_level: 0, // 0 indicates it's a new word
      is_new: true,
    }));
  },

  async getTodayReviewCount(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const supabase = getSupabase();

    const { count, error } = await supabase
      .from('review_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('reviewed_at', startOfDay.toISOString());

    if (error) throw error;
    return count || 0;
  },

  async submitReview(
    userId: string,
    wordId: string,
    input: ReviewInput
  ): Promise<ReviewResult> {
    // 1. Get judge result (Adjust box 0 to box 1 to prevent DB constraints and NaN review intervals)
    const adjustedBox = (input.current_box as any) === 0 ? 1 : input.current_box;
    const adjustedInput: ReviewInput = {
      ...input,
      current_box: adjustedBox as BoxLevel
    };
    const result = judgeReview(adjustedInput);
    const supabase = getSupabase();

    // 2. Insert to review_logs (Mapped to DB schema column: result)
    const { error: logError } = await supabase.from('review_logs').insert({
      user_id: userId,
      word_id: wordId,
      box_before: adjustedBox,
      box_after: result.next_box,
      result: input.is_correct ? 'pass' : 'fail',
      response_ms: input.response_ms,
      reviewed_at: input.now.toISOString(),
    });

    if (logError) throw logError;

    // 3. Get current stats to update streak and wrong count
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('wrong_count, correct_streak')
      .eq('user_id', userId)
      .eq('word_id', wordId);

    const curr = progressData && progressData.length > 0 ? progressData[0] : null;

    let wrongCount = curr?.wrong_count || 0;
    let correctStreak = curr?.correct_streak || 0;

    if (input.is_correct) {
      correctStreak += 1;
    } else {
      wrongCount += 1;
      correctStreak = 0;
    }

    // 4. Upsert to user_progress
    const { error: progError } = await supabase.from('user_progress').upsert({
      user_id: userId,
      word_id: wordId,
      box_level: result.next_box,
      next_review_at: result.next_review_at.toISOString(),
      wrong_count: wrongCount,
      correct_streak: correctStreak,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, word_id' });

    if (progError) throw progError;
    return result;
  },

  async submitSkip(
    userId: string,
    wordId: string,
    input: SkipInput
  ): Promise<ReviewResult> {
    const supabase = getSupabase();
    // Adjust box 0 to box 1 to prevent DB check constraint violation (box_after >= 1)
    const adjustedBox = (input.current_box as any) === 0 ? 1 : input.current_box;
    const adjustedInput: SkipInput = {
      ...input,
      current_box: adjustedBox as BoxLevel
    };
    const result = judgeSkip(adjustedInput);

    // 1. Insert to review_logs for skip record
    const { error: logError } = await supabase.from('review_logs').insert({
      user_id: userId,
      word_id: wordId,
      box_before: adjustedBox,
      box_after: result.next_box,
      result: 'skip',
      response_ms: null,
      reviewed_at: input.now.toISOString(),
    });

    if (logError) throw logError;

    // 2. Upsert to user_progress
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('wrong_count, correct_streak')
      .eq('user_id', userId)
      .eq('word_id', wordId);

    const curr = progressData && progressData.length > 0 ? progressData[0] : null;

    const { error: progError } = await supabase.from('user_progress').upsert({
      user_id: userId,
      word_id: wordId,
      box_level: result.next_box,
      next_review_at: result.next_review_at.toISOString(),
      wrong_count: curr?.wrong_count || 0,
      correct_streak: curr?.correct_streak || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, word_id' });

    if (progError) throw progError;
    return result;
  },

  async getBoxDistribution(userId: string): Promise<Record<number, number>> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('v_box_distribution')
      .select('box_level, word_count')
      .eq('user_id', userId);

    if (error) throw error;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data || []).forEach((row: any) => {
      distribution[row.box_level] = parseInt(row.word_count, 10);
    });
    
    return distribution;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getFrequentWrongWords(userId: string, limit = 20): Promise<any[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_progress')
      .select(`
        wrong_count,
        correct_streak,
        words ( id, word, meaning, pos )
      `)
      .eq('user_id', userId)
      .gt('wrong_count', 0)
      .order('wrong_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      id: row.words.id,
      word: row.words.word,
      meaning: row.words.meaning,
      pos: row.words.pos,
      wrongCount: row.wrong_count,
      streak: row.correct_streak,
    }));
  },
};
