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
              <p class="text-sm text-surface-500 flex items-start gap-2">
                <i class="pi pi-sparkles mt-0.5 text-[#6F8FAF]"></i>
                <span>{{ introText }}</span>
              </p>
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

          <!-- Member results table -->
          <DataTable
            v-if="response.results.length > 0"
            :value="response.results"
            dataKey="id"
            stripedRows
            sortField="lastName"
            :sortOrder="1"
            :paginator="response.results.length > 25"
            :rows="25"
            :rowsPerPageOptions="[25, 50, 100]"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            responsiveLayout="stack"
            breakpoint="640px"
            class="text-sm"
          >
            <Column field="lastName" header="Name" sortable>
              <template #body="{ data }">
                <RouterLink
                  :to="{ name: 'person-profile', params: { id: data.id } }"
                  class="flex items-center gap-2.5 font-medium text-[#6F8FAF] hover:underline"
                >
                  <Avatar
                    :label="initials(data)"
                    shape="circle"
                    class="shrink-0 text-white"
                    :style="{ backgroundColor: '#6F8FAF', width: '2rem', height: '2rem', fontSize: '0.75rem' }"
                  />
                  <span>{{ data.firstName }} {{ data.lastName }}</span>
                </RouterLink>
              </template>
            </Column>

            <Column field="pledgeClassYear" header="PC Class" sortable>
              <template #body="{ data }">
                {{ data.pledgeClassYear ?? '—' }}
              </template>
            </Column>

            <Column header="Location" :sortable="false">
              <template #body="{ data }">
                {{ [data.city, data.state].filter(Boolean).join(', ') || '—' }}
              </template>
            </Column>

            <Column header="" :sortable="false" class="w-[1%] whitespace-nowrap">
              <template #body="{ data }">
                <div class="flex gap-1.5 justify-end">
                  <RouterLink :to="{ name: 'person-profile', params: { id: data.id } }">
                    <Button
                      icon="pi pi-user"
                      size="small"
                      severity="secondary"
                      outlined
                      v-tooltip.top="'View profile'"
                    />
                  </RouterLink>
                  <a
                    v-if="data.linkedinProfileUrl"
                    :href="data.linkedinProfileUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      icon="pi pi-linkedin"
                      size="small"
                      severity="secondary"
                      outlined
                      v-tooltip.top="'View LinkedIn'"
                    />
                  </a>
                </div>
              </template>
            </Column>
          </DataTable>

          <!-- Admin-only agent trace -->
          <details
            v-if="authStore.isAdmin && response.trace"
            class="mt-6 rounded-lg border border-surface-200 bg-surface-50 text-xs text-surface-600"
          >
            <summary class="cursor-pointer select-none px-3 py-2 font-medium flex items-center gap-2">
              <i class="pi pi-wrench text-surface-400"></i>
              Woogle trace
              <span
                class="rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide"
                :class="
                  response.trace.engine === 'agent'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                "
              >
                {{ response.trace.engine }}
              </span>
              <span class="text-surface-400 font-normal">
                {{ response.trace.steps }} step{{ response.trace.steps === 1 ? '' : 's' }} ·
                {{ (response.trace.latencyMs / 1000).toFixed(1) }}s
              </span>
            </summary>
            <div class="px-3 pb-3 pt-1 flex flex-col gap-1.5">
              <div>
                <span class="font-semibold">Tools used:</span>
                {{ response.trace.toolsUsed.length ? response.trace.toolsUsed.join(' → ') : 'none' }}
              </div>
              <div>
                <span class="font-semibold">Query type:</span> {{ response.queryType }}
              </div>
              <div v-if="response.trace.fallbackReason" class="text-amber-700">
                <span class="font-semibold">Fallback reason:</span> {{ response.trace.fallbackReason }}
              </div>
              <div v-if="response.trace.sql && response.trace.sql.length" class="flex flex-col gap-1">
                <span class="font-semibold">SQL run:</span>
                <pre
                  v-for="(stmt, i) in response.trace.sql"
                  :key="i"
                  class="whitespace-pre-wrap break-words rounded bg-surface-800 text-surface-100 p-2 text-[11px] leading-snug overflow-x-auto"
                >{{ stmt }}</pre>
              </div>
            </div>
          </details>
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
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'
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

interface AgentTrace {
  engine: 'agent' | 'fallback'
  steps: number
  toolsUsed: string[]
  latencyMs: number
  fallbackReason: string | null
  sql: string[] | null
}

interface AskResponse {
  interpretation: string
  queryType: 'member_directory' | 'site_content' | 'mixed'
  answer: string | null
  sources: NewsletterSource[]
  results: AlumniResult[]
  totalDbMatches: number
  trace?: AgentTrace
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

const initials = (p: { firstName: string; lastName: string }) =>
  `${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase() || '?'

const openNewsletter = async (newsletterId: string) => {
  try {
    const { data } = await apiClient.get<{ url: string }>(`/newsletters/${newsletterId}/signed-url`)
    window.open(data.url, '_blank', 'noopener,noreferrer')
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not open newsletter PDF.', life: 3000 })
  }
}

const introText = computed(() =>
  authStore.isAdmin
    ? "Just ask. Woogle searches across Alpha Nu — members and families, exec history, events, rush, and every newsletter, plus admin-only data and ad-hoc queries. You're seeing the full picture."
    : "Just ask. Woogle searches across Alpha Nu — members and families, exec history, events, rush, and every newsletter — showing whatever your role lets you see, and always respecting each member's privacy settings.",
)

async function submit() {
  const q = query.value.trim()
  if (!q) return

  loading.value = true
  response.value = null

  try {
    const { data } = await apiClient.post<AskResponse>('/ask', { query: q }, { timeout: 60000 })
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
