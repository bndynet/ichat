<script setup>
import { demoData } from '../../composables/demo-data.js'
import ChatMessagesLayout from '../../components/ChatMessagesLayout.vue'

function init({ addStaticMessage, clear }) {
  clear()
  addStaticMessage(demoData[4][1])
}
</script>

<template>
  <ChatMessagesLayout :init="init" />
</template>
