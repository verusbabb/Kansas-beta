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
        <div class="text-surface-600 space-y-2">
          <p class="m-0 font-medium text-surface-800">How to fill a roster</p>
          <ol class="m-0 pl-5 list-decimal space-y-1 text-sm">
            <li>
              <strong>Select the term</strong> in the dropdown (or create one with <strong>New term</strong>).
            </li>
            <li>
              For each <strong>position</strong>, choose a <strong>member</strong> from the directory. Only people
              marked as chapter <strong>members</strong> appear here—add them under
              <strong>Add/Manage Members and Parents</strong> if the list is empty.
            </li>
            <li>
              Click <strong>Save roster</strong> below the table. Assignments are not saved until you do.
            </li>
            <li class="text-surface-500">
              Optional: after someone is assigned, use <strong>Upload</strong> to add a headshot (stored on their
              directory record).
            </li>
          </ol>
        </div>

        <div class="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-end">
          <div class="flex flex-col gap-1 min-w-[12rem]">
            <label class="text-xs font-medium text-surface-600">Term</label>
            <Select
              v-model="selectedTermId"
              :options="termOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select a term"
              showClear
              filter
              filterPlaceholder="Search"
              size="small"
              class="w-full sm:w-64"
              :disabled="loadingMeta"
            />
          </div>
          <Button
            type="button"
            label="New term"
            icon="pi pi-plus"
            size="small"
            severity="secondary"
            outlined
            @click="newTermOpen = true"
          />
          <Button
            v-if="selectedTermId"
            type="button"
            label="Set as current"
            icon="pi pi-check-circle"
            size="small"
            outlined
            :loading="settingCurrent"
            @click="markCurrentTerm"
          />
          <Button
            v-if="selectedTermId"
            type="button"
            label="Delete term"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            outlined
            :loading="deletingTerm"
            @click="confirmDeleteTerm"
          />
        </div>

        <Message v-if="metaError" severity="error" :closable="false" class="w-full">{{ metaError }}</Message>

        <Message
          v-if="!loadingMeta && terms.length > 0 && !selectedTermId"
          severity="secondary"
          :closable="false"
          class="w-full text-sm"
        >
          Choose a <strong>term</strong> above to open the roster table and assign members.
        </Message>

        <Message
          v-if="selectedTermId && !rosterLoading && memberSelectOptions.length === 0"
          severity="warn"
          :closable="false"
          class="w-full text-sm"
        >
          No chapter members in the directory yet. Add people as members in
          <strong>Add/Manage Members and Parents</strong>, then return here and pick them for each position.
        </Message>

        <Message
          v-if="selectedTermId && !rosterLoading && positionListForRoster.length === 0"
          severity="warn"
          :closable="false"
          class="w-full text-sm"
        >
          No executive positions are available yet—the catalog in the database is empty. Run pending backend
          migrations (for example <code class="text-xs">npm run migration:run:dev</code> in the
          <code class="text-xs">backend</code> folder) so <code class="text-xs">exec_positions</code> is
          seeded, then refresh this page.
        </Message>

        <template v-if="selectedTermId && !rosterLoading && positionListForRoster.length > 0">
          <DataTable :value="positionRows" dataKey="positionId" stripedRows size="small" class="text-sm">
            <Column field="title" header="Position" class="min-w-[9rem]">
              <template #body="{ data }">
                <span class="font-medium text-surface-800">{{ data.title }}</span>
              </template>
            </Column>
            <Column header="Member" class="min-w-[14rem]">
              <template #body="{ data }">
                <Select
                  :modelValue="assignmentByPosition[data.positionId] ?? null"
                  :options="memberSelectOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select member"
                  showClear
                  filter
                  filterPlaceholder="Search"
                  size="small"
                  class="w-full max-w-md"
                  @update:model-value="(v: string | null) => setAssignment(data.positionId, v)"
                />
              </template>
            </Column>
            <Column header="Headshot" class="min-w-[11.75rem] whitespace-nowrap">
              <template #body="{ data }">
                <div
                  v-if="assignmentByPosition[data.positionId]"
                  class="inline-flex flex-nowrap items-center gap-1.5"
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    class="hidden"
                    :ref="(el) => setFileInputRef(data.positionId, el)"
                    @change="(e) => onHeadshotFile(e, assignmentByPosition[data.positionId]!)"
                  />
                  <Button
                    type="button"
                    :label="
                      headshotHint(assignmentByPosition[data.positionId]!) ? 'Re-upload' : 'Upload'
                    "
                    icon="pi pi-upload"
                    size="small"
                    severity="secondary"
                    outlined
                    class="shrink-0"
                    :loading="uploadingPersonId === assignmentByPosition[data.positionId]"
                    @click="triggerFileInput(data.positionId)"
                  />
                  <Button
                    v-if="headshotHint(assignmentByPosition[data.positionId])"
                    type="button"
                    icon="pi pi-times"
                    size="small"
                    severity="danger"
                    text
                    rounded
                    class="shrink-0"
                    v-tooltip.top="'Remove headshot'"
                    :loading="clearingPersonId === assignmentByPosition[data.positionId]"
                    @click="clearHeadshotFor(assignmentByPosition[data.positionId]!)"
                  />
                </div>
                <span v-else class="text-surface-400">—</span>
              </template>
            </Column>
          </DataTable>

          <p class="text-xs text-surface-500 m-0">
            Changes to member picks are kept in your browser until you save.
          </p>

          <div class="flex justify-end gap-2">
            <Button
              type="button"
              label="Save roster"
              icon="pi pi-save"
              size="small"
              class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
              :loading="savingRoster"
              :disabled="!selectedTermId || positionListForRoster.length === 0"
              @click="saveRoster"
            />
          </div>
        </template>

        <div v-else-if="selectedTermId && rosterLoading" class="text-surface-600 flex items-center gap-2 py-6">
          <i class="pi pi-spin pi-spinner"></i>
          Loading roster…
        </div>

        <p v-else-if="!loadingMeta && terms.length === 0" class="text-surface-600 m-0">
          No terms yet. Create a fall or spring term to begin.
        </p>
      </div>
    </template>
  </Card>

  <Dialog
    v-model:visible="newTermOpen"
    modal
    header="New executive term"
    class="max-w-md"
    :closable="!creatingTerm"
    @hide="resetNewTermForm"
  >
    <div class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-surface-600">Year</label>
        <InputNumber
          v-model="newTerm.year"
          :useGrouping="false"
          :min="1990"
          :max="2100"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-surface-600">Season</label>
        <Select
          v-model="newTerm.season"
          :options="seasonOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-surface-600">Label (optional)</label>
        <InputText v-model="newTerm.label" placeholder="e.g. Spring 2026" class="w-full" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox v-model="newTerm.isCurrent" inputId="exec-new-current" binary />
        <label for="exec-new-current" class="text-sm text-surface-700 cursor-pointer"
          >Set as current term for the public site</label
        >
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" outlined @click="newTermOpen = false" />
      <Button
        label="Create"
        icon="pi pi-check"
        class="bg-[#6F8FAF]"
        :loading="creatingTerm"
        @click="createTerm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import apiClient from '@/services/api'
import { isAxiosRejection } from '@/services/api'
import { usePeopleStore } from '@/stores/people'
import type {
  ExecTermPublic,
  ExecPositionPublic,
  ExecRosterResponse,
  ExecRosterSlot,
} from '@/types/execTeam'

const toast = useToast()
const confirm = useConfirm()
const peopleStore = usePeopleStore()

const terms = ref<ExecTermPublic[]>([])
const positions = ref<ExecPositionPublic[]>([])
/** Slots from the last roster load; used to show rows if /exec-team/positions is empty (defensive). */
const lastRosterSlots = ref<ExecRosterSlot[]>([])
const selectedTermId = ref<string | null>(null)
const assignmentByPosition = ref<Record<string, string | null>>({})

const loadingMeta = ref(true)
const rosterLoading = ref(false)
const metaError = ref<string | null>(null)
const savingRoster = ref(false)
const creatingTerm = ref(false)
const settingCurrent = ref(false)
const deletingTerm = ref(false)
const newTermOpen = ref(false)
const newTerm = ref({
  year: new Date().getFullYear(),
  season: 'spring' as 'fall' | 'spring',
  label: '',
  isCurrent: false,
})

const seasonOptions = [
  { label: 'Fall', value: 'fall' as const },
  { label: 'Spring', value: 'spring' as const },
]

const uploadingPersonId = ref<string | null>(null)
const clearingPersonId = ref<string | null>(null)
const fileInputRefs = ref<Record<string, HTMLInputElement | null>>({})

function setFileInputRef(positionId: string, el: unknown) {
  fileInputRefs.value[positionId] = (el as HTMLInputElement | null) ?? null
}

function triggerFileInput(positionId: string) {
  fileInputRefs.value[positionId]?.click()
}

const termOptions = computed(() =>
  terms.value.map((t) => ({
    value: t.id,
    label: t.label?.trim() || `${t.season === 'fall' ? 'Fall' : 'Spring'} ${t.year}${t.isCurrent ? ' (current)' : ''}`,
  })),
)

const memberSelectOptions = computed(() =>
  peopleStore.list
    .filter((p) => p.isMember)
    .map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName} · ${p.email}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
)

const positionListForRoster = computed<ExecPositionPublic[]>(() => {
  if (positions.value.length > 0) {
    return [...positions.value].sort((a, b) => a.sortOrder - b.sortOrder)
  }
  const fromSlots = lastRosterSlots.value.map((s) => s.position)
  return [...fromSlots].sort((a, b) => a.sortOrder - b.sortOrder)
})

const positionRows = computed(() =>
  positionListForRoster.value.map((p) => ({
    positionId: p.id,
    title: p.displayName,
  })),
)

function headshotHint(personId: string): boolean {
  const p = peopleStore.list.find((x) => x.id === personId)
  return !!p?.hasHeadshot
}

function setAssignment(positionId: string, personId: string | null) {
  assignmentByPosition.value = {
    ...assignmentByPosition.value,
    [positionId]: personId,
  }
}

async function loadMeta() {
  loadingMeta.value = true
  metaError.value = null
  try {
    await peopleStore.fetchPeople({ silent: true })
    const [termsRes, posRes] = await Promise.all([
      apiClient.get<ExecTermPublic[]>('/exec-team/terms'),
      apiClient.get<ExecPositionPublic[]>('/exec-team/positions'),
    ])
    terms.value = Array.isArray(termsRes.data) ? termsRes.data : []
    positions.value = Array.isArray(posRes.data) ? posRes.data : []
    if (!selectedTermId.value && terms.value.length > 0) {
      const cur = terms.value.find((t) => t.isCurrent)
      selectedTermId.value = cur?.id ?? terms.value[0].id
    }
  } catch {
    metaError.value = 'Could not load exec team metadata.'
  } finally {
    loadingMeta.value = false
  }
}

async function loadRosterForSelected() {
  const id = selectedTermId.value
  if (!id) {
    assignmentByPosition.value = {}
    lastRosterSlots.value = []
    return
  }
  rosterLoading.value = true
  lastRosterSlots.value = []
  try {
    const { data } = await apiClient.get<ExecRosterResponse>(`/exec-team/terms/${id}/roster`)
    const slots = data.slots ?? []
    lastRosterSlots.value = slots
    const map: Record<string, string | null> = {}
    for (const s of slots) {
      map[s.position.id] = s.person?.id ?? null
    }
    assignmentByPosition.value = map
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load roster.', life: 4000 })
    assignmentByPosition.value = {}
    lastRosterSlots.value = []
  } finally {
    rosterLoading.value = false
  }
}

watch(selectedTermId, (id) => {
  if (id) void loadRosterForSelected()
  else {
    assignmentByPosition.value = {}
    lastRosterSlots.value = []
  }
})

async function saveRoster() {
  const id = selectedTermId.value
  if (!id) return
  const plist = positionListForRoster.value
  if (plist.length === 0) return
  savingRoster.value = true
  try {
    const assignments = plist.map((p) => ({
      positionId: p.id,
      personId: assignmentByPosition.value[p.id] ?? null,
    }))
    await apiClient.put(`/exec-team/terms/${id}/roster`, { assignments })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Roster updated.', life: 3000 })
    await loadMeta()
    await loadRosterForSelected()
  } catch (err: unknown) {
    if (!isAxiosRejection(err)) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not save roster.',
        life: 5000,
      })
    }
  } finally {
    savingRoster.value = false
  }
}

async function createTerm() {
  creatingTerm.value = true
  try {
    const { data } = await apiClient.post<ExecTermPublic>('/exec-team/terms', {
      year: newTerm.value.year,
      season: newTerm.value.season,
      label: newTerm.value.label.trim() || undefined,
      isCurrent: newTerm.value.isCurrent || undefined,
    })
    const newId = data.id
    newTermOpen.value = false
    resetNewTermForm()
    await loadMeta()
    selectedTermId.value = newId
    toast.add({ severity: 'success', summary: 'Created', detail: 'Term created.', life: 3000 })
  } catch (err: unknown) {
    if (!isAxiosRejection(err)) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not create term (maybe it already exists).',
        life: 5000,
      })
    }
  } finally {
    creatingTerm.value = false
  }
}

function resetNewTermForm() {
  newTerm.value = {
    year: new Date().getFullYear(),
    season: 'spring',
    label: '',
    isCurrent: false,
  }
}

async function markCurrentTerm() {
  const id = selectedTermId.value
  if (!id) return
  settingCurrent.value = true
  try {
    await apiClient.patch(`/exec-team/terms/${id}`, { isCurrent: true })
    await loadMeta()
    toast.add({ severity: 'success', summary: 'Updated', detail: 'Current term set.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not update term.', life: 4000 })
  } finally {
    settingCurrent.value = false
  }
}

function confirmDeleteTerm() {
  const id = selectedTermId.value
  if (!id) return
  confirm.require({
    message: 'Delete this term and all position assignments? This cannot be undone.',
    header: 'Delete term',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: () => void runDeleteTerm(id),
  })
}

async function runDeleteTerm(id: string) {
  deletingTerm.value = true
  try {
    await apiClient.delete(`/exec-team/terms/${id}`)
    selectedTermId.value = null
    assignmentByPosition.value = {}
    await loadMeta()
    if (terms.value.length > 0) {
      const cur = terms.value.find((t) => t.isCurrent)
      selectedTermId.value = cur?.id ?? terms.value[0].id
      await loadRosterForSelected()
    }
    toast.add({ severity: 'success', summary: 'Deleted', detail: 'Term removed.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete term.', life: 4000 })
  } finally {
    deletingTerm.value = false
  }
}

async function onHeadshotFile(e: Event, personId: string) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploadingPersonId.value = personId
  try {
    await peopleStore.uploadHeadshot(personId, file)
    toast.add({ severity: 'success', summary: 'Uploaded', detail: 'Headshot saved.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Upload failed.', life: 4000 })
  } finally {
    uploadingPersonId.value = null
  }
}

async function clearHeadshotFor(personId: string) {
  clearingPersonId.value = personId
  try {
    await peopleStore.clearHeadshot(personId)
    toast.add({ severity: 'success', summary: 'Removed', detail: 'Headshot cleared.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not remove headshot.', life: 4000 })
  } finally {
    clearingPersonId.value = null
  }
}

onMounted(() => {
  void loadMeta()
})
</script>
