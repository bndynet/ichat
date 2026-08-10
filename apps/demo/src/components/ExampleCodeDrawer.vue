<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import MarkdownIt from "markdown-it";

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: "示例代码",
  },
});

const isOpen = ref(false);
const closeButton = ref(null);
const renderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});
const renderedContent = computed(() => renderer.render(props.content));

function openDrawer() {
  isOpen.value = true;
}

function closeDrawer() {
  isOpen.value = false;
}

function handleKeydown(event) {
  if (event.key === "Escape") closeDrawer();
}

watch(isOpen, async (open) => {
  document.body.classList.toggle("example-code-drawer-open", open);
  if (open) {
    await nextTick();
    closeButton.value?.focus();
  }
});

onBeforeUnmount(() => {
  document.body.classList.remove("example-code-drawer-open");
});
</script>

<template>
  <button
    class="example-code-trigger"
    type="button"
    aria-controls="example-code-drawer"
    :aria-expanded="isOpen"
    aria-label="View example code"
    title="View example code"
    @click="openDrawer"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m8 9-3 3 3 3" />
      <path d="m16 9 3 3-3 3" />
      <path d="m14 5-4 14" />
    </svg>
  </button>

  <Teleport to="body">
    <Transition name="example-code-drawer">
      <div
        v-if="isOpen"
        class="example-code-drawer-backdrop"
        @click.self="closeDrawer"
        @keydown="handleKeydown"
      >
        <aside
          id="example-code-drawer"
          class="example-code-drawer"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <header class="example-code-drawer-header">
            <div>
              <p class="example-code-drawer-kicker">Example</p>
              <h2>{{ title }}</h2>
            </div>
            <button
              ref="closeButton"
              class="example-code-drawer-close"
              type="button"
              aria-label="关闭示例代码"
              @click="closeDrawer"
            >
              ×
            </button>
          </header>

          <div
            class="example-code-drawer-content markdown-body"
            v-html="renderedContent"
          ></div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.example-code-trigger {
  position: fixed;
  z-index: 9;
  top: 16px;
  right: 24px;
  display: grid;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid
    color-mix(in srgb, var(--color-link) 32%, var(--color-border));
  border-radius: 50%;
  place-items: center;
  color: var(--color-link);
  background: var(--color-content-bg);
  box-shadow: 0 3px 14px rgb(0 0 0 / 12%);
  cursor: pointer;
}

.example-code-trigger svg {
  width: 19px;
  height: 19px;
}

.example-code-trigger:hover {
  color: var(--color-content-bg);
  background: var(--color-link);
}

.example-code-trigger:focus-visible,
.example-code-drawer-close:focus-visible {
  outline: 2px solid var(--color-link);
  outline-offset: 3px;
}

.example-code-drawer-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgb(15 23 42 / 32%);
}

.example-code-drawer {
  width: min(800px, 100vw);
  height: 100%;
  overflow: auto;
  color: var(--color-text);
  background: var(--color-content-bg);
  border-left: 1px solid var(--color-border);
  box-shadow: -12px 0 32px rgb(15 23 42 / 18%);
}

.example-code-drawer-header {
  position: sticky;
  z-index: 1;
  top: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-content-bg);
}

.example-code-drawer-kicker {
  margin: 0 0 3px;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.example-code-drawer h2 {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.35;
}

.example-code-drawer-close {
  display: grid;
  flex: none;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  place-items: center;
  color: var(--color-text-secondary);
  background: transparent;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
}

.example-code-drawer-close:hover {
  color: var(--color-text);
  background: var(--color-sidebar-item-hover);
}

.example-code-drawer-content {
  padding: 24px;
}

.example-code-drawer-content :deep(h1) {
  margin-top: 0;
  font-size: 1.5rem;
}

.example-code-drawer-content :deep(h2:first-child) {
  margin-top: 0;
}

.example-code-drawer-content :deep(pre) {
  max-width: 100%;
}

.example-code-drawer-content :deep(pre code) {
  font-size: 0.78rem;
  line-height: 1.55;
}

.example-code-drawer-enter-active,
.example-code-drawer-leave-active {
  transition: opacity 180ms ease;
}

.example-code-drawer-enter-active .example-code-drawer,
.example-code-drawer-leave-active .example-code-drawer {
  transition: transform 180ms ease;
}

.example-code-drawer-enter-from,
.example-code-drawer-leave-to {
  opacity: 0;
}

.example-code-drawer-enter-from .example-code-drawer,
.example-code-drawer-leave-to .example-code-drawer {
  transform: translateX(100%);
}

@media (max-width: 640px) {
  .example-code-trigger {
    top: 10px;
    right: 12px;
    width: 38px;
    height: 38px;
  }

  .example-code-drawer-header,
  .example-code-drawer-content {
    padding-right: 18px;
    padding-left: 18px;
  }
}
</style>

<style>
body.example-code-drawer-open {
  overflow: hidden;
}
</style>
