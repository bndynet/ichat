<script setup>
import { demoData } from '../demo-data.js'
import ChatDemoLayout from '../components/ChatDemoLayout.vue'

function init({ addStaticMessage, clear }) {
  clear()
  addStaticMessage(demoData[3][1])
}
</script>

<template>
  <ChatDemoLayout :init="init" />
</template>
