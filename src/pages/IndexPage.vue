<template>
  <q-page class="q-pa-md flex flex-center bg-grey-1">
    <div class="full-width text-center" style="max-width: 400px">
      <q-icon name="local_fire_department" size="80px" color="orange" class="q-mb-md" />
      <div class="text-h4 text-weight-bold text-dark q-mb-sm">VocaFlow</div>
      <div class="text-subtitle1 text-grey-8 q-mb-xl">오늘의 학습 목표를 달성해 보세요.</div>

      <q-card flat bordered class="q-mb-xl bg-white">
        <q-card-section>
          <div class="row items-center justify-between">
            <div class="text-subtitle2 text-grey-8">오늘 완료한 복습</div>
            <div class="text-h5 text-primary text-weight-bold">{{ todayCount }} 단어</div>
          </div>
        </q-card-section>
      </q-card>

      <q-btn 
        color="primary" 
        size="lg" 
        class="full-width text-weight-bold shadow-4" 
        label="오늘의 학습 시작하기" 
        icon-right="arrow_forward" 
        unelevated 
        rounded
        to="/study"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from 'src/stores/authStore';
import { repository } from 'src/lib/reviews/repository';

const authStore = useAuthStore();
const todayCount = ref(0);

onMounted(async () => {
  if (authStore.user) {
    try {
      todayCount.value = await repository.getTodayReviewCount(authStore.user.id);
    } catch (e) {
      console.error(e);
    }
  }
});
</script>
