<template>
  <div>
    <Header />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useToast } from 'primevue/usetoast'
  import Header from "./components/Header.vue";
  import { RouterView } from "vue-router";
  import { useToastStore } from '@/stores/toast'

  const toast = useToast()
  const toastStore = useToastStore()

  onMounted(() => {
    toastStore.init(toast)
  })
</script>

<style scoped>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.vue:hover {
    filter: drop-shadow(0 0 2em #42b883aa);
  }
</style>
