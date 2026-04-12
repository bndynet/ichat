<script setup>
import ChatDemoLayout from '../components/ChatDemoLayout.vue'

function init({ runTimeline, clear }) {
  clear()
  runTimeline()
}
</script>

<template>
  <ChatDemoLayout :init="init" />
</template>
