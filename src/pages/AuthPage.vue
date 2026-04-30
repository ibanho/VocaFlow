<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center bg-grey-1">
        <q-card class="auth-card shadow-3 q-pa-md">
          <q-card-section class="text-center">
            <div class="text-h5 text-primary text-weight-bold q-mb-sm">VocaFlow</div>
            <div class="text-subtitle2 text-grey-7">{{ isLogin ? '다시 돌아오신 것을 환영합니다' : '수능 영어를 정복할 준비가 되셨나요?' }}</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit.prevent="onSubmit" class="q-gutter-md">
              <q-input
                v-model="email"
                type="email"
                label="이메일"
                outlined
                dense
                :rules="[val => !!val || '이메일을 입력해주세요']"
                lazy-rules
              >
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>

              <q-input
                v-model="password"
                type="password"
                label="비밀번호"
                outlined
                dense
                :rules="[val => !!val || '비밀번호를 입력해주세요', val => val.length >= 6 || '비밀번호는 6자 이상이어야 합니다']"
                lazy-rules
              >
                <template v-slot:prepend>
                  <q-icon name="lock" />
                </template>
              </q-input>

              <div class="q-mt-lg">
                <q-btn
                  type="submit"
                  color="primary"
                  :label="isLogin ? '로그인' : '회원가입'"
                  class="full-width"
                  unelevated
                  :loading="loading"
                />
              </div>
            </q-form>
          </q-card-section>

          <q-card-section class="text-center q-pt-none">
            <q-btn
              flat
              color="secondary"
              :label="isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'"
              @click="toggleMode"
              class="full-width text-caption"
            />
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { getSupabase } from 'src/lib/supabase';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const supabase = getSupabase();

const isLogin = ref(true);
const email = ref('');
const password = ref('');
const loading = ref(false);

const toggleMode = () => {
  isLogin.value = !isLogin.value;
};

const onSubmit = async () => {
  loading.value = true;
  try {
    if (isLogin.value) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      });
      if (error) throw error;
      $q.notify({ type: 'positive', message: '로그인 성공!' });
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      });
      if (error) throw error;
      $q.notify({ type: 'positive', message: '가입 확인 이메일을 전송했습니다.' });
    }
    
    // Redirect if there's a redirect query, else home
    const redirectPath = route.query.redirect as string || '/';
    router.push(redirectPath);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '인증 오류가 발생했습니다.';
    $q.notify({
      type: 'negative',
      message: errorMessage,
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
}
</style>
