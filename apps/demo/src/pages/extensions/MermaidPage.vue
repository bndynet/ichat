<script setup>
import "@bndynet/ichat";
import {
  getDefaultMermaidTheme,
  MERMAID_THEME_NAMES,
  setDefaultMermaidTheme,
} from "@bndynet/ichat-renderer-mermaid";
import { onMounted, onUnmounted, nextTick, ref, watch } from "vue";
import { textPart } from "@bndynet/ichat";
import { demoData, nextId } from "../../composables/demo-data.js";
import ExampleCodeDrawer from "../../components/ExampleCodeDrawer.vue";
import mermaidExample from "../../examples/extensions/mermaid.md?raw";

const chatRef = ref(null);
const theme = ref(getDefaultMermaidTheme());
const themes = ["auto", ...MERMAID_THEME_NAMES];

watch(theme, (value) => setDefaultMermaidTheme(value));

onMounted(async () => {
  await nextTick();
  console.log(demoData.mermaid);
  chatRef.value.addMessage({
    id: nextId(),
    role: "assistant",
    parts: [textPart(demoData.mermaid)],
    timestamp: Date.now(),
  });
});

// Leave the library default untouched for the rest of the demo.
onUnmounted(() => {
  setDefaultMermaidTheme("auto");
});
</script>

<template>
  <div class="mermaid-theme-picker">
    <label for="mermaid-theme">Mermaid theme</label>
    <select id="mermaid-theme" v-model="theme">
      <option v-for="name in themes" :key="name" :value="name">
        {{
          name === "auto"
            ? "auto (follow page light/dark)"
            : name === "base"
              ? "base (--chat-* tokens)"
              : name
        }}
      </option>
    </select>
    <span class="mermaid-theme-picker__hint">
      Applies immediately to all diagrams below.
    </span>
  </div>

  <p class="mermaid-demo-hint">
    <code>auto</code> follows the site light/dark switch using Mermaid's
    official <code>default</code> / <code>dark</code> palettes.
    <code>base</code> derives colors from the chat <code>--chat-*</code> tokens
    (full mapping only for flowchart/sequence; other types may keep Mermaid's
    base palette). The remaining entries are Mermaid's official themes.
  </p>
  <i-chat-messages ref="chatRef" style="flex: 1; min-height: 0" />
  <ExampleCodeDrawer title="Mermaid code example" :content="mermaidExample" />
</template>

<style scoped>
.mermaid-theme-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--chat-text-secondary, #64748b);
}
.mermaid-theme-picker label {
  font-weight: 600;
  color: var(--chat-text, #1a1a2e);
}
.mermaid-theme-picker select {
  padding: 4px 8px;
  border: 1px solid var(--chat-border, #e2e8f0);
  border-radius: 6px;
  background: var(--chat-surface, #ffffff);
  color: var(--chat-text, #1a1a2e);
  font: inherit;
}
.mermaid-theme-picker__hint {
  opacity: 0.75;
}
.mermaid-demo-hint {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--chat-text-secondary, #64748b);
  background: var(--chat-surface-alt, #f1f5f9);
  border-radius: 6px;
  border: 1px solid var(--chat-border, #e2e8f0);
}
.mermaid-demo-hint code {
  font-size: 0.8em;
}
</style>
