<script setup>
import '@bndynet/ichat';
import { onMounted, nextTick, ref } from 'vue';
import { textPart } from '@bndynet/ichat';
import { nextId } from '../../composables/demo-data.js';

const chatRef = ref(null);

const ELEMENT_MSG_ID = 'custom-part-element';
const ELEMENT_PART_ID = 'x-weather-live';

onMounted(async () => {
  await nextTick();
  const chat = chatRef.value;

  chat.addMessage({
    id: ELEMENT_MSG_ID,
    role: 'assistant',
    timestamp: Date.now(),
    parts: [
      textPart(
        '**Element mode** — `registerPartRenderer({ test, element })`. The library renders `<x-weather-card .data .part>`; the element instance is preserved across `updatePart`, so streaming updates do not rebuild the DOM. Click the button below to patch `data` live.',
      ),
      {
        id: ELEMENT_PART_ID,
        type: 'x-weather',
        data: { city: 'Shanghai', temp: 22, unit: '°C', condition: 'Cloudy' },
      },
    ],
  });

  chat.addMessage({
    id: nextId(),
    role: 'assistant',
    timestamp: Date.now(),
    parts: [
      textPart(
        '**String mode** — `registerPartRenderer({ test, render })`. The renderer returns an HTML string, sanitised with DOMPurify and patched in place via morphdom (same channel as `text` parts).',
      ),
      {
        id: 'x-weather-html-1',
        type: 'x-weather-html',
        data: { city: 'Tokyo', temp: 18, unit: '°C', condition: 'Light rain' },
      },
    ],
  });

  chat.addMessage({
    id: nextId(),
    role: 'assistant',
    timestamp: Date.now(),
    parts: [
      textPart(
        '**Unregistered fallback** — a custom `x-*` part with no matching renderer is shown as a readable JSON dump.',
      ),
      {
        id: 'x-unknown-1',
        type: 'x-product-card',
        data: { sku: 'A-1024', name: 'Wireless Mouse', price: 29.9 },
      },
    ],
  });
});

const conditions = [
  { temp: 22, condition: 'Cloudy' },
  { temp: 27, condition: 'Sunny' },
  { temp: 16, condition: 'Thunderstorm' },
  { temp: 9, condition: 'Snow' },
];
let tick = 0;

function updateWeather() {
  const chat = chatRef.value;
  if (!chat) return;
  tick = (tick + 1) % conditions.length;
  const next = conditions[tick];
  chat.updatePart(ELEMENT_MSG_ID, ELEMENT_PART_ID, {
    data: { city: 'Shanghai', temp: next.temp, unit: '°C', condition: next.condition },
  });
}
</script>

<template>
  <div class="custom-part-page">
    <button type="button" class="update-btn" @click="updateWeather">
      Update weather (element mode, live patch)
    </button>
    <i-chat-messages ref="chatRef" />
  </div>
</template>

<style scoped>
.custom-part-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}
.update-btn {
  align-self: flex-start;
  font: inherit;
  padding: 8px 16px;
  border: 1px solid var(--chat-border, #cbd5e0);
  border-radius: 6px;
  background: var(--chat-surface, #fff);
  color: var(--chat-text, #1a202c);
  cursor: pointer;
}
.update-btn:hover {
  border-color: var(--chat-primary, #667eea);
  color: var(--chat-primary, #667eea);
}
</style>
