<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-12 px-6">
      <div class="max-w-3xl mx-auto text-center">
        <div class="flex items-center justify-center gap-3 mb-2">
          <img src="/woogle-dragon-v2.png" alt="" class="h-9 w-9 md:h-10 md:w-10 rounded-full object-cover flex-shrink-0" />
          <span class="text-4xl md:text-5xl font-bold">Woogle</span>
          <span class="text-xs font-semibold uppercase tracking-widest bg-yellow-400 text-yellow-900 rounded px-2 py-1">Beta</span>
        </div>
        <div class="text-lg text-gray-200 mb-3">Natural-language search over chapter content</div>
        <p class="text-sm text-gray-200 max-w-xl mx-auto">
          Ask about members, events, newsletters, chapter history, exec officers, and more —
          in plain English.
        </p>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-6 py-10">
      <!-- Login gate -->
      <div v-if="!authStore.isAuthenticated" class="text-center py-20">
        <i class="pi pi-lock text-6xl text-surface-300 mb-6 block"></i>
        <h2 class="text-2xl font-bold text-surface-700 mb-3">Sign in to use Woogle</h2>
        <p class="text-surface-500 mb-6">This feature is available to authenticated members only.</p>
        <LoginButton />
      </div>

      <template v-else>
        <!-- Search box -->
        <Card class="mb-6">
          <template #content>
            <div class="flex flex-col gap-4">
              <div class="flex gap-3">
                <InputText
                  v-model="query"
                  placeholder="Ask anything about the chapter…"
                  class="flex-1"
                  :disabled="loading"
                  @keydown.enter="submit"
                />
                <Button
                  label="Woogle"
                  icon="pi pi-search"
                  :loading="loading"
                  :disabled="!query.trim() || loading"
                  class="bg-[#6F8FAF] hover:bg-[#5A7A9F] shrink-0"
                  @click="submit"
                />
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="text-xs text-surface-500 self-center mr-1">Try:</span>
                <Button
                  v-for="example in examples"
                  :key="example"
                  :label="example"
                  size="small"
                  severity="secondary"
                  outlined
                  :disabled="loading"
                  class="text-xs"
                  @click="useExample(example)"
                />
              </div>
            </div>
          </template>
        </Card>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-16">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF] mb-4 block"></i>
          <p class="text-surface-600 font-medium">Searching…</p>
        </div>

        <!-- Results -->
        <template v-else-if="response">
          <!-- Interpretation + count bar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div class="flex items-center gap-2">
              <i class="pi pi-sparkles text-[#6F8FAF]"></i>
              <span class="font-semibold text-surface-800">{{ response.interpretation }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="response.queryType !== 'site_content'" class="text-sm text-surface-500">
                {{ response.results.length }} result{{ response.results.length === 1 ? '' : 's' }}
                <template v-if="response.totalDbMatches > response.results.length">
                  of {{ response.totalDbMatches }} matched
                </template>
              </span>
              <Button label="Clear" icon="pi pi-times" size="small" severity="secondary" text @click="clearResults" />
            </div>
          </div>

          <!-- RAG answer card -->
          <Card v-if="response.answer" class="mb-6 border-l-4 border-[#6F8FAF]">
            <template #content>
              <div class="flex items-start gap-3">
                <img src="/woogle-dragon-v2.png" alt="" class="h-7 w-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                <div class="flex flex-col gap-3 flex-1">
                  <div class="woogle-answer text-surface-700" v-html="renderedAnswer" />
                  <!-- Newsletter sources -->
                  <div v-if="response.sources?.length" class="flex flex-wrap gap-2 pt-1 border-t border-surface-100">
                    <span class="text-xs text-surface-400 self-center">Sources:</span>
                    <button
                      v-for="source in response.sources"
                      :key="source.id"
                      @click="openNewsletter(source.id)"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#6F8FAF]/10 text-[#6F8FAF] hover:bg-[#6F8FAF]/20 transition-colors cursor-pointer border border-[#6F8FAF]/20"
                    >
                      <i class="pi pi-file-pdf text-xs"></i>
                      {{ capitalize(source.season) }} {{ source.year }} Newsletter
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- No member results -->
          <div
            v-if="response.results.length === 0 && response.queryType !== 'site_content'"
            class="text-center py-16"
          >
            <i class="pi pi-filter-slash text-6xl text-surface-300 mb-4 block"></i>
            <h3 class="text-xl font-bold text-surface-600 mb-2">No matches found</h3>
            <p class="text-surface-400">Try broadening your search or rephrasing the question.</p>
          </div>

          <!-- Member result cards -->
          <div v-if="response.results.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="person in response.results"
              :key="person.id"
              class="border border-surface-200 rounded-lg p-4 flex flex-col gap-3 bg-white hover:border-[#6F8FAF] transition-colors"
            >
              <!-- Name -->
              <RouterLink
                :to="{ name: 'person-profile', params: { id: person.id } }"
                class="font-semibold text-[#6F8FAF] hover:underline leading-tight"
              >
                {{ person.firstName }} {{ person.lastName }}
              </RouterLink>

              <!-- Directory info -->
              <div class="text-sm text-surface-500 space-y-0.5">
                <div v-if="person.city || person.state">
                  <i class="pi pi-map-marker text-xs mr-1"></i>
                  {{ [person.city, person.state].filter(Boolean).join(', ') }}
                </div>
                <div v-if="person.pledgeClassYear">
                  <i class="pi pi-calendar text-xs mr-1"></i>
                  PC {{ person.pledgeClassYear }}
                </div>
                <div v-if="person.officeHistory?.length">
                  <i class="pi pi-star text-xs mr-1"></i>
                  {{ person.officeHistory.map((o) => o.position).join(', ') }}
                </div>
                <div v-if="person.relationships?.length">
                  <i class="pi pi-users text-xs mr-1"></i>
                  {{ person.relationships.length }} connection{{ person.relationships.length === 1 ? '' : 's' }}
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 mt-auto pt-1 border-t border-surface-100">
                <RouterLink :to="{ name: 'person-profile', params: { id: person.id } }" class="flex-1">
                  <Button label="View Profile" icon="pi pi-user" size="small" severity="secondary" outlined class="w-full" />
                </RouterLink>
                <a v-if="person.linkedinProfileUrl" :href="person.linkedinProfileUrl" target="_blank" rel="noopener noreferrer">
                  <Button icon="pi pi-linkedin" size="small" severity="secondary" outlined v-tooltip.top="'View LinkedIn'" />
                </a>
              </div>
            </div>
          </div>
        </template>

        <!-- Empty state -->
        <div v-else class="text-center py-16 text-surface-400">
          <i class="pi pi-search text-5xl mb-4 block opacity-30"></i>
          <p>Type a question above to search the chapter.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { RouterLink } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import apiClient from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import LoginButton from '@/components/LoginButton.vue'

interface OfficeHistoryItem {
  position: string
  season: 'fall' | 'spring'
  year: number
  isCurrent: boolean
}

interface RelationshipItem {
  relatedPersonId: string
  relatedPersonName: string
  relatedPersonPledgeYear: number | null
  relationshipType: string | null
  direction: 'from' | 'to'
}

interface AlumniResult {
  id: string
  firstName: string
  lastName: string
  city: string | null
  state: string | null
  pledgeClassYear: number | null
  linkedinProfileUrl: string | null
  email: string | null
  officeHistory: OfficeHistoryItem[]
  relationships: RelationshipItem[]
}

interface NewsletterSource {
  id: string
  season: string
  year: number
  title: string | null
}

interface AskResponse {
  interpretation: string
  queryType: 'member_directory' | 'site_content' | 'mixed'
  answer: string | null
  sources: NewsletterSource[]
  results: AlumniResult[]
  totalDbMatches: number
}

const authStore = useAuthStore()
const toast = useToast()

const query = ref('')
const loading = ref(false)
const response = ref<AskResponse | null>(null)

const renderedAnswer = computed<string>(() => {
  if (!response.value?.answer) return ''
  return marked.parse(response.value.answer) as string
})

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const openNewsletter = async (newsletterId: string) => {
  try {
    const { data } = await apiClient.get<{ url: string }>(`/newsletters/${newsletterId}/signed-url`)
    window.open(data.url, '_blank', 'noopener,noreferrer')
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not open newsletter PDF.', life: 3000 })
  }
}

const examples = [
  'Summarize the newsletter article about [member name]',
  'What are our chapter values?',
  'Who has served as President?',
  'What events are coming up this semester?',
]

function useExample(example: string) {
  query.value = example
  void submit()
}

async function submit() {
  const q = query.value.trim()
  if (!q) return

  loading.value = true
  response.value = null

  try {
    const { data } = await apiClient.post<AskResponse>('/ask', { query: q }, { timeout: 30000 })
    response.value = data
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Search failed',
      detail: 'Could not complete the search. Please try again.',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

function clearResults() {
  response.value = null
  query.value = ''
}
</script>

<style scoped>
.woogle-answer :deep(p) {
  margin-bottom: 0.6rem;
  line-height: 1.6;
}
.woogle-answer :deep(ul),
.woogle-answer :deep(ol) {
  padding-left: 1.4rem;
  margin-bottom: 0.6rem;
}
.woogle-answer :deep(li) {
  margin-bottom: 0.25rem;
  line-height: 1.6;
}
.woogle-answer :deep(strong) {
  font-weight: 600;
  color: #374151;
}
.woogle-answer :deep(h1),
.woogle-answer :deep(h2),
.woogle-answer :deep(h3) {
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: #1f2937;
}
.woogle-answer :deep(a) {
  color: #6f8faf;
  text-decoration: underline;
}
</style>
