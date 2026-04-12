<script setup>
import ChatDemoLayout from '../components/ChatDemoLayout.vue'

function init({ runThinkingDemo, clear }) {
  clear()
  runThinkingDemo()
}
</script>

<template>
  <ChatDemoLayout :init="init" />
</template>
