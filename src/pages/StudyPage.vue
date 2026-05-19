<template>
  <q-page class="q-pa-md flex flex-center bg-grey-1">
    <div v-if="loading" class="text-center">
      <q-spinner color="primary" size="3em" />
      <div class="q-mt-md text-grey-8">세션을 준비 중입니다...</div>
    </div>

    <div v-else-if="sessionComplete" class="text-center">
      <q-icon name="check_circle" size="100px" color="positive" class="q-mb-md" />
      <div class="text-h4 text-weight-bold text-dark q-mb-md">오늘의 복습 완료!</div>
      <div class="text-subtitle1 text-grey-8 q-mb-xl">수고하셨습니다. 모든 복습을 마쳤습니다.</div>
      <q-btn color="primary" size="lg" label="홈으로 돌아가기" to="/" unelevated rounded />
    </div>

    <div v-else class="study-container full-width">
      <!-- Progress Bar -->
      <div class="q-mb-xl">
        <div class="flex justify-between q-mb-sm text-subtitle2 text-grey-8">
          <span>진행률</span>
          <span>{{ currentIndex + 1 }} / {{ session.length }}</span>
        </div>
        <q-linear-progress :value="(currentIndex + 1) / session.length" color="primary" size="10px" rounded />
      </div>

      <!-- FlashCard -->
      <FlashCard 
        v-if="currentCard"
        :card="currentCard" 
        :is-flipped="isFlipped" 
        @flip="onFlip" 
      />

      <!-- Action Buttons -->
      <div class="actions-container q-mt-xl" :class="{ 'opacity-0': !isFlipped }">
        <div class="row q-col-gutter-md justify-center">
          <div class="col-4">
            <q-btn 
              color="negative" 
              class="full-width q-py-sm" 
              unelevated 
              rounded
              @click="handleAction('fail')"
              :disable="!isFlipped"
            >
              <div class="column flex-center">
                <span class="text-weight-bold">모름</span>
                <span class="text-caption opacity-80">(1)</span>
              </div>
            </q-btn>
          </div>
          <div class="col-4">
            <q-btn 
              color="grey-7" 
              class="full-width q-py-sm" 
              outline 
              rounded
              @click="handleAction('skip')"
              :disable="!isFlipped"
            >
              <div class="column flex-center">
                <span class="text-weight-bold">보류</span>
                <span class="text-caption opacity-80">(Space)</span>
              </div>
            </q-btn>
          </div>
          <div class="col-4">
            <q-btn 
              color="positive" 
              class="full-width q-py-sm" 
              unelevated 
              rounded
              @click="handleAction('pass')"
              :disable="!isFlipped"
            >
              <div class="column flex-center">
                <span class="text-weight-bold">알아요</span>
                <span class="text-caption opacity-80">(2)</span>
              </div>
            </q-btn>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from 'src/stores/authStore';
import { buildSession } from 'src/lib/reviews/session';
import { repository, type Card } from 'src/lib/reviews/repository';
import type { ReviewInput, ReviewResult, SkipInput } from 'src/lib/leitner/judge';
import type { BoxLevel } from 'src/lib/leitner/constants';
import FlashCard from 'src/components/FlashCard.vue';
import { useQuasar } from 'quasar';

const authStore = useAuthStore();
const $q = useQuasar();
const session = ref<Card[]>([]);
const currentIndex = ref(0);
const loading = ref(true);
const isFlipped = ref(false);
const sessionComplete = ref(false);
const transitioning = ref(false);

let cardShownAt = 0;
let flipResponseMs = 0;

const currentCard = computed(() => session.value[currentIndex.value] || null);

onMounted(async () => {
  if (authStore.user) {
    try {
      session.value = await buildSession(authStore.user.id);
      if (session.value.length === 0) {
        sessionComplete.value = true;
      } else {
        cardShownAt = Date.now();
      }
    } catch (e) {
      console.error('Failed to load session', e);
    } finally {
      loading.value = false;
    }
  }
  
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

// eslint-disable-next-line no-undef
const handleKeydown = (e: KeyboardEvent) => {
  if (sessionComplete.value || loading.value || transitioning.value) return;

  if (!isFlipped.value) {
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      onFlip();
    }
    return;
  }

  // Handle actions
  if (e.key === '1') {
    handleAction('fail');
  } else if (e.code === 'Space') {
    e.preventDefault(); // Prevent page scroll
    handleAction('skip');
  } else if (e.key === '2') {
    handleAction('pass');
  }
};

const onFlip = () => {
  if (isFlipped.value || transitioning.value) return;
  flipResponseMs = Date.now() - cardShownAt;
  isFlipped.value = true;
};

const handleAction = async (action: 'fail' | 'skip' | 'pass') => {
  if (!isFlipped.value || !authStore.user || !currentCard.value || transitioning.value) return;

  transitioning.value = true;
  const card = currentCard.value;
  
  if (action !== 'skip') {
    const isCorrect = action === 'pass';
    const input: ReviewInput = {
      is_correct: isCorrect,
      response_ms: flipResponseMs,
      current_box: (card.box_level as BoxLevel), // Type assertion to BoxLevel for MVP
      now: new Date()
    };
    
    // Submit in background so UI doesn't block
    repository.submitReview(authStore.user.id, card.id, input).then(res => showJudgeNotification(res)).catch(console.error);
  } else {
    const input: SkipInput = {
      current_box: (card.box_level as BoxLevel),
      now: new Date()
    };
    repository.submitSkip(authStore.user.id, card.id, input).then(res => showJudgeNotification(res)).catch(console.error);
  }

  nextCard();
};

const showJudgeNotification = (res: ReviewResult) => {
  let message = '';
  let type = 'info';
  
  switch(res.reason) {
    case 'WRONG_ANSWER':
      message = '오답: 2단계 강등되었습니다 📉';
      type = 'negative';
      break;
    case 'SLOW_RESPONSE_HOLD':
      message = '정답이지만 3초 초과: 단계가 유지됩니다 ⏱️';
      type = 'warning';
      break;
    case 'PROMOTE':
      message = `정답: Box ${res.next_box}(으)로 승급되었습니다! 🚀`;
      type = 'positive';
      break;
    case 'MASTERED':
      message = '마스터! 단어가 장기 기억에 저장되었습니다 🏆';
      type = 'positive';
      break;
    case 'SKIP':
      message = '보류: 4시간 뒤에 다시 봅니다 ⏭️';
      type = 'info';
      break;
  }
  
  $q.notify({
    message,
    type,
    position: 'top',
    timeout: 1500,
  });
};

const nextCard = () => {
  isFlipped.value = false;
  
  if (currentIndex.value < session.value.length - 1) {
    // eslint-disable-next-line no-undef
    setTimeout(() => {
      currentIndex.value++;
      cardShownAt = Date.now();
      transitioning.value = false;
    }, 300); // Swap text when card is at 90 degrees (halfway through 0.6s transition)
  } else {
    // eslint-disable-next-line no-undef
    setTimeout(() => {
      sessionComplete.value = true;
      transitioning.value = false;
    }, 300);
  }
};
</script>

<style scoped>
.study-container {
  max-width: 600px;
  width: 100%;
}

.opacity-0 {
  opacity: 0;
  pointer-events: none;
}

.actions-container {
  transition: opacity 0.3s ease;
}
</style>
