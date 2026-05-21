<template>
  <div class="flashcard-container" @click="flipCard">
    <div class="flashcard-inner" :class="{ 'is-flipped': isFlipped }">
      <!-- Front (Word) -->
      <q-card class="flashcard-face flashcard-front bg-primary text-white flex flex-center relative-position">
        <!-- Speaker Button (Front) - Absolute Top-Right -->
        <q-btn
          flat
          round
          dense
          color="white"
          icon="volume_up"
          size="md"
          class="absolute-top-right q-ma-md play-btn text-white-90"
          @click.stop="speakWord"
        >
          <q-tooltip class="bg-dark text-white text-caption">발음 듣기 (Listen)</q-tooltip>
        </q-btn>

        <q-card-section class="column items-center">
          <span class="text-h3 text-weight-bold tracking-wide">{{ card.word }}</span>
          <div class="text-subtitle1 text-center q-mt-lg text-white-70 letter-spacing-1">
            Tap to see meaning
          </div>
        </q-card-section>
      </q-card>

      <!-- Back (Meaning) -->
      <q-card class="flashcard-face flashcard-back bg-white text-dark column no-wrap relative-position">
        <!-- Speaker Button (Back) - Absolute Top-Right -->
        <q-btn
          flat
          round
          dense
          color="primary"
          icon="volume_up"
          size="md"
          class="absolute-top-right q-ma-md play-btn"
          @click.stop="speakWord"
        >
          <q-tooltip class="bg-primary text-white text-caption">발음 듣기</q-tooltip>
        </q-btn>

        <!-- 단어 기본 정보 (상시 상단 고정) -->
        <q-card-section class="text-center q-pb-none q-pt-md">
          <div class="text-h6 text-primary text-weight-bold q-mb-xs">{{ card.word }}</div>
          
          <div class="text-subtitle2 text-grey-6 q-mb-xs font-mono" v-if="dictInfo?.phonetic">
            {{ dictInfo.phonetic }}
          </div>
          
          <!-- 기본 뜻은 항상 중앙에 크고 뚜렷하게 고정! -->
          <div class="text-h4 text-weight-bold q-mb-sm text-dark-blue">
            {{ card.meaning }}
          </div>
          
          <div class="q-mb-sm">
            <q-badge color="secondary" outline class="q-px-sm q-py-xs text-subtitle2 brand-badge">
              {{ card.pos }}
            </q-badge>
          </div>
        </q-card-section>

        <q-separator class="q-mx-md bg-grey-2" />

        <!-- 아코디언 형태의 상세 정보 스크롤 영역 (Progressive Reveal) -->
        <q-card-section class="col overflow-auto q-pt-sm q-px-md q-pb-md">
          <q-list class="accordion-list">
            
            <!-- 1. AI 문맥 상세 해석 아코디언 -->
            <q-expansion-item
              group="card-details"
              icon="psychology"
              label="AI 문맥 상세 해석"
              header-class="accordion-header-ai text-weight-bold"
              dense
              dense-toggle
              expand-icon-class="text-primary"
              class="accordion-item accordion-item-ai q-mb-sm"
              default-opened
            >
              <q-card class="bg-transparent">
                <q-card-section class="q-pa-sm">
                  <div v-if="loadingTranslation" class="flex flex-center q-py-xs">
                    <q-spinner-dots color="primary" size="1.2em" />
                    <span class="text-caption text-grey-6 q-ml-sm">AI 문맥 해석 분석 중...</span>
                  </div>
                  <div v-else-if="translationResult" class="fade-in">
                    <div v-if="isDuplicateTranslation" class="text-caption text-grey-6 italic-caption q-pa-sm bg-blue-50 rounded-sm">
                      <q-icon name="info" size="14px" color="primary" class="q-mr-xs" />
                      이 단어는 기본 의미가 명확하며, 상세 문맥 해석이 동일합니다.
                    </div>
                    <div v-else class="text-caption text-grey-8 leading-relaxed font-weight-medium">
                      {{ translationResult }}
                    </div>
                  </div>
                  <div v-else class="text-caption text-grey-5 flex flex-center q-py-xs fade-in">
                    <q-icon name="error_outline" size="16px" color="warning" class="q-mr-xs" />
                    일시적인 네트워크 지연으로 상세 해석을 가져오지 못했습니다.
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- 2. 영영사전 상세 아코디언 -->
            <q-expansion-item
              group="card-details"
              icon="menu_book"
              label="영영사전 상세 (EN)"
              header-class="accordion-header-dict text-weight-bold"
              dense
              dense-toggle
              expand-icon-class="text-secondary"
              class="accordion-item accordion-item-dict q-mb-sm"
              v-if="loadingDict || dictInfo"
            >
              <q-card class="bg-transparent">
                <q-card-section class="q-pa-sm">
                  <div v-if="loadingDict" class="text-center q-pa-md">
                    <q-spinner color="primary" size="2em" />
                  </div>
                  <div v-else-if="dictInfo" class="dictionary-details-content">
                    <div v-for="(meaning, i) in dictInfo.meanings.slice(0, 2)" :key="i" class="q-mb-sm">
                      <span class="text-italic text-caption text-secondary text-weight-bold q-mr-sm">
                        {{ meaning.partOfSpeech }}
                      </span>
                      <ul class="q-pl-md q-my-none text-caption text-grey-8">
                        <li v-for="(def, j) in meaning.definitions.slice(0, 2)" :key="j" class="q-mb-xs">
                          {{ def.definition }}
                          <div v-if="def.example" class="text-grey-6 text-italic q-mt-xs">"{{ def.example }}"</div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>

          </q-list>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Card } from 'src/lib/reviews/repository';
import { fetchDictionaryInfo, fetchRealtimeTranslation, type DictionaryResponse } from 'src/lib/dictionary/api';

const props = defineProps<{
  card: Card;
  isFlipped: boolean;
}>();

const emit = defineEmits<{
  (e: 'flip'): void;
}>();

const dictInfo = ref<DictionaryResponse | null>(null);
const loadingDict = ref(false);
const translationResult = ref('');
const loadingTranslation = ref(false);

// 뜻과 실시간 AI 번역 해석이 똑같거나 유사한 경우를 감지하는 computed 속성
const isDuplicateTranslation = computed(() => {
  if (!translationResult.value) return false;
  
  // 공백 및 기호 제거 후 한글 뜻 교차 비교
  const cleanTranslation = translationResult.value.replace(/[\s,;."']/g, '').toLowerCase();
  const cleanMeaning = props.card.meaning.replace(/[\s,;."']/g, '').toLowerCase();
  
  return cleanTranslation === cleanMeaning;
});

const flipCard = () => {
  if (!props.isFlipped) {
    emit('flip');
  }
};

watch(() => props.isFlipped, async (newVal) => {
  if (newVal) {
    if (!dictInfo.value) {
      loadingDict.value = true;
      dictInfo.value = await fetchDictionaryInfo(props.card.word);
      loadingDict.value = false;
    }

    // 고품질 영문 상세 정의문이 존재하면 이를 기반으로 구글 실시간 번역, 없으면 단어 자체 번역
    const englishDef = dictInfo.value?.meanings?.[0]?.definitions?.[0]?.definition;

    loadingTranslation.value = true;
    try {
      const translated = await fetchRealtimeTranslation(props.card.word, englishDef);
      if (translated) {
        translationResult.value = translated;
      }
    } catch (err) {
      console.error('Failed to load realtime translation:', err);
    } finally {
      loadingTranslation.value = false;
    }
  }
});

// Reset dict info and meaning when card changes
watch(() => props.card.id, () => {
  dictInfo.value = null;
  translationResult.value = '';
});

// Play TTS Pronunciation
const speakWord = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any active speech
    
    const utterance = new SpeechSynthesisUtterance(props.card.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; // Slightly slower for better learning
    
    // Try to find a high-quality US English voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                    voices.find(v => v.lang.startsWith('en-US')) ||
                    voices.find(v => v.lang.startsWith('en'));
                    
    if (enVoice) {
      utterance.voice = enVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('[speech] Browser does not support speechSynthesis API');
  }
};
</script>

<style scoped>
.flashcard-container {
  width: 100%;
  max-width: 420px;
  height: 320px;
  perspective: 1200px;
  cursor: pointer;
  margin: 0 auto;
}

.flashcard-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.65s cubic-bezier(0.4, 0.0, 0.2, 1);
  transform-style: preserve-3d;
}

.flashcard-inner.is-flipped {
  transform: rotateY(180deg);
}

.flashcard-face {
  width: 100%;
  height: 100%;
  position: absolute;
  backface-visibility: hidden;
  border-radius: 20px;
  box-shadow: 0 12px 30px rgba(25, 118, 210, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.flashcard-front {
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
  color: white;
}

.flashcard-back {
  transform: rotateY(180deg);
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

/* Micro-animations and Premium Effects */
.play-btn {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.play-btn:hover {
  transform: scale(1.15) rotate(-5deg);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.12));
}

.play-btn:active {
  transform: scale(0.95);
}

.hover-scale {
  transition: transform 0.2s ease;
}

.hover-scale:hover {
  transform: scale(1.05);
}

.text-white-90 {
  color: rgba(255, 255, 255, 0.9);
}

.text-white-70 {
  color: rgba(255, 255, 255, 0.7);
}

.letter-spacing-1 {
  letter-spacing: 0.5px;
}

.text-dark-blue {
  color: #1a237e;
}

.brand-badge {
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.font-mono {
  font-family: 'Outfit', 'Roboto', monospace;
}

.accordion-list {
  padding: 0;
  background: transparent;
}

.accordion-item {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.accordion-item:hover {
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.04);
}

.accordion-item-ai {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.02) 0%, rgba(38, 166, 154, 0.02) 100%);
  border: 1px dashed rgba(25, 118, 210, 0.15);
}

.accordion-item-ai:hover {
  border-color: rgba(25, 118, 210, 0.35);
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.04) 0%, rgba(38, 166, 154, 0.04) 100%);
}

.accordion-item-dict {
  background: #f9fbfd;
  border: 1px solid #eef2f6;
}

.accordion-item-dict:hover {
  border-color: rgba(38, 166, 154, 0.25);
  background: #f4f8fb;
}

/* Custom Header styling inside expansion items via deep selectors */
:deep(.accordion-header-ai) {
  color: #1976D2;
  border-radius: 12px;
  padding: 8px 12px !important;
  font-size: 0.85rem;
}

:deep(.accordion-header-dict) {
  color: #26A69A;
  border-radius: 12px;
  padding: 8px 12px !important;
  font-size: 0.85rem;
}

:deep(.q-expansion-item__container .q-item) {
  min-height: 40px !important;
}

.dictionary-details-content {
  background-color: transparent;
  padding: 2px 4px;
}

.fade-in {
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.italic-caption {
  font-style: italic;
}

.bg-blue-50 {
  background-color: rgba(25, 118, 210, 0.05); /* Brand Light Blue with opacity */
  border-left: 3px solid #1976D2;
}

.rounded-sm {
  border-radius: 6px;
}
</style>


