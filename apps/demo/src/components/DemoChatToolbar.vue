<script setup>
import {
  Warning,
  Bell,
  Delete,
  CircleClose,
} from '@element-plus/icons-vue'

defineProps({
  streaming: { type: Boolean, default: false },
})

defineEmits([
  'error-message',
  'error-banner',
  'cancel-stream',
  'clear',
])
</script>

<template>
  <div class="demo-chat-toolbar">
    <el-button
      size="small"
      :disabled="streaming"
      :icon="Warning"
      @click="$emit('error-message')"
    >
      Error Message
    </el-button>

    <el-button
      size="small"
      :icon="Bell"
      @click="$emit('error-banner')"
    >
      Error Banner
    </el-button>

    <el-button
      size="small"
      type="danger"
      :icon="CircleClose"
      :disabled="!streaming"
      @click="$emit('cancel-stream')"
    >
      Cancel
    </el-button>

    <el-button
      size="small"
      type="danger"
      plain
      :icon="Delete"
      @click="$emit('clear')"
    >
      Clear
    </el-button>
  </div>
</template>

<style scoped>
.demo-chat-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin: 0 0 8px 0;
  border-radius: 8px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  background: var(--el-fill-color-light, #f5f7fa);
}
</style>
