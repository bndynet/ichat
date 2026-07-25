<script setup>
import '@bndynet/ichat';
import { nextTick, onMounted, ref } from 'vue';
import { nextId } from '../../composables/demo-data.js';
import { textPart } from '@bndynet/ichat';
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue';
import codeCopyExample from '../../examples/plugins/code-copy.md?raw';

const chatRef = ref(null);

async function waitForChatHost(maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    if (chatRef.value) return chatRef.value;
    await nextTick();
  }
  return chatRef.value;
}

onMounted(async () => {
  const chat = await waitForChatHost();
  if (!chat) return;

  // Code copy is built-in — no plugin registration needed

  // Add a message with fenced code blocks to demonstrate
  chat.addMessage({
    id: nextId(),
    role: 'assistant',
    timestamp: Date.now(),
    parts: [
      textPart(`Here are some code examples — hover over any code block to see the copy button:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

\`\`\`python
def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
\`\`\`

\`\`\`bash
npm install @bndynet/ichat
npm run dev
\`\`\`

Click the **Copy** button on any block to copy the code to your clipboard.`),
    ],
  });
});
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
    <h2 style="margin: 0 0 8px;">Code Copy (Built-in)</h2>
    <p style="margin: 0 0 12px;">
      Every fenced code block automatically has a copy button —
      <strong>zero configuration required</strong>. Hover over any code block
      to see the copy icon, click to copy the code to your clipboard.
    </p>
    <i-chat ref="chatRef" style="flex: 1; min-height: 0;" />
  </div>
  <ExampleCodeDrawer title="Code copy plugin example" :content="codeCopyExample" />
</template>
