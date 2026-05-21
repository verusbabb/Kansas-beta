<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-3xl mx-auto text-center">
        <div class="flex items-center justify-center gap-3 mb-4">
          <div class="text-4xl md:text-5xl font-bold">Ask</div>
          <span class="text-xs font-semibold uppercase tracking-widest bg-yellow-400 text-yellow-900 rounded px-2 py-1 self-center">Beta</span>
        </div>
        <div class="text-xl text-gray-300 mb-2">Search the alumni directory in plain English</div>
        <div class="w-24 h-1 bg-gray-400 mx-auto mb-4"></div>
        <p class="text-sm text-gray-200 max-w-xl mx-auto">
          Professional data (employer, title) is looked up live via web search and may not always be current or complete.
          Results are best for location and class year queries — professional queries are a work in progress.
        </p>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-6 py-10">
      <!-- Login gate -->
      <div v-if="!authStore.isAuthenticated" class="text-center py-20">
        <i class="pi pi-lock text-6xl text-surface-300 mb-6 block"></i>
        <h2 class="text-2xl font-bold text-surface-700 mb-3">Sign in to use Alumni Search</h2>
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
                  placeholder="e.g. Who pledged in 2015? Alumni in Kansas City. Where does John Doe work?"
                  class="flex-1"
                  :disabled="loading"
                  @keydown.enter="submit"
                />
                <Button
                  label="Ask"
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

        <!-- Phase 1 loading (DB query + parse) -->
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
              <span class="text-sm text-surface-500">
                {{ visibleResults.length }} result{{ visibleResults.length === 1 ? '' : 's' }}
                <template v-if="response.totalDbMatches > visibleResults.length">
                  of {{ response.totalDbMatches }} matched
                </template>
              </span>
              <Button label="Clear" icon="pi pi-times" size="small" severity="secondary" text @click="clearResults" />
            </div>
          </div>

          <!-- Enrichment status banner -->
          <div v-if="response.isProfessionalQuery" class="mb-5">
            <!-- Still enriching -->
            <Message v-if="enriching" severity="info" :closable="false">
              <div class="flex items-center gap-2">
                <i class="pi pi-spin pi-spinner"></i>
                <span>Looking up professional info for {{ response.results.length }} alumni…</span>
              </div>
            </Message>
            <!-- Enrichment done -->
            <Message v-else-if="enrichmentSummary" severity="info" :closable="false">
              <i class="pi pi-check-circle mr-2"></i>{{ enrichmentSummary }}
            </Message>
          </div>

          <!-- No results -->
          <div v-if="visibleResults.length === 0 && !enriching" class="text-center py-16">
            <i class="pi pi-filter-slash text-6xl text-surface-300 mb-4 block"></i>
            <h3 class="text-xl font-bold text-surface-600 mb-2">No matches found</h3>
            <p class="text-surface-400">Try broadening your search or rephrasing the question.</p>
          </div>

          <!-- Result cards -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="person in visibleResults"
              :key="person.id"
              class="border border-surface-200 rounded-lg p-4 flex flex-col gap-3 bg-white hover:border-[#6F8FAF] transition-colors"
            >
              <!-- Name + enriched badge -->
              <div class="flex items-start justify-between gap-2">
                <RouterLink
                  :to="{ name: 'person-profile', params: { id: person.id } }"
                  class="font-semibold text-[#6F8FAF] hover:underline leading-tight"
                >
                  {{ person.firstName }} {{ person.lastName }}
                </RouterLink>
                <span
                  v-if="person.enriched"
                  class="shrink-0 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5"
                  title="Professional data found via web search"
                >
                  Enriched
                </span>
              </div>

              <!-- Professional info area — only rendered for professional queries -->
              <template v-if="response.isProfessionalQuery">
                <!-- Enrichment in progress shimmer -->
                <div v-if="enriching && !enrichmentMap.has(person.id)" class="space-y-1.5 animate-pulse">
                  <div class="h-3 bg-surface-200 rounded w-3/4"></div>
                  <div class="h-3 bg-surface-200 rounded w-1/2"></div>
                </div>
                <!-- Enriched data -->
                <div v-else-if="person.enriched" class="text-sm text-surface-700 space-y-0.5">
                  <div v-if="person.jobTitle || person.employer" class="font-medium">
                    {{ [person.jobTitle, person.employer].filter(Boolean).join(' · ') }}
                  </div>
                  <div v-if="person.industry" class="text-surface-500 text-xs">{{ person.industry }}</div>
                  <div v-if="person.matchReason" class="text-surface-500 text-xs italic mt-1">{{ person.matchReason }}</div>
                </div>
                <!-- No enrichment data found after enrichment completed -->
                <div v-else-if="!enriching" class="text-xs text-surface-400 italic">No professional data found</div>
              </template>

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
          <p>Type a question above to search the alumni directory.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { RouterLink } from 'vue-router'
import apiClient from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import LoginButton from '@/components/LoginButton.vue'

interface PersonEnrichInput {
  id: string
  firstName: string
  lastName: string
  linkedinProfileUrl: string | null
  email: string | null
  city: string | null
  state: string | null
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
  enriched: boolean
  employer: string | null
  jobTitle: string | null
  industry: string | null
  matchReason: string | null
}

interface AskResponse {
  interpretation: string
  results: AlumniResult[]
  totalDbMatches: number
  isProfessionalQuery: boolean
  enrichmentSummary: string | null
  professionalCriteria: string | null
  enrichPeople: PersonEnrichInput[]
}

interface EnrichResult {
  id: string
  enriched: boolean
  employer: string | null
  jobTitle: string | null
  industry: string | null
  linkedinProfileUrl: string | null
  matchReason: string | null
  excluded: boolean
}

interface EnrichResponse {
  results: EnrichResult[]
  enrichmentSummary: string | null
}

const authStore = useAuthStore()
const toast = useToast()

const query = ref('')
const loading = ref(false)
const enriching = ref(false)
const response = ref<AskResponse | null>(null)
const enrichmentMap = ref(new Map<string, EnrichResult>())
const enrichmentSummary = ref<string | null>(null)

/** Results after applying exclusions from professional filter */
const visibleResults = computed<AlumniResult[]>(() => {
  if (!response.value) return []
  return response.value.results
    .filter((p) => {
      const e = enrichmentMap.value.get(p.id)
      return !e?.excluded
    })
    .map((p) => {
      const e = enrichmentMap.value.get(p.id)
      if (!e || !e.enriched) return p
      return {
        ...p,
        enriched: true,
        employer: e.employer,
        jobTitle: e.jobTitle,
        industry: e.industry,
        linkedinProfileUrl: p.linkedinProfileUrl ?? e.linkedinProfileUrl,
        matchReason: e.matchReason,
      }
    })
})

const examples = [
  'Alumni in Kansas City',
  'Who pledged in 2015?',
  'Members in Texas',
  'Alumni in Chicago who work in finance',
  'Where does John Doe work?',
  'Alumni who pledged around 2005',
]

function useExample(example: string) {
  query.value = example
  void submit()
}

async function submit() {
  const q = query.value.trim()
  if (!q) return

  loading.value = true
  enriching.value = false
  response.value = null
  enrichmentMap.value = new Map()
  enrichmentSummary.value = null

  try {
    // Phase 1: instant DB results
    const { data } = await apiClient.post<AskResponse>('/ask', { query: q }, { timeout: 30000 })
    response.value = data
    loading.value = false

    // Phase 2: enrich in background if this is a professional query
    if (data.isProfessionalQuery && data.enrichPeople?.length) {
      enriching.value = true
      try {
        const { data: enrichData } = await apiClient.post<EnrichResponse>(
          '/ask/enrich',
          { people: data.enrichPeople, professionalCriteria: data.professionalCriteria },
          { timeout: 120000 },
        )
        // Merge enrichment results into the map — visibleResults recomputes reactively
        const newMap = new Map<string, EnrichResult>()
        for (const r of enrichData.results) {
          newMap.set(r.id, r)
        }
        enrichmentMap.value = newMap
        enrichmentSummary.value = enrichData.enrichmentSummary
      } catch {
        enrichmentSummary.value = 'Could not retrieve professional data.'
      } finally {
        enriching.value = false
      }
    }
  } catch {
    loading.value = false
    toast.add({
      severity: 'error',
      summary: 'Search failed',
      detail: 'Could not complete the search. Please try again.',
      life: 5000,
    })
  }
}

function clearResults() {
  response.value = null
  query.value = ''
  enrichmentMap.value = new Map()
  enrichmentSummary.value = null
}
</script>
