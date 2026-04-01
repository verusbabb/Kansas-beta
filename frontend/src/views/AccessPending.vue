<template>
  <div class="bg-surface-0 min-h-screen">
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-3xl mx-auto text-center">
        <h1 class="text-3xl md:text-4xl font-bold mb-4">Signed out — access not activated</h1>
        <p class="text-lg md:text-xl text-gray-200">
          You signed in successfully, but this site does not have an account for you yet.
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto mt-6"></div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-6 py-12">
      <Card>
        <template #title>What to do next</template>
        <template #content>
          <p class="text-surface-700 leading-relaxed mb-4">
            For security, we have signed you out. To use member or admin features, a chapter
            administrator must create your user account in this system. Please contact an
            officer or site administrator and ask them to grant you access, then try signing in
            again.
          </p>
          <p class="text-surface-600 text-sm mb-6">
            Public pages (home, events, contact, and similar) stay available without signing in.
          </p>
          <div class="flex flex-wrap gap-3">
            <Button label="Home" icon="pi pi-home" @click="goHome" />
            <Button
              label="Contact us"
              icon="pi pi-envelope"
              severity="secondary"
              outlined
              @click="goContact"
            />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'

const router = useRouter()

function goHome() {
  router.push('/')
}

function goContact() {
  router.push('/contact')
}
</script>
