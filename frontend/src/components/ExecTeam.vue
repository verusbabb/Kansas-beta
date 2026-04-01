<template>
  <Card class="mb-6">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-users text-[#6F8FAF]"></i>
        <span>Executive Team</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-6">
        <div class="text-surface-600">
          Meet the executive team members leading our chapter.
          <span v-if="roster?.term" class="block mt-1 text-sm text-surface-500">
            {{ termDisplayLabel(roster.term) }}
          </span>
        </div>

        <div v-if="terms.length > 0" class="flex flex-col gap-1 max-w-md">
          <label class="text-xs font-medium text-surface-600" for="exec-team-term-select"
            >Term</label
          >
          <Select
            id="exec-team-term-select"
            :model-value="selectedTermId"
            :options="termSelectOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select a term"
            filter
            filterPlaceholder="Search"
            size="small"
            class="w-full sm:w-80"
            :disabled="loading"
            @update:model-value="onTermSelected"
          />
        </div>

        <p
          v-if="!loading && roster?.term && !showRoleEmails"
          class="text-sm text-surface-500 m-0"
        >
          Office role email addresses are shown only for the
          <strong>current</strong> term; those inboxes stay with the office and are reassigned after
          elections.
        </p>

        <div v-if="loading" class="text-center py-12 text-surface-600">
          <i class="pi pi-spin pi-spinner text-3xl text-[#6F8FAF]"></i>
          <p class="mt-3">Loading…</p>
        </div>

        <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>

        <div
          v-else-if="filledSlots.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          <div
            v-for="slot in filledSlots"
            :key="slot.position.id"
            class="flex flex-col items-center text-center px-2"
          >
            <div
              class="exec-oval-photo mb-4 overflow-hidden bg-surface-200 ring-2 ring-[#6F8FAF]/25 shrink-0"
            >
              <img
                v-if="slot.person?.headshotUrl"
                :src="slot.person.headshotUrl"
                :alt="`${slot.person.firstName} ${slot.person.lastName}`"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#6F8FAF]"
              >
                {{ initials(slot.person!) }}
              </div>
            </div>
            <h3 class="text-lg font-bold text-surface-900 mb-1">
              {{ slot.person!.firstName }} {{ slot.person!.lastName }}
            </h3>
            <p class="text-sm font-medium text-[#6F8FAF] mb-2">{{ slot.position.displayName }}</p>
            <a
              v-if="slot.person!.phone && formatUsPhoneForDisplay(slot.person!.phone)"
              :href="`tel:${slot.person!.phone.replace(/\D/g, '')}`"
              class="text-sm text-surface-700 hover:text-[#6F8FAF] hover:underline"
            >
              {{ formatUsPhoneForDisplay(slot.person!.phone) }}
            </a>
            <span v-else class="text-sm text-surface-400">—</span>
            <a
              v-if="showRoleEmails"
              :href="`mailto:${slot.person!.email}`"
              class="text-sm text-[#6F8FAF] hover:underline break-all mt-1"
            >
              {{ slot.person!.email }}
            </a>
            <span v-else class="text-sm text-surface-400 mt-1">—</span>
          </div>
        </div>

        <div v-else class="text-center py-16">
          <i class="pi pi-users text-6xl text-surface-400 mb-4"></i>
          <h3 class="text-2xl font-bold text-surface-700 mb-2">No Executive Team Listed</h3>
          <p class="text-surface-600">
            Roster information will appear here once a term is published.
          </p>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Select from 'primevue/select'
import apiClient from '@/services/api'
import type { ExecRosterResponse, ExecRosterSlot, ExecTermPublic } from '@/types/execTeam'
import { formatUsPhoneForDisplay } from '@/utils/usPhone'

const route = useRoute()
const router = useRouter()

const roster = ref<ExecRosterResponse | null>(null)
const terms = ref<ExecTermPublic[]>([])
const selectedTermId = ref<string | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const filledSlots = computed(() => {
  const slots = roster.value?.slots ?? []
  return slots.filter((s): s is ExecRosterSlot & { person: NonNullable<ExecRosterSlot['person']> } =>
    Boolean(s.person),
  )
})

/** Role mailboxes stay with the office; only show them when viewing the chapter’s current term. */
const showRoleEmails = computed(() => roster.value?.term?.isCurrent === true)

const termSelectOptions = computed(() =>
  terms.value.map((t) => ({
    value: t.id,
    label:
      t.label?.trim() ||
      `${t.season === 'fall' ? 'Fall' : 'Spring'} ${t.year}${t.isCurrent ? ' (current)' : ''}`,
  })),
)

function defaultTermId(list: ExecTermPublic[]): string | null {
  if (list.length === 0) return null
  const current = list.find((t) => t.isCurrent)
  return current?.id ?? list[0].id
}

async function fetchRosterForTerm(termId: string | null) {
  const { data } = await apiClient.get<ExecRosterResponse>('/exec-team/roster', {
    params: termId ? { termId } : {},
  })
  roster.value = data
}

async function onTermSelected(id: string | null) {
  if (id == null) return
  selectedTermId.value = id
  loading.value = true
  error.value = null
  try {
    await fetchRosterForTerm(id)
    const preferred = defaultTermId(terms.value)
    const nextQuery = { ...route.query } as Record<string, string | string[]>
    if (preferred && id !== preferred) {
      nextQuery.execTerm = id
    } else {
      delete nextQuery.execTerm
    }
    await router.replace({ path: route.path, query: nextQuery })
  } catch {
    error.value = 'Could not load executive team.'
    roster.value = null
  } finally {
    loading.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: termsData } = await apiClient.get<ExecTermPublic[]>('/exec-team/terms')
    terms.value = Array.isArray(termsData) ? termsData : []

    /** Always start on the chapter’s current term after a full load (e.g. refresh), not `execTerm` in the URL. */
    const initialId = defaultTermId(terms.value)
    selectedTermId.value = initialId
    await fetchRosterForTerm(initialId)

    if (route.query.execTerm != null) {
      const q = { ...route.query } as Record<string, string | string[]>
      delete q.execTerm
      await router.replace({ path: route.path, query: q })
    }
  } catch {
    error.value = 'Could not load executive team.'
    roster.value = null
    terms.value = []
    selectedTermId.value = null
  } finally {
    loading.value = false
  }
}

function termDisplayLabel(term: NonNullable<ExecRosterResponse['term']>): string {
  if (term.label?.trim()) return term.label.trim()
  const s = term.season === 'fall' ? 'Fall' : 'Spring'
  return `${s} ${term.year}`
}

function initials(p: { firstName: string; lastName: string }): string {
  const a = p.firstName?.charAt(0) ?? ''
  const b = p.lastName?.charAt(0) ?? ''
  return `${a}${b}`.toUpperCase() || '?'
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.exec-oval-photo {
  width: 8.5rem;
  height: 10.5rem;
  border-radius: 50%;
}
</style>
