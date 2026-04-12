<script setup>
import ChatMessagesLayout from '../../components/ChatMessagesLayout.vue'

function init({ runTimeline, clear }) {
  clear()
  runTimeline()
}
</script>

<template>
  <ChatMessagesLayout :init="init" />
</template>
