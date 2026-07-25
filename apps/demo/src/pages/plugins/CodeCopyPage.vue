<script setup>
import '@bndynet/ichat';
import { codeCopyPlugin } from '@bndynet/ichat';
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

  // Register the code copy plugin
  chat.use(codeCopyPlugin);

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
  <div style="max-width: 800px; margin: 0 auto; padding: 16px;">
    <h2>Code Copy Plugin</h2>
    <p>
      The <code>codeCopyPlugin</code> adds a hover-visible copy button to every
      fenced code block in rendered markdown. Register it once with
      <code>chat.use(codeCopyPlugin)</code>.
    </p>
    <i-chat ref="chatRef" />
  </div>
  <ExampleCodeDrawer title="Code copy plugin example" :content="codeCopyExample" />
</template>
