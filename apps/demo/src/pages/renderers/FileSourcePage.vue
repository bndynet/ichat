<script setup>
import '@bndynet/ichat';
import { onMounted, nextTick, ref } from 'vue';
import { textPart } from '@bndynet/ichat';
import { nextId } from '../../composables/demo-data.js';

const chatRef = ref(null);

/** Raw base64 (no `data:` prefix) — same 64×64 PNG as ChatPage avatar demo. */
const DEMO_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA9klEQVR42u3ZQQ6DIBCF4blXb9fj9D69Sre4bZqiKAzO8P6XsBR8nxI1mhFCyI0p71eRKts6ZIsvB9FTPj3CiPJpEUaWT4fgUT4Ngmf5FAjSADPKh0YAAAAAdAFmlgeBLQBADIDH81O+x0yA37UBiAAwC+HfulLbIEz5O+6CUFe/BuCFUFsr3NPAAyFs+T2AUQh784cH6EU4mjvMW+DRiZ6FaJkv1GtwywnXUK4euwRAzwj3MSRdHgAA5iGE/jMEgDqAN4JliDyAF4JlCgDqAKMRLGMAUAcYhWCZA4A6QC+CrRAA1AGuIthKAUAd4CyCEUIIIe7ZAFXVGuWAntoXAAAAAElFTkSuQmCC';

onMounted(async () => {
  await nextTick();
  const chat = chatRef.value;

  chat.addMessage({
    id: nextId(),
    role: 'assistant',
    timestamp: Date.now(),
    parts: [
      textPart(
        '**`file` parts** — images render inline; other MIME types become download links. Three variants below: URL, raw base64 (`data` field), and non-image attachment.',
      ),
      {
        id: 'file-img-url',
        type: 'file',
        mediaType: 'image/png',
        url: 'https://static.bndy.net/images/logo.png',
        name: 'logo.png',
      },
      {
        id: 'file-img-data',
        type: 'file',
        mediaType: 'image/png',
        data: DEMO_PNG_BASE64,
        name: 'embedded.png',
      },
      {
        id: 'file-pdf',
        type: 'file',
        mediaType: 'application/pdf',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        name: 'dummy.pdf',
        size: 13264,
      },
    ],
  });

  chat.addMessage({
    id: nextId(),
    role: 'assistant',
    timestamp: Date.now(),
    parts: [
      textPart(
        '**`source` parts** — citation links for RAG / web search. Each part renders a title (or URL) plus an optional snippet.',
      ),
      {
        id: 'src-lit',
        type: 'source',
        url: 'https://lit.dev/docs/components/overview/',
        title: 'Lit – Overview',
        snippet:
          'Lit is a library for building fast, lightweight web components.',
      },
      {
        id: 'src-mdn',
        type: 'source',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_components',
        title: 'MDN – Web Components',
        snippet:
          'Web Components is a suite of technologies allowing the creation of reusable custom elements.',
      },
      {
        id: 'src-no-title',
        type: 'source',
        url: 'https://github.com/lit/lit',
        snippet: 'When `title` is omitted, the URL is shown as the link text.',
      },
    ],
  });
});
</script>

<template>
  <i-chat-messages ref="chatRef" />
</template>
