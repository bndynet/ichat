<script setup>
import "@bndynet/ichat";
import { nextTick, onMounted, ref } from "vue";
import { textPart } from "@bndynet/ichat";
import ExampleCodeDrawer from "../../components/ExampleCodeDrawer.vue";
import bookmarkExample from "../../examples/builtin/bookmark.md?raw";

const chatRef = ref(null);
const bookmarksRef = ref(null);
const mode = ref("few"); // "few" | "many"
const barColor = ref(""); // "" = inherit --chat-primary
const loading = ref(false);

const COLOR_PRESETS = [
  { label: "Default", value: "" },
  { label: "Warning", value: "#f59e0b" },
  { label: "Success", value: "#10b981" },
  { label: "Error", value: "#ef4444" },
];

function buildFewMessages() {
  const now = Date.now();
  const messages = [];
  for (let i = 1; i <= 30; i++) {
    const role = i % 4 === 0 ? "self" : i % 2 === 0 ? "assistant" : "peer";
    let bookmark;
    if (i === 3) bookmark = true;
    else if (i === 7) bookmark = { label: "结论：方案 B 已通过" };
    else if (i === 14) bookmark = { label: "系统公告" };
    else if (i === 21) bookmark = { label: "@我 的重要消息" };
    else if (i === 27) bookmark = true;

    messages.push({
      id: `bm-${i}`,
      role,
      parts: [
        textPart(
          `**Message ${i}**  \n${"Some chatroom chatter for this message. ".repeat((i % 3) + 1)}`,
          { id: `bm-part-${i}` },
        ),
      ],
      timestamp: now - (30 - i) * 60000,
      ...(bookmark ? { bookmark } : {}),
    });
  }
  return messages;
}

function buildManyMessages() {
  const now = Date.now();
  return Array.from({ length: 1000 }, (_, index) => {
    const n = index + 1;
    const bookmarked =
      n === 1 || n === 250 || n === 500 || n === 750 || n === 1000;
    return {
      id: `bm-many-${n}`,
      role: n % 4 === 0 ? "self" : "assistant",
      parts: [textPart(`**Message ${n}**`, { id: `bm-many-part-${n}` })],
      timestamp: now + n,
      ...(bookmarked
        ? { bookmark: n === 1 ? { label: "最早的消息" } : true }
        : {}),
    };
  });
}

async function applyMode(next) {
  const chat = chatRef.value;
  if (!chat) return;
  loading.value = true;
  mode.value = next;
  await nextTick();
  chat.messages = next === "few" ? buildFewMessages() : buildManyMessages();
  // Direct .messages assignment does not emit `messages-change`; refresh the rail.
  bookmarksRef.value?.refresh();
  await chat.updateComplete;
  loading.value = false;
}

onMounted(async () => {
  await nextTick();
  if (chatRef.value) {
    chatRef.value.messages = buildFewMessages();
    bookmarksRef.value?.refresh();
  }
});
</script>

<template>
  <div
    class="bookmark-demo"
    :style="barColor ? { '--chat-bookmark-color': barColor } : {}"
  >
    <div class="demo-toolbar">
      <div class="toolbar-control">
        <span class="toolbar-label">Messages</span>
        <el-radio-group
          v-model="mode"
          size="small"
          :disabled="loading"
          @change="applyMode"
        >
          <el-radio-button value="few">Few (regular)</el-radio-button>
          <el-radio-button value="many">Many (virtual)</el-radio-button>
        </el-radio-group>
      </div>

      <div class="toolbar-control">
        <span class="toolbar-label">Bar color</span>
        <el-button
          v-for="preset in COLOR_PRESETS"
          :key="preset.label"
          size="small"
          :type="barColor === preset.value ? 'primary' : 'default'"
          @click="barColor = preset.value"
        >
          {{ preset.label }}
        </el-button>
      </div>
    </div>

    <p class="demo-note">
      Only messages with a truthy <code>bookmark</code> appear in the rail.
      Hover a bar to preview; click to jump. The rail is a standalone
      <code>&lt;i-chat-bookmarks&gt;</code> element bound with
      <code>for="bookmark-chat"</code> — place it anywhere in your layout.
    </p>

    <div class="demo-body">
      <div class="floating-rail">
        <i-chat-bookmarks for="bookmark-chat" ref="bookmarksRef" />
      </div>
      <i-chat-messages id="bookmark-chat" ref="chatRef" class="message-list" />
    </div>
  </div>

  <ExampleCodeDrawer
    title="Bookmarks code example"
    :content="bookmarkExample"
  />
</template>

<style scoped>
.bookmark-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--el-text-color-primary, #303133);
}

.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 20px;
  padding: 10px 64px 10px 12px;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  background: var(--el-fill-color-light, #f5f7fa);
}

.toolbar-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  color: var(--el-text-color-secondary, #606266);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.demo-note {
  margin: 0;
  padding: 7px 12px;
  color: var(--el-color-warning-dark-2, #b88230);
  background: var(--el-color-warning-light-9, #fdf6ec);
  font-size: 12px;
  line-height: 1.6;
}

.demo-note code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.demo-body {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  align-items: stretch;
}

.floating-rail {
  position: absolute;
  left: -20px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  z-index: 2;
  pointer-events: none;
}

.floating-rail > i-chat-bookmarks {
  pointer-events: auto;
}

.message-list {
  flex: 1;
  min-height: 0;
}

@media (max-width: 760px) {
  .demo-toolbar {
    align-items: flex-start;
    padding-right: 56px;
  }
}
</style>
