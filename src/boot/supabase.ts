import { defineBoot } from '#q-app/wrappers';
import { getSupabase } from 'src/lib/supabase';

export default defineBoot(({ app }) => {
  // Renderer 바운더리: Supabase 클라이언트를 전역 주입 (필요 시 useSupabase 컴포저블로 대체 가능)
  app.config.globalProperties.$supabase = (() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  })();
});
