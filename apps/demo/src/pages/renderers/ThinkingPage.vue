<script setup>
import ChatMessagesLayout from '../../components/ChatMessagesLayout.vue'

function init({ runThinkingDemo, clear }) {
  clear()
  runThinkingDemo()
}
</script>

<template>
  <ChatMessagesLayout :init="init" />
</template>
