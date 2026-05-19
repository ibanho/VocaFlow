<template>
  <div class="flashcard-container" @click="flipCard">
    <div class="flashcard-inner" :class="{ 'is-flipped': isFlipped }">
      <!-- Front (Word) -->
      <q-card class="flashcard-face flashcard-front bg-primary text-white flex flex-center">
        <q-card-section>
          <div class="text-h3 text-weight-bold">{{ card.word }}</div>
          <div class="text-subtitle1 text-center q-mt-md text-white-70">
            Tap to see meaning
          </div>
        </q-card-section>
      </q-card>

      <!-- Back (Meaning) -->
      <q-card class="flashcard-face flashcard-back bg-white text-dark column no-wrap">
        <q-card-section class="text-center q-pb-none">
          <div class="text-h6 text-primary q-mb-xs">{{ card.word }}</div>
          <div class="text-subtitle2 text-grey-6 q-mb-sm" v-if="dictInfo?.phonetic">{{ dictInfo.phonetic }}</div>
          <div class="text-h4 text-weight-bold q-mb-md">{{ card.meaning }}</div>
          <q-badge color="secondary" outline class="q-px-sm q-py-xs text-subtitle2 q-mb-sm">
            {{ card.pos }}
          </q-badge>
        </q-card-section>
        
        <q-separator v-if="loadingDict || dictInfo" />

        <q-card-section class="col overflow-auto text-left q-pt-sm" v-if="loadingDict || dictInfo">
          <div v-if="loadingDict" class="text-center q-pa-sm">
            <q-spinner color="primary" size="2em" />
          </div>
          <div v-else-if="dictInfo">
            <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">사전 상세 (EN)</div>
            <div v-for="(meaning, i) in dictInfo.meanings.slice(0, 2)" :key="i" class="q-mb-sm">
              <span class="text-italic text-caption text-secondary q-mr-sm">{{ meaning.partOfSpeech }}</span>
              <ul class="q-pl-md q-my-none text-caption">
                <li v-for="(def, j) in meaning.definitions.slice(0, 2)" :key="j" class="q-mb-xs">
                  {{ def.definition }}
                  <div v-if="def.example" class="text-grey-6 text-italic">"{{ def.example }}"</div>
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
import { fetchDictionaryInfo, type DictionaryResponse } from 'src/lib/dictionary/api';

const props = defineProps<{
  card: Card;
  isFlipped: boolean;
}>();

const emit = defineEmits<{
  (e: 'flip'): void;
}>();

const dictInfo = ref<DictionaryResponse | null>(null);
const loadingDict = ref(false);

const flipCard = () => {
  if (!props.isFlipped) {
    emit('flip');
  }
};

watch(() => props.isFlipped, async (newVal) => {
  if (newVal && !dictInfo.value) {
    loadingDict.value = true;
    dictInfo.value = await fetchDictionaryInfo(props.card.word);
    loadingDict.value = false;
  }
});

// Reset dict info when card changes
watch(() => props.card.id, () => {
  dictInfo.value = null;
});
</script>

<style scoped>
.flashcard-container {
  width: 100%;
  max-width: 400px;
  height: 300px;
  perspective: 1000px;
  cursor: pointer;
  margin: 0 auto;
}

.flashcard-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
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
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.flashcard-back {
  transform: rotateY(180deg);
}
</style>
