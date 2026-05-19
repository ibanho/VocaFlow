<template>
  <q-page class="q-pa-md bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <div class="col-12 col-md-8">
        
        <!-- Header -->
        <div class="text-h4 text-weight-bold text-dark q-mb-lg flex items-center">
          <q-icon name="menu_book" color="primary" class="q-mr-sm" />
          단어장 및 오답 노트
        </div>

        <div v-if="loading" class="text-center q-pa-xl">
          <q-spinner color="primary" size="3em" />
        </div>

        <template v-else>
          <!-- Box Distribution -->
          <q-card flat bordered class="q-mb-xl bg-white shadow-2">
            <q-card-section>
              <div class="text-h6 text-weight-bold q-mb-md">현재 암기 단계 (Box 분포)</div>
              <div class="row q-col-gutter-sm text-center">
                <div v-for="level in 5" :key="level" class="col">
                  <q-card flat bordered class="bg-grey-2">
                    <q-card-section class="q-pa-sm">
                      <div class="text-caption text-grey-8 text-weight-bold">Box {{ level }}</div>
                      <div class="text-h6 text-primary text-weight-bold">{{ boxDistribution[level] || 0 }}</div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Wrong Words List -->
          <q-card flat bordered class="bg-white shadow-2">
            <q-card-section>
              <div class="text-h6 text-weight-bold q-mb-md">자주 틀린 단어 TOP 20</div>
              
              <q-list separator v-if="wrongWords.length > 0">
                <q-item v-for="item in wrongWords" :key="item.id" class="q-py-md">
                  <q-item-section>
                    <q-item-label class="text-h6 text-primary text-weight-bold">{{ item.word }}</q-item-label>
                    <q-item-label caption class="text-body1 text-dark">{{ item.meaning }}</q-item-label>
                  </q-item-section>
                  
                  <q-item-section side>
                    <q-badge color="negative" class="q-pa-xs">
                      <q-icon name="close" color="white" size="xs" />
                      <span class="q-ml-xs text-weight-bold text-subtitle2">{{ item.wrongCount }}회 오답</span>
                    </q-badge>
                    <div class="text-caption text-grey-6 q-mt-xs text-right" v-if="item.streak > 0">
                      최근 {{ item.streak }}회 연속 정답
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-else class="text-center q-pa-xl text-grey-6">
                <q-icon name="sentiment_very_satisfied" size="50px" class="q-mb-md opacity-50" />
                <div class="text-h6">아직 자주 틀린 단어가 없습니다!</div>
              </div>
            </q-card-section>
          </q-card>
        </template>

      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { repository } from 'src/lib/reviews/repository';
import { useAuthStore } from 'src/stores/authStore';

const authStore = useAuthStore();
const boxDistribution = ref<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrongWords = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  if (authStore.user) {
    try {
      loading.value = true;
      const [dist, words] = await Promise.all([
        repository.getBoxDistribution(authStore.user.id),
        repository.getFrequentWrongWords(authStore.user.id, 20)
      ]);
      boxDistribution.value = dist;
      wrongWords.value = words;
    } catch (e) {
      console.error('Failed to load vocab data', e);
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
  }
});
</script>
