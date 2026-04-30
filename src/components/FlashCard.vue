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
      <q-card class="flashcard-face flashcard-back bg-white text-dark flex flex-center">
        <q-card-section class="text-center">
          <div class="text-h6 text-primary q-mb-sm">{{ card.word }}</div>
          <div class="text-h4 text-weight-bold q-mb-md">{{ card.meaning }}</div>
          <q-badge color="secondary" outline class="q-px-sm q-py-xs text-subtitle2">
            {{ card.pos }}
          </q-badge>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card } from 'src/lib/reviews/repository';

const props = defineProps<{
  card: Card;
  isFlipped: boolean;
}>();

const emit = defineEmits<{
  (e: 'flip'): void;
}>();

const flipCard = () => {
  if (!props.isFlipped) {
    emit('flip');
  }
};
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
