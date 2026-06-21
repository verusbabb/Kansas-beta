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
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8 rush-why-widgets">
          <Card v-for="w in whyWidgets" :key="w.id" class="min-w-0">
            <template #content>
              <div class="flex items-center gap-3 mb-3">
                <i class="pi pi-check-circle text-2xl text-gray-500 flex-none"></i>
                <h3 class="text-xl font-bold">{{ w.title }}</h3>
              </div>
              <div
                v-if="w.bodyHtml"
                class="rush-widget-body text-surface-700"
                v-html="sanitizeHtml(w.bodyHtml)"
              ></div>
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
        <Timeline v-else :value="rushEvents" align="alternate" class="w-full rush-events-timeline">
          <template #marker="slotProps">
            <span
              class="flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle bg-gray-500 z-1"
            >
              <i :class="slotProps.item.icon"></i>
            </span>
          </template>
          <template #content="slotProps">
            <Card class="min-w-0 max-w-full">
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
                  v-html="sanitizeHtml(slotProps.item.description)"
                ></div>
              </template>
            </Card>
          </template>
        </Timeline>
      </div>

      <!-- Life at Beta: Rush Photos -->
      <div v-if="photoStore.publicPhotos.length > 0 || photoStore.loading" class="mb-16">
        <h2 class="text-3xl font-bold text-surface-900 mb-8 text-center">Life at Beta</h2>
        <div v-if="photoStore.loading && photoStore.publicPhotos.length === 0" class="text-center py-12 text-surface-600">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF] mb-4 block"></i>
          Loading photos…
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 rush-photo-gallery">
          <div
            v-for="photo in photoStore.sortedPublicPhotos"
            :key="photo.id"
            class="rush-photo-item relative rounded-lg overflow-hidden bg-surface-100 cursor-pointer group"
            @click="openLightbox(photo)"
          >
            <img
              v-if="photoUrlCache[photo.id]"
              :src="photoUrlCache[photo.id]"
              :alt="photo.caption || 'Rush photo'"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              @error="handlePublicImgError(photo.id)"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-surface-400"
            >
              <i class="pi pi-image text-4xl"></i>
            </div>
            <div
              v-if="photo.caption"
              class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <p class="text-white text-sm leading-snug break-words">{{ photo.caption }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Lightbox -->
      <Dialog
        v-model:visible="lightboxVisible"
        modal
        :style="{ width: '90vw', maxWidth: '900px' }"
        :header="lightboxPhoto?.caption || 'Rush Photo'"
        :pt="{ content: { class: '!p-2' } }"
      >
        <img
          v-if="lightboxPhoto && photoUrlCache[lightboxPhoto.id]"
          :src="photoUrlCache[lightboxPhoto.id]"
          :alt="lightboxPhoto.caption || 'Rush photo'"
          class="w-full h-auto max-h-[75vh] object-contain rounded"
        />
      </Dialog>

      <!-- Interested in Rushing CTA -->
      <div class="bg-gray-50 rounded-lg p-8 text-center">
        <h2 class="text-2xl font-bold text-surface-900 mb-4">Interested in Rushing?</h2>
        <p class="text-surface-700 mb-6">
          Fill out a short application and a rush chair will be in touch about upcoming events.
        </p>
        <Button
          label="Click here to apply now"
          icon="pi pi-send"
          size="large"
          @click="$router.push('/rush/apply')"
          class="bg-[#6F8FAF] hover:bg-[#5a7a9a] border-[#6F8FAF]"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Timeline from 'primevue/timeline'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useRushStore } from '@/stores/rush'
import { useRushPageWidgetStore } from '@/stores/rushPageWidget'
import { useRushPhotoStore, type RushPhoto } from '@/stores/rushPhoto'
import apiClient from '@/services/api'
import { sanitizeHtml } from '@/utils/sanitizeHtml'

const rushStore = useRushStore()
const widgetStore = useRushPageWidgetStore()
const photoStore = useRushPhotoStore()

/**
 * Strip invisible Unicode break characters and Quill cursor artifacts that
 * cause browsers to break words mid-character regardless of overflow-wrap.
 * Targets: zero-width space (U+200B), soft hyphen (U+00AD), zero-width
 * non-joiner (U+200C), zero-width joiner (U+200D), BOM (U+FEFF), and the
 * ql-cursor span Quill injects during editing.
 */

const whyWidgets = computed(() =>
  [...widgetStore.widgets].sort((a, b) => a.slotIndex - b.slotIndex),
)

const rushEvents = computed(() =>
  [...rushStore.events].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.title.localeCompare(b.title)
  }),
)

// Photo signed URL cache
const photoUrlCache = ref<Record<string, string>>({})
const loadingPhotoIds = ref<Set<string>>(new Set())

async function loadPhotoUrl(id: string) {
  if (photoUrlCache.value[id] || loadingPhotoIds.value.has(id)) return
  loadingPhotoIds.value.add(id)
  try {
    const res = await apiClient.get<{ url: string }>(`/rush-photos/${id}/signed-url`)
    photoUrlCache.value[id] = res.data.url
  } catch {
    // silent — placeholder icon shown
  } finally {
    loadingPhotoIds.value.delete(id)
  }
}

function handlePublicImgError(id: string) {
  delete photoUrlCache.value[id]
  setTimeout(() => loadPhotoUrl(id), 1500)
}

// Lightbox
const lightboxVisible = ref(false)
const lightboxPhoto = ref<RushPhoto | null>(null)

function openLightbox(photo: RushPhoto) {
  lightboxPhoto.value = photo
  lightboxVisible.value = true
}

onMounted(async () => {
  await Promise.all([
    rushStore.fetchRushEvents(),
    widgetStore.fetchPublic(),
    photoStore.fetchPublic(),
  ])
  photoStore.sortedPublicPhotos.forEach((p) => loadPhotoUrl(p.id))
})
</script>

<style scoped>
/* Timeline: flex columns default to min-width:auto — force shrink so copy wraps */
.rush-events-timeline :deep(.p-timeline-event-opposite),
.rush-events-timeline :deep(.p-timeline-event-content) {
  min-width: 0;
}

.rush-events-timeline :deep(.p-card) {
  min-width: 0;
  max-width: 100%;
}

.rush-events-timeline :deep(.p-card-title),
.rush-events-timeline :deep(.p-card-subtitle) {
  overflow-wrap: break-word;
  white-space: normal;
}

.rush-why-widgets :deep(.p-card-body),
.rush-why-widgets :deep(.p-card-content) {
  width: 100%;
  box-sizing: border-box;
}

:deep(.p-timeline-event-marker) {
  background-color: #9ca3af;
  border-color: #9ca3af;
}

.rush-widget-body {
  display: block;
  width: 100%;
  overflow-wrap: break-word;
  hyphens: none;
}

.rush-event-body {
  overflow-wrap: break-word;
  max-width: 100%;
}

.rush-widget-body :deep(img),
.rush-event-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.rush-widget-body :deep(pre),
.rush-event-body :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.rush-event-body :deep(ul),
.rush-event-body :deep(ol) {
  margin-left: 1.25rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

/* Left-side alternate items (even) have right-aligned text — mirror list alignment to match */
.rush-events-timeline :deep(.p-timeline-event:nth-child(even) .rush-event-body ul),
.rush-events-timeline :deep(.p-timeline-event:nth-child(even) .rush-event-body ol) {
  margin-left: 0;
  margin-right: 1.25rem;
  list-style-position: inside;
  text-align: right;
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

/* Photo gallery grid: fixed 4:3 ratio cells */
.rush-photo-item {
  aspect-ratio: 4 / 3;
}
</style>

