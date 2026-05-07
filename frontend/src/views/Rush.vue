<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Rush Beta Theta Pi</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Join the Alpha Nu Chapter at the University of Kansas
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-12">
      <!-- Why Rush Section -->
      <div class="mb-16">
        <h2 class="text-3xl font-bold text-surface-900 mb-8 text-center">Why Rush Beta Theta Pi?</h2>
        <div v-if="widgetStore.loading && whyWidgets.length === 0" class="text-center py-12 text-surface-600">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF] mb-4 block"></i>
          Loading…
        </div>
        <div
          v-else-if="whyWidgets.length === 0"
          class="text-center py-8 text-surface-500 max-w-xl mx-auto"
        >
          <p>Content for this section is not available yet.</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card v-for="w in whyWidgets" :key="w.id">
            <template #content>
              <div class="flex items-start gap-4">
                <i class="pi pi-check-circle text-3xl text-gray-500 shrink-0"></i>
                <div class="min-w-0 flex-1">
                  <h3 class="text-xl font-bold mb-2">{{ w.title }}</h3>
                  <div
                    v-if="w.bodyHtml"
                    class="rush-widget-body text-surface-700"
                    v-html="w.bodyHtml"
                  ></div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Rush Events Timeline -->
      <div class="mb-16">
        <h2 class="text-3xl font-bold text-surface-900 mb-8 text-center">Rush Events</h2>
        <div v-if="rushStore.loading" class="text-center py-12 text-surface-600">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF] mb-4 block"></i>
          Loading events…
        </div>
        <div
          v-else-if="rushEvents.length === 0"
          class="text-center py-12 text-surface-600 max-w-xl mx-auto"
        >
          <p>Schedule coming soon. Check back for rush week events, or contact the rush chair below.</p>
        </div>
        <Timeline v-else :value="rushEvents" align="alternate" class="w-full">
          <template #marker="slotProps">
            <span
              class="flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle bg-gray-500 z-1"
            >
              <i :class="slotProps.item.icon"></i>
            </span>
          </template>
          <template #content="slotProps">
            <Card>
              <template #title>
                {{ slotProps.item.title }}
              </template>
              <template #subtitle>
                {{ slotProps.item.displayDate }}
                <span v-if="slotProps.item.location" class="ml-2 text-surface-500">
                  <i class="pi pi-map-marker mr-1"></i>{{ slotProps.item.location }}
                </span>
                <span v-if="slotProps.item.timeLabel" class="ml-2 text-surface-500">
                  <i class="pi pi-clock mr-1"></i>{{ slotProps.item.timeLabel }}
                </span>
              </template>
              <template #content>
                <div
                  v-if="slotProps.item.description"
                  class="rush-event-body text-surface-700"
                  v-html="slotProps.item.description"
                ></div>
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
          class="bg-gray-500 hover:bg-gray-600"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Timeline from 'primevue/timeline'
import Button from 'primevue/button'
import { useRushStore } from '@/stores/rush'
import { useRushPageWidgetStore } from '@/stores/rushPageWidget'

const rushStore = useRushStore()
const widgetStore = useRushPageWidgetStore()

const whyWidgets = computed(() =>
  [...widgetStore.widgets].sort((a, b) => a.slotIndex - b.slotIndex),
)

const rushEvents = computed(() =>
  [...rushStore.events].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.title.localeCompare(b.title)
  }),
)

onMounted(async () => {
  await Promise.all([rushStore.fetchRushEvents(), widgetStore.fetchPublic()])
})
</script>

<style scoped>
:deep(.p-timeline-event-marker) {
  background-color: #9ca3af;
  border-color: #9ca3af;
}

.rush-event-body :deep(ul),
.rush-event-body :deep(ol) {
  margin-left: 1.25rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.rush-event-body :deep(p) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.rush-event-body :deep(p:first-child) {
  margin-top: 0;
}

.rush-widget-body :deep(ul),
.rush-widget-body :deep(ol) {
  margin-left: 1.25rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.rush-widget-body :deep(p) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.rush-widget-body :deep(p:first-child) {
  margin-top: 0;
}

.rush-widget-body :deep(p:last-child) {
  margin-bottom: 0;
}
</style>

