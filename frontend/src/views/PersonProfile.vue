<template>
  <div class="bg-surface-0 min-h-screen">
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-12 px-6">
      <div class="max-w-4xl mx-auto">
        <Button
          type="button"
          label="Back to directory"
          icon="pi pi-arrow-left"
          severity="secondary"
          class="mb-4 !bg-white/10 !border-white/30 !text-white hover:!bg-white/20"
          @click="goBackToDirectory"
        />
        <div v-if="loading" class="flex items-center gap-3 text-lg">
          <i class="pi pi-spin pi-spinner" />
          Loading profile…
        </div>
        <template v-else-if="profile">
          <div class="flex flex-col sm:flex-row sm:items-end gap-6">
            <div
              v-if="profile.headshotUrl"
              class="profile-hero-photo shrink-0 overflow-hidden bg-white/10 ring-2 ring-white/35"
            >
              <img
                :src="profile.headshotUrl"
                :alt="`${profile.person.firstName} ${profile.person.lastName}`"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="text-3xl md:text-4xl font-bold">
                {{ profile.person.firstName }} {{ profile.person.lastName }}
              </h1>
              <p class="text-gray-200 mt-2 text-lg">
                {{ directoryRoleLine(profile.person) }}
                <template v-if="profile.person.pledgeClassYear != null">
                  · PC {{ profile.person.pledgeClassYear }}
                </template>
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
      <Message v-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>

      <template v-if="profile && !loading">
        <Card>
          <template #title>Contact</template>
          <template #content>
            <dl class="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm m-0">
              <dt class="text-surface-500 font-medium">Email</dt>
              <dd class="m-0">
                <a
                  :href="`mailto:${profile.person.email}`"
                  class="text-[#6F8FAF] hover:underline break-all"
                >
                  {{ profile.person.email }}
                </a>
              </dd>
              <dt class="text-surface-500 font-medium">Phone</dt>
              <dd class="m-0 text-surface-800">
                <span v-if="formatUsPhoneForDisplay(profile.person.phone)" class="whitespace-nowrap">
                  {{ formatUsPhoneForDisplay(profile.person.phone) }}
                </span>
                <span v-else class="text-surface-400">—</span>
              </dd>
              <dt class="text-surface-500 font-medium">Address</dt>
              <dd class="m-0 text-surface-800 whitespace-normal">{{ formatAddress(profile.person) }}</dd>
            </dl>
          </template>
        </Card>

        <Card>
          <template #title>Executive offices</template>
          <template #content>
            <p v-if="profile.execHistory.length === 0" class="text-surface-600 m-0">
              No executive offices recorded.
            </p>
            <ul v-else class="m-0 list-none space-y-2 p-0">
              <li
                v-for="(row, idx) in profile.execHistory"
                :key="`${row.term.id}-${row.position.id}-${idx}`"
                class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-surface-800"
              >
                <span class="font-medium text-surface-900">{{ row.position.displayName }}</span>
                <span class="text-surface-600">· {{ termDisplayLabel(row.term) }}</span>
                <Tag v-if="row.term.isCurrent" value="Current term" severity="success" class="text-xs" />
              </li>
            </ul>
          </template>
        </Card>

        <Card>
          <template #title>Connections</template>
          <template #content>
            <p v-if="profile.relationships.length === 0" class="text-surface-600 m-0">
              No connections listed.
            </p>
            <ul v-else class="m-0 list-none space-y-3 p-0">
              <li
                v-for="rel in profile.relationships"
                :key="rel.id"
                class="border-b border-surface-100 last:border-0 pb-3 last:pb-0"
              >
                <div class="flex flex-wrap items-start gap-2">
                  <template v-if="counterpartProfileLinkable(rel)">
                    <RouterLink
                      :to="{ name: 'person-profile', params: { id: rel.counterpart.id } }"
                      class="font-medium text-[#6F8FAF] hover:underline"
                    >
                      {{ rel.counterpart.firstName }} {{ rel.counterpart.lastName }}
                    </RouterLink>
                  </template>
                  <span v-else class="font-medium text-surface-900">
                    {{ rel.counterpart.firstName }} {{ rel.counterpart.lastName }}
                  </span>
                  <template v-if="rel.counterpart.pledgeClassYear != null">
                    <span class="text-surface-600">, PC {{ rel.counterpart.pledgeClassYear }}</span>
                  </template>
                  <span class="text-surface-700">, {{ rel.viewerCounterpartRoleLabel }}</span>
                  <span class="flex flex-wrap gap-1">
                    <Tag
                      v-for="tag in rel.connectionTags"
                      :key="tag"
                      :value="tag === 'legacy' ? 'Legacy' : 'Family'"
                      :severity="tag === 'legacy' ? 'secondary' : 'success'"
                      class="text-xs"
                    />
                  </span>
                </div>
                <p v-if="rel.notes?.trim()" class="text-surface-600 text-sm mt-1 mb-0">
                  {{ rel.notes.trim() }}
                </p>
              </li>
            </ul>
          </template>
        </Card>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { usePeopleStore } from '@/stores/people'
import { isAxiosRejection } from '@/services/api'
import type { PersonProfileResponse } from '@/types/personProfile'
import type { PersonResponse } from '@/types/person'
import type { PersonRelationshipResponse } from '@/types/personRelationship'
import type { ExecTermPublic } from '@/types/execTeam'
import { formatUsPhoneForDisplay } from '@/utils/usPhone'

const route = useRoute()
const router = useRouter()
const peopleStore = usePeopleStore()

const loading = ref(true)
const loadError = ref<string | null>(null)
const profile = ref<PersonProfileResponse | null>(null)

function directoryRoleLine(p: PersonResponse): string {
  if (p.isMember && p.isParent) return 'Member and parent'
  if (p.isMember) return 'Member'
  return 'Parent'
}

function formatAddress(p: PersonResponse): string {
  const line = [p.addressLine1, [p.city, p.state].filter(Boolean).join(', '), p.zip]
    .filter((s) => s && String(s).trim())
    .join(', ')
  return line || '—'
}

function termDisplayLabel(term: ExecTermPublic): string {
  if (term.label?.trim()) return term.label.trim()
  const s = term.season === 'fall' ? 'Fall' : 'Spring'
  return `${s} ${term.year}`
}

function counterpartProfileLinkable(rel: PersonRelationshipResponse): boolean {
  return !rel.counterpart.removedFromDirectory
}

function goBackToDirectory() {
  router.push({ path: '/members', query: { section: 'member-search' } })
}

async function load(id: string) {
  loading.value = true
  loadError.value = null
  profile.value = null
  try {
    profile.value = await peopleStore.fetchPersonProfile(id)
  } catch (e: unknown) {
    if (isAxiosRejection(e) && e.response?.status === 404) {
      loadError.value = 'This person is not in the directory (or was removed).'
    } else {
      loadError.value = 'Unable to load this profile.'
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string' && id) void load(id)
  },
  { immediate: true },
)
</script>

<style scoped>
/* Align with exec roster oval framing */
.profile-hero-photo {
  width: 8.5rem;
  height: 10.5rem;
  border-radius: 50%;
}
</style>
