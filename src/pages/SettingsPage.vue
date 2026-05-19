<template>
  <q-page class="q-pa-md bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <div class="col-12 col-md-8">
        
        <div class="text-h4 text-weight-bold text-dark q-mb-lg flex items-center">
          <q-icon name="settings" color="primary" class="q-mr-sm" />
          설정 및 관리
        </div>

        <!-- AI Example Admin UI -->
        <q-card flat bordered class="bg-white shadow-2">
          <q-card-section>
            <div class="text-h6 text-weight-bold q-mb-md flex items-center justify-between">
              <div>
                <q-icon name="smart_toy" color="primary" class="q-mr-sm" />
                AI 생성 예문 검수
              </div>
              <q-badge color="orange" text-color="white" :label="`${pendingExamples.length} 대기 중`" />
            </div>
            
            <div v-if="loading" class="text-center q-pa-md">
              <q-spinner color="primary" size="2em" />
            </div>
            
            <div v-else-if="pendingExamples.length === 0" class="text-center q-pa-xl text-grey-6">
              <q-icon name="done_all" size="50px" class="q-mb-md opacity-50" />
              <div class="text-h6">검수 대기 중인 예문이 없습니다.</div>
            </div>

            <q-list separator v-else>
              <q-item v-for="item in pendingExamples" :key="item.id" class="q-py-md column">
                <div class="row items-center q-mb-sm">
                  <div class="text-h6 text-primary text-weight-bold q-mr-md">{{ item.words.word }}</div>
                  <div class="text-caption text-grey-8">{{ item.words.meaning }} ({{ item.words.pos }})</div>
                </div>
                
                <div class="bg-grey-2 q-pa-md rounded-borders q-mb-sm">
                  <div class="text-body1 text-weight-medium q-mb-xs">EN: {{ item.example_en }}</div>
                  <div class="text-body2 text-grey-8">KO: {{ item.example_ko }}</div>
                </div>

                <div class="row justify-end q-gutter-sm">
                  <q-btn color="negative" outline label="거절" @click="handleReview(item.id, 'rejected')" :loading="processingId === item.id" />
                  <q-btn color="positive" unelevated label="승인" @click="handleReview(item.id, 'approved', item)" :loading="processingId === item.id" />
                </div>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- General Settings Placeholder -->
        <q-card flat bordered class="bg-white shadow-2 q-mt-lg">
          <q-card-section>
            <div class="text-h6 text-weight-bold q-mb-md">일반 설정</div>
            <q-list>
              <q-item clickable v-ripple @click="handleLogout">
                <q-item-section avatar>
                  <q-icon color="negative" name="logout" />
                </q-item-section>
                <q-item-section class="text-negative text-weight-bold">로그아웃</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/authStore';
import { getSupabase } from 'src/lib/supabase';
import { useQuasar } from 'quasar';

const authStore = useAuthStore();
const router = useRouter();
const supabase = getSupabase();
const $q = useQuasar();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pendingExamples = ref<any[]>([]);
const loading = ref(true);
const processingId = ref<number | null>(null);

const fetchPending = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from('ai_generated_examples')
    .select(`
      id,
      word_id,
      example_en,
      example_ko,
      words ( word, meaning, pos )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (!error && data) {
    pendingExamples.value = data;
  }
  loading.value = false;
};

onMounted(() => {
  fetchPending();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleReview = async (id: number, status: 'approved' | 'rejected', item?: any) => {
  processingId.value = id;
  try {
    // 1. Update status
    const { error: updateError } = await supabase
      .from('ai_generated_examples')
      .update({
        status,
        reviewed_by: authStore.user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 2. If approved, update the words table
    if (status === 'approved' && item) {
      const { error: wordError } = await supabase
        .from('words')
        .update({
          example_en: item.example_en,
          example_ko: item.example_ko
        })
        .eq('id', item.word_id);
      
      if (wordError) throw wordError;
    }

    $q.notify({
      type: status === 'approved' ? 'positive' : 'warning',
      message: status === 'approved' ? '예문이 승인되어 단어장에 반영되었습니다.' : '예문이 거절되었습니다.'
    });

    // Remove from list
    pendingExamples.value = pendingExamples.value.filter(ex => ex.id !== id);

  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: '오류가 발생했습니다.' });
  } finally {
    processingId.value = null;
  }
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/auth');
};
</script>
