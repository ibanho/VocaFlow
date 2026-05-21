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

        <q-card-section class="text-center q-pb-none">
          <div class="text-h6 text-primary text-weight-bold q-mb-xs">{{ card.word }}</div>
          
          <div class="text-subtitle2 text-grey-6 q-mb-sm font-mono" v-if="dictInfo?.phonetic">
            {{ dictInfo.phonetic }}
          </div>
          
          <div class="text-h4 text-weight-bold q-mb-md text-dark-blue transition-meaning" :class="{ 'translation-loading': loadingTranslation }">
            {{ displayMeaning }}
          </div>
          
          <div>
            <q-badge color="secondary" outline class="q-px-sm q-py-xs text-subtitle2 q-mb-md brand-badge">
              {{ card.pos }}
            </q-badge>
          </div>
        </q-card-section>
        
        <q-separator v-if="loadingDict || dictInfo" class="q-mx-md bg-grey-2" />

        <q-card-section class="col overflow-auto text-left q-pt-sm q-px-md" v-if="loadingDict || dictInfo">
          <div v-if="loadingDict" class="text-center q-pa-md">
            <q-spinner color="primary" size="2em" />
          </div>
          <div v-else-if="dictInfo" class="dictionary-details">
            <div class="text-caption text-weight-bold text-grey-8 q-mb-xs flex items-center">
              <q-icon name="menu_book" class="q-mr-xs text-secondary" />
              사전 상세 (EN)
            </div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
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
const displayMeaning = ref(props.card.meaning);
const loadingTranslation = ref(false);

const flipCard = () => {
  if (!props.isFlipped) {
    emit('flip');
  }
};

watch(() => props.isFlipped, async (newVal) => {
  if (newVal) {
    // 카드를 뒤집을 때 우선 기존 DB 뜻으로 즉시 세팅해 딜레이 없는 UX 확보
    displayMeaning.value = props.card.meaning;

    if (!dictInfo.value) {
      loadingDict.value = true;
      dictInfo.value = await fetchDictionaryInfo(props.card.word);
      loadingDict.value = false;
    }

    // 고품질 영문 상세 정의문이 존재하면 이를 기반으로 구글 실시간 번역
    const englishDef = dictInfo.value?.meanings?.[0]?.definitions?.[0]?.definition;
    loadingTranslation.value = true;
    try {
      const translated = await fetchRealtimeTranslation(props.card.word, englishDef);
      if (translated) {
        displayMeaning.value = translated;
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
  displayMeaning.value = props.card.meaning;
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

.dictionary-details {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 10px 14px;
  border: 1px solid #edf2f7;
}

.font-mono {
  font-family: 'Outfit', 'Roboto', monospace;
}

.transition-meaning {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.translation-loading {
  opacity: 0.5;
  transform: scale(0.98);
}
</style>


