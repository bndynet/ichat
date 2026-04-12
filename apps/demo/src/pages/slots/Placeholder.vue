<script setup>
import '@bndynet/chat';
import { ref, nextTick, onMounted } from 'vue';
import { responseThinking, nextId } from '../../composables/demo-data';

const chatRef = ref(null);

onMounted(async () => {
  await nextTick();
});

function handleSend(e) {
  const content = e.detail.content;
  chatRef.value.addMessage({
    id: nextId(),
    role: 'self',
    content,
    timestamp: Date.now(),
  });
  responseThinking(chatRef);
}
</script>

<template>
  <i-chat
    ref="chatRef"
    @send="handleSend"
  >
    <div slot="empty" class="placeholder">
      <h2 class="placeholder__title">Welcome</h2>
      <svg
        class="placeholder__welcome"
          viewBox="0 0 280 200"
          fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Welcome illustration"
      >
        <defs>
          <linearGradient id="pw-sky" x1="32" y1="24" x2="248" y2="176" gradientUnits="userSpaceOnUse">
            <stop stop-color="#EEF2FF" />
            <stop offset="0.45" stop-color="#E0E7FF" />
            <stop offset="1" stop-color="#F5F3FF" />
          </linearGradient>
          <linearGradient id="pw-glow" x1="140" y1="40" x2="200" y2="120" gradientUnits="userSpaceOnUse">
            <stop stop-color="#A5B4FC" stop-opacity="0.45" />
            <stop offset="1" stop-color="#C4B5FD" stop-opacity="0.15" />
          </linearGradient>
          <linearGradient id="pw-bubble-l" x1="48" y1="72" x2="152" y2="128" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFFFFF" />
            <stop offset="1" stop-color="#F8FAFC" />
          </linearGradient>
          <linearGradient id="pw-bubble-r" x1="168" y1="88" x2="248" y2="152" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6366F1" />
            <stop offset="1" stop-color="#7C3AED" />
          </linearGradient>
          <linearGradient id="pw-accent" x1="200" y1="48" x2="240" y2="88" gradientUnits="userSpaceOnUse">
            <stop stop-color="#22D3EE" />
            <stop offset="1" stop-color="#38BDF8" />
          </linearGradient>
          <filter id="pw-soft" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b" />
            <feOffset dx="0" dy="4" in="b" result="o" />
            <feComponentTransfer in="o" result="a">
              <feFuncA type="linear" slope="0.22" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="a" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pw-glow-blur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="18" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
        </defs>

        <rect width="280" height="200" rx="24" fill="url(#pw-sky)" />

        <circle cx="210" cy="52" r="56" fill="url(#pw-glow)" filter="url(#pw-glow-blur)" opacity="0.9" />
        <circle cx="72" cy="148" r="40" fill="#C7D2FE" opacity="0.35" />

        <g filter="url(#pw-soft)">
          <rect
            x="40"
            y="72"
            width="118"
            height="68"
            rx="16"
            fill="url(#pw-bubble-l)"
            stroke="#C7D2FE"
            stroke-width="1.25"
          />
          <path d="M58 140 L42 156 L58 150 Z" fill="url(#pw-bubble-l)" stroke="#C7D2FE" stroke-width="1.25" stroke-linejoin="round" />
          <rect
            x="164"
            y="96"
            width="84"
            height="56"
            rx="14"
            fill="url(#pw-bubble-r)"
          />
          <path d="M232 152 L246 164 L232 160 Z" fill="url(#pw-bubble-r)" />
        </g>

        <g opacity="0.95">
          <rect x="64" y="96" width="52" height="8" rx="4" fill="#A5B4FC" />
          <rect x="64" y="110" width="36" height="8" rx="4" fill="#E2E8F0" />
          <rect x="184" y="118" width="44" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.92" />
          <rect x="184" y="130" width="28" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.55" />
        </g>

        <g stroke-linecap="round" stroke-width="2.5">
          <path d="M196 44l6 6 10-14" stroke="url(#pw-accent)" fill="none" />
          <circle cx="228" cy="36" r="3" fill="#22D3EE" />
          <path d="M52 52l4 4M60 48l-4 4" stroke="#818CF8" opacity="0.7" />
          <path d="M236 156l5 5M244 152l-5 5" stroke="#A78BFA" opacity="0.65" />
        </g>
      </svg>
      <p class="placeholder__hint">Type a message below to begin.</p>
    </div>
  </i-chat>
</template>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem 2rem;
  text-align: center;
  max-width: 22rem;
  margin-inline: auto;
}

.placeholder__welcome {
  width: min(220px, 88vw);
  height: auto;
  display: block;
}

.placeholder__title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--chat-text, #1e293b);
}

.placeholder__hint {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--chat-text-muted, #64748b);
}
</style>
