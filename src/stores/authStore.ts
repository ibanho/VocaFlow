import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getSupabase } from 'src/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const loading = ref(true);

  const supabase = getSupabase();

  const initialize = async () => {
    loading.value = true;
    try {
      const { data } = await supabase.auth.getSession();
      session.value = data.session;
      user.value = data.session?.user ?? null;

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, currentSession) => {
        session.value = currentSession;
        user.value = currentSession?.user ?? null;
      });
    } catch (error) {
      console.error('Error getting session:', error);
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    loading,
    initialize,
    logout,
  };
});
