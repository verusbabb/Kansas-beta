<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-black via-gray-900 to-black text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Rush Beta Theta Pi</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Join the Alpha Nu Chapter at the University of Kansas
        </p>
        <div class="w-32 h-1 bg-green-600 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-12">
      <!-- Why Rush Section -->
      <div class="mb-16">
        <h2 class="text-3xl font-bold text-surface-900 mb-8 text-center">Why Rush Beta Theta Pi?</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <template #content>
              <div class="flex items-start gap-4">
                <i class="pi pi-check-circle text-3xl text-green-600"></i>
                <div>
                  <h3 class="text-xl font-bold mb-2">Lifelong Brotherhood</h3>
                  <p class="text-surface-700">
                    Build lasting friendships and connections that extend far beyond your college years.
                  </p>
                </div>
              </div>
            </template>
          </Card>

          <Card>
            <template #content>
              <div class="flex items-start gap-4">
                <i class="pi pi-check-circle text-3xl text-green-600"></i>
                <div>
                  <h3 class="text-xl font-bold mb-2">Academic Excellence</h3>
                  <p class="text-surface-700">
                    Join a community that values scholarship and supports your academic success.
                  </p>
                </div>
              </div>
            </template>
          </Card>

          <Card>
            <template #content>
              <div class="flex items-start gap-4">
                <i class="pi pi-check-circle text-3xl text-green-600"></i>
                <div>
                  <h3 class="text-xl font-bold mb-2">Leadership Development</h3>
                  <p class="text-surface-700">
                    Develop leadership skills through chapter positions and campus involvement.
                  </p>
                </div>
              </div>
            </template>
          </Card>

          <Card>
            <template #content>
              <div class="flex items-start gap-4">
                <i class="pi pi-check-circle text-3xl text-green-600"></i>
                <div>
                  <h3 class="text-xl font-bold mb-2">Professional Network</h3>
                  <p class="text-surface-700">
                    Connect with alumni and brothers who can help launch your career.
                  </p>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Rush Events Timeline -->
      <div class="mb-16">
        <h2 class="text-3xl font-bold text-surface-900 mb-8 text-center">Rush Events</h2>
        <Timeline :value="rushEvents" align="alternate" class="w-full">
          <template #marker="slotProps">
            <span class="flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle bg-green-600 z-1">
              <i :class="slotProps.item.icon"></i>
            </span>
          </template>
          <template #content="slotProps">
            <Card>
              <template #title>
                {{ slotProps.item.title }}
              </template>
              <template #subtitle>
                {{ slotProps.item.date }}
                <span v-if="slotProps.item.location" class="ml-2 text-surface-500">
                  <i class="pi pi-map-marker mr-1"></i>{{ slotProps.item.location }}
                </span>
                <span v-if="slotProps.item.time" class="ml-2 text-surface-500">
                  <i class="pi pi-clock mr-1"></i>{{ slotProps.item.time }}
                </span>
              </template>
              <template #content>
                <p>{{ slotProps.item.description }}</p>
              </template>
            </Card>
          </template>
        </Timeline>
      </div>

      <!-- Contact for Rush -->
      <div class="bg-gray-50 rounded-lg p-8 text-center">
        <h2 class="text-2xl font-bold text-surface-900 mb-4">Interested in Rushing?</h2>
        <p class="text-surface-700 mb-6">
          Reach out to our rush chair to learn more about upcoming events and how to get involved.
        </p>
        <Button 
          label="Contact Rush Chair" 
          icon="pi pi-envelope"
          @click="$router.push('/contact')"
          size="large"
          class="bg-green-600 hover:bg-green-700"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import Card from 'primevue/card'
  import Timeline from 'primevue/timeline'
  import Button from 'primevue/button'
  import { useRushStore } from '@/stores/rush'

  const rushStore = useRushStore()
  const rushEvents = ref([])

  onMounted(async () => {
    await rushStore.fetchRushEvents()
    rushEvents.value = rushStore.events
  })
</script>

<style scoped>
  :deep(.p-timeline-event-marker) {
    background-color: #22c55e;
    border-color: #22c55e;
  }
</style>

