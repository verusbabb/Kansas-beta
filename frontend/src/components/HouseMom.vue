<template>
  <Card class="mb-6">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-heart text-[#6F8FAF]"></i>
        <span>House Mom</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-8">
        <p class="text-surface-600 m-0 max-w-3xl">
          Our house mom lives in the chapter house and helps create a supportive home for the brothers.
          Reach out with questions about the house or to connect with chapter life.
        </p>

        <div v-if="loading" class="text-center py-12 text-surface-600">
          <i class="pi pi-spin pi-spinner text-3xl text-[#6F8FAF]"></i>
          <p class="mt-3">Loading…</p>
        </div>

        <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>

        <template v-else>
          <div
            class="flex flex-col lg:flex-row gap-8 lg:items-start"
          >
            <div
              class="house-mom-photo mb-2 lg:mb-0 overflow-hidden bg-surface-200 ring-2 ring-[#6F8FAF]/25 shrink-0 mx-auto lg:mx-0"
            >
              <img
                v-if="data?.photoUrl"
                :src="data.photoUrl"
                :alt="displayName"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#6F8FAF]"
              >
                {{ initials }}
              </div>
            </div>

            <div class="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-2 min-w-0">
              <h2 class="text-xl font-bold text-surface-900 m-0">
                {{ displayName }}
              </h2>
              <a
                v-if="phoneDisplay"
                :href="`tel:${usPhoneDigits(data?.phone)}`"
                class="text-sm text-surface-700 hover:text-[#6F8FAF] hover:underline"
              >
                {{ phoneDisplay }}
              </a>
              <span v-else class="text-sm text-surface-400">—</span>
              <a
                v-if="data?.email"
                :href="`mailto:${data.email}`"
                class="text-sm text-[#6F8FAF] hover:underline break-all"
              >
                {{ data.email }}
              </a>
              <span v-else class="text-sm text-surface-400">—</span>
            </div>
          </div>

          <div class="border-t border-surface-200 pt-6 w-full min-w-0 max-w-full">
            <h3 class="text-lg font-semibold text-surface-800 m-0 mb-3">About</h3>
            <div
              v-if="data?.bioHtml && data.bioHtml.trim()"
              class="house-mom-bio text-surface-700 text-base leading-relaxed w-full min-w-0 max-w-full"
              v-html="data.bioHtml"
            />
            <p v-else class="text-surface-600 m-0 leading-relaxed break-words">
              {{ loremBio }}
            </p>
          </div>
        </template>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Message from 'primevue/message'
import apiClient from '@/services/api'
import type { HouseMomPublic } from '@/types/houseMom'
import { formatUsPhoneForDisplay, usPhoneDigits } from '@/utils/usPhone'

const loremBio =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. ' +
  'Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. ' +
  'Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. ' +
  'Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. ' +
  'In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. ' +
  'Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum.'

const data = ref<HouseMomPublic | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const displayName = computed(() => {
  const d = data.value
  if (!d) return 'House Mom'
  const full = `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim()
  return full || 'House Mom'
})

const initials = computed(() => {
  const d = data.value
  if (!d) return '?'
  const a = d.firstName?.charAt(0) ?? ''
  const b = d.lastName?.charAt(0) ?? ''
  const s = `${a}${b}`.toUpperCase()
  return s || '?'
})

const phoneDisplay = computed(() => formatUsPhoneForDisplay(data.value?.phone ?? ''))

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: res } = await apiClient.get<HouseMomPublic>('/house-mom')
    data.value = res
  } catch {
    error.value = 'Could not load house mom information.'
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.house-mom-photo {
  width: 8.5rem;
  height: 10.5rem;
  border-radius: 50%;
}

.house-mom-bio {
  overflow-wrap: break-word;
  word-break: break-word;
}

.house-mom-bio :deep(p) {
  margin: 0 0 0.75rem;
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}

.house-mom-bio :deep(p:last-child) {
  margin-bottom: 0;
}

.house-mom-bio :deep(ul),
.house-mom-bio :deep(ol) {
  margin: 0.5rem 0 0.75rem 1.25rem;
  padding-left: 1rem;
}

.house-mom-bio :deep(ul) {
  list-style-type: disc;
}

.house-mom-bio :deep(ol) {
  list-style-type: decimal;
}

.house-mom-bio :deep(a) {
  color: var(--p-primary-color, #6f8faf);
  text-decoration: underline;
}
</style>
