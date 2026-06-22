<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h2 class="text-xl font-semibold text-surface-900 flex items-center gap-2">
        <i class="pi pi-users text-[#6F8FAF]"></i>
        Rush CRM
        <span
          v-if="!store.loading && store.list.length > 0"
          class="text-sm font-normal text-surface-500 ml-1"
        >
          {{ filteredProspects.length }} prospect{{ filteredProspects.length !== 1 ? 's' : '' }}
        </span>
      </h2>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-surface-600 shrink-0">Pledge Class Year:</label>
        <Select
          v-model="selectedYear"
          :options="yearOptions"
          option-label="label"
          option-value="value"
          class="w-32"
          @change="onYearChange"
        />
      </div>
    </div>

    <!-- Stage stats bar -->
    <div v-if="stageStats.length > 0" class="flex flex-wrap gap-2">
      <button
        v-for="stat in stageStats"
        :key="stat.stage"
        type="button"
        v-tooltip.bottom="stageDescriptionMap[stat.stage]"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
          stageFilter === stat.stage
            ? 'bg-[#6F8FAF] text-white border-[#6F8FAF]'
            : 'bg-surface-0 text-surface-700 border-surface-200 hover:border-[#6F8FAF] hover:text-[#6F8FAF]',
        ]"
        @click="toggleStageFilter(stat.stage)"
      >
        <span>{{ stat.label }}</span>
        <span
          :class="[
            'rounded-full px-1.5 py-0.5 text-xs font-bold',
            stageFilter === stat.stage ? 'bg-white text-[#6F8FAF]' : 'bg-surface-100 text-surface-600',
          ]"
        >
          {{ stat.count }}
        </span>
      </button>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-col sm:flex-row gap-3">
      <IconField class="flex-1">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Search by name or email…"
          class="w-full"
        />
      </IconField>
      <Select
        v-model="stageFilter"
        :options="stageFilterOptions"
        option-label="label"
        option-value="value"
        placeholder="All stages"
        class="w-full sm:w-48"
      >
        <template #option="{ option }">
          <div class="flex flex-col py-0.5">
            <span class="font-medium">{{ option.label }}</span>
            <span v-if="option.value" class="text-xs text-surface-500 leading-snug max-w-xs">
              {{ stageDescriptionMap[option.value] }}
            </span>
          </div>
        </template>
      </Select>
      <Button
        v-if="isFiltered"
        icon="pi pi-times"
        label="Clear"
        severity="secondary"
        outlined
        @click="clearFilters"
      />
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex justify-center py-16">
      <ProgressSpinner style="width: 48px; height: 48px" />
    </div>

    <!-- Empty state -->
    <div v-else-if="store.list.length === 0" class="text-center py-16 text-surface-500">
      <i class="pi pi-users text-5xl mb-4 block text-surface-300"></i>
      <p class="text-lg font-medium">No prospects for Pledge Class {{ selectedYear }}</p>
      <p class="text-sm mt-1">Applications submitted via /rush/apply will appear here.</p>
    </div>

    <div v-else-if="filteredProspects.length === 0" class="text-center py-12 text-surface-500">
      <i class="pi pi-search text-4xl mb-4 block text-surface-300"></i>
      <p>No prospects match your filters.</p>
      <Button label="Clear filters" text severity="secondary" class="mt-2" @click="clearFilters" />
    </div>

    <!-- DataTable -->
    <DataTable
      v-else
      :value="filteredProspects"
      :rows="25"
      :rows-per-page-options="[10, 25, 50]"
      paginator
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      sort-field="createdAt"
      :sort-order="-1"
      row-hover
      class="text-sm"
      @row-click="openDetail($event.data)"
    >
      <Column field="lastName" header="Name" sortable>
        <template #body="{ data }">
          <button
            type="button"
            class="font-medium text-[#6F8FAF] hover:underline text-left"
            @click.stop="openDetail(data)"
          >
            {{ data.lastName }}, {{ data.firstName }}
          </button>
        </template>
      </Column>

      <Column field="email" header="Email">
        <template #body="{ data }">
          <a
            :href="`mailto:${data.email}?subject=Kansas Beta Rush&body=Hi ${data.firstName},%0A%0A`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[#6F8FAF] hover:underline"
            @click.stop
          >
            {{ data.email }}
          </a>
        </template>
      </Column>

      <Column field="classYear" header="Class Year" sortable>
        <template #body="{ data }">
          {{ data.classYear ? classYearLabels[data.classYear] : '—' }}
        </template>
      </Column>

      <Column field="enrollmentSemester" header="KU Start" sortable>
        <template #body="{ data }">
          <span v-if="data.enrollmentSemester && data.enrollmentYear">
            {{ data.enrollmentSemester === 'fall' ? 'Fall' : 'Spring' }} {{ data.enrollmentYear }}
          </span>
          <span v-else class="text-surface-400">—</span>
        </template>
      </Column>

      <Column field="pipelineStage" header="Stage" sortable>
        <template #body="{ data }">
          <Tag
            :value="stageLabelMap[data.pipelineStage]"
            :severity="stageSeverityMap[data.pipelineStage]"
          />
        </template>
      </Column>

      <Column field="internalRating" header="Rating" sortable>
        <template #body="{ data }">
          <span v-if="data.internalRating" class="flex items-center gap-0.5">
            <i
              v-for="n in 5"
              :key="n"
              :class="['pi text-sm', n <= data.internalRating ? 'pi-star-fill text-yellow-400' : 'pi-star text-surface-300']"
            />
          </span>
          <span v-else class="text-surface-400">—</span>
        </template>
      </Column>

      <Column header="Days in stage">
        <template #body="{ data }">
          <span class="text-surface-500">{{ daysInStage(data) }}</span>
        </template>
      </Column>

      <Column header="" style="width: 80px">
        <template #body="{ data }">
          <div class="flex items-center gap-1" @click.stop>
            <Button
              icon="pi pi-pencil"
              size="small"
              text
              severity="secondary"
              v-tooltip.top="'Edit prospect'"
              @click="openDetail(data)"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              v-tooltip.top="'Delete prospect'"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Prospect Detail Dialog -->
    <Dialog
      v-model:visible="detailVisible"
      modal
      :style="{ width: '64rem', maxWidth: '95vw' }"
      :header="`${currentProspect?.firstName ?? ''} ${currentProspect?.lastName ?? ''}`"
      :closable="true"
      @hide="onDetailClose"
    >
      <div v-if="detailLoading" class="flex justify-center py-16">
        <ProgressSpinner style="width: 48px; height: 48px" />
      </div>

      <div v-else-if="fullProspect" class="flex flex-col lg:flex-row gap-6">
        <!-- Left: editable info -->
        <div class="flex-1 flex flex-col gap-5 min-w-0">
          <h3 class="font-semibold text-surface-700 border-b border-surface-100 pb-2">Prospect Info</h3>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">First Name</label>
              <InputText v-model="editForm.firstName" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Last Name</label>
              <InputText v-model="editForm.lastName" class="w-full" />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Email</label>
            <a
              :href="`mailto:${fullProspect.email}?subject=Kansas Beta Rush&body=Hi ${fullProspect.firstName},%0A%0A`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#6F8FAF] hover:underline text-sm"
            >
              {{ fullProspect.email }}
            </a>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Phone</label>
              <InputText v-model="editForm.phone" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Class Year</label>
              <Select
                v-model="editForm.classYear"
                :options="classYearOptions"
                option-label="label"
                option-value="value"
                placeholder="Select"
                class="w-full"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Enrollment Semester</label>
              <Select
                v-model="editForm.enrollmentSemester"
                :options="semesterOptions"
                option-label="label"
                option-value="value"
                placeholder="Semester"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Enrollment Year</label>
              <Select
                v-model="editForm.enrollmentYear"
                :options="enrollmentYearOptions"
                option-label="label"
                option-value="value"
                placeholder="Year"
                class="w-full"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Hometown</label>
              <InputText v-model="editForm.hometown" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">High School</label>
              <InputText v-model="editForm.highSchool" class="w-full" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">GPA</label>
              <InputText v-model="editForm.gpaStr" placeholder="3.85" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">ACT</label>
              <InputText v-model="editForm.actScoreStr" placeholder="32" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">SAT</label>
              <InputText v-model="editForm.satScoreStr" placeholder="1420" class="w-full" />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Major</label>
            <InputText v-model="editForm.major" class="w-full" />
          </div>

          <!-- Pipeline stage -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Pipeline Stage</label>
            <Select
              v-model="editForm.pipelineStage"
              :options="pipelineStageOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            >
              <template #option="{ option }">
                <div class="flex flex-col py-0.5">
                  <span class="font-medium">{{ option.label }}</span>
                  <span class="text-xs text-surface-500 leading-snug max-w-xs">
                    {{ option.description }}
                  </span>
                </div>
              </template>
            </Select>
          </div>

          <!-- Internal rating -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Internal Rating</label>
            <div class="flex gap-2">
              <button
                v-for="n in 5"
                :key="n"
                type="button"
                class="text-2xl transition-colors"
                @click="editForm.internalRating = editForm.internalRating === n ? null : n"
              >
                <i :class="['pi', (editForm.internalRating ?? 0) >= n ? 'pi-star-fill text-yellow-400' : 'pi-star text-surface-300']" />
              </button>
            </div>
          </div>

          <!-- Legacy -->
          <div v-if="fullProspect.legacyRelativeFullName || fullProspect.legacyRelativeName" class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Alpha Nu Legacy</label>
            <p class="text-sm text-surface-700">
              {{ fullProspect.legacyRelativeFullName ?? fullProspect.legacyRelativeName }}
              <span v-if="fullProspect.legacyRelationship" class="text-surface-500">
                ({{ legacyRelationshipLabels[fullProspect.legacyRelationship] }})
              </span>
            </p>
          </div>

          <!-- Referral -->
          <div v-if="fullProspect.referralSource" class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Referral Source</label>
            <p class="text-sm text-surface-700">{{ fullProspect.referralSource }}</p>
          </div>

          <!-- Save button -->
          <div class="flex justify-end pt-2 border-t border-surface-100">
            <Button
              label="Save Changes"
              icon="pi pi-check"
              :loading="saving"
              class="bg-[#6F8FAF] hover:bg-[#5a7a9a] border-[#6F8FAF]"
              @click="saveProspect"
            />
          </div>
        </div>

        <!-- Right: activity log -->
        <div class="w-full lg:w-80 flex flex-col gap-4 min-w-0">
          <h3 class="font-semibold text-surface-700 border-b border-surface-100 pb-2">Activity Log</h3>

          <!-- Add note -->
          <div class="flex flex-col gap-2 p-3 bg-surface-50 rounded-lg">
            <Textarea
              v-model="newNote"
              placeholder="Add a note, call log, or activity…"
              rows="3"
              class="w-full text-sm"
              auto-resize
            />
            <div class="flex gap-2">
              <Select
                v-model="newActivityType"
                :options="manualActivityTypeOptions"
                option-label="label"
                option-value="value"
                class="flex-1 text-sm"
              />
              <Button
                label="Log"
                icon="pi pi-plus"
                size="small"
                :loading="addingActivity"
                :disabled="!newNote.trim()"
                class="bg-[#6F8FAF] hover:bg-[#5a7a9a] border-[#6F8FAF]"
                @click="logActivity"
              />
            </div>
          </div>

          <!-- Activity list -->
          <div class="flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-1">
            <div
              v-for="activity in fullProspect.activities"
              :key="activity.id"
              class="flex gap-2.5 text-sm"
            >
              <div class="mt-0.5 shrink-0">
                <i :class="[activityTypeIcons[activity.activityType], 'text-[#6F8FAF] text-base']" />
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-medium text-surface-800">
                    {{ activityTypeLabels[activity.activityType] }}
                  </span>
                  <span
                    v-if="activity.activityType === 'stage_change' && activity.fromStage && activity.toStage"
                    class="text-surface-500 text-xs"
                  >
                    {{ stageLabelMap[activity.fromStage] ?? activity.fromStage }}
                    <i class="pi pi-arrow-right mx-1" />
                    {{ stageLabelMap[activity.toStage] ?? activity.toStage }}
                  </span>
                </div>
                <p v-if="activity.note" class="text-surface-600 break-words">{{ activity.note }}</p>
                <p v-if="activity.rushEventTitle" class="text-surface-500 italic text-xs">
                  {{ activity.rushEventTitle }}
                </p>
                <p class="text-surface-400 text-xs">
                  {{ formatDate(activity.createdAt) }}
                  <span v-if="activity.createdByName"> · {{ activity.createdByName }}</span>
                </p>
              </div>
            </div>

            <p v-if="fullProspect.activities.length === 0" class="text-surface-400 text-sm text-center py-4">
              No activity yet.
            </p>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Confirm delete -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import { useRushProspectStore } from '@/stores/rushProspect'
import type { RushProspectSummary, RushProspectResponse, PipelineStage, ClassYear } from '@/types/rushProspect'
import {
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_SEVERITY,
  PIPELINE_STAGE_DESCRIPTIONS,
  CLASS_YEAR_LABELS,
  LEGACY_RELATIONSHIP_LABELS,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
  ALL_PIPELINE_STAGES,
} from '@/types/rushProspect'

const store = useRushProspectStore()
const confirm = useConfirm()
const toast = useToast()

// ── Year selector ────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1 // 1-indexed

/**
 * Default to the next upcoming Fall pledge class year.
 * If we're in August or later (fall semester underway), the active rush
 * is recruiting for NEXT year's class. Before August we're still working
 * toward the current calendar year's fall class.
 */
const defaultPledgeClassYear = currentMonth >= 8 ? currentYear + 1 : currentYear

const selectedYear = ref(defaultPledgeClassYear)

const yearOptions = computed(() =>
  [-1, 0, 1, 2].map((offset) => ({
    label: String(defaultPledgeClassYear + offset),
    value: defaultPledgeClassYear + offset,
  })).sort((a, b) => b.value - a.value),
)

const enrollmentYearOptions = computed(() =>
  [0, 1, 2].map((offset) => ({
    label: String(currentYear + offset),
    value: currentYear + offset,
  })),
)

function onYearChange() {
  store.fetchProspects(selectedYear.value)
}

onMounted(() => store.fetchProspects(selectedYear.value))

// ── Label/severity maps ──────────────────────────────────────────────────────

const stageLabelMap: Record<string, string> = PIPELINE_STAGE_LABELS
const stageSeverityMap: Record<string, string> = PIPELINE_STAGE_SEVERITY
const stageDescriptionMap: Record<string, string> = PIPELINE_STAGE_DESCRIPTIONS
const classYearLabels: Record<string, string> = CLASS_YEAR_LABELS
const legacyRelationshipLabels: Record<string, string> = LEGACY_RELATIONSHIP_LABELS
const activityTypeLabels: Record<string, string> = ACTIVITY_TYPE_LABELS
const activityTypeIcons: Record<string, string> = ACTIVITY_TYPE_ICONS

// ── Filters ──────────────────────────────────────────────────────────────────

const searchQuery = ref('')
const stageFilter = ref<PipelineStage | null>(null)

const isFiltered = computed(() => searchQuery.value.trim() !== '' || stageFilter.value !== null)

const filteredProspects = computed(() => {
  let rows = store.list
  if (stageFilter.value) rows = rows.filter((p) => p.pipelineStage === stageFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    rows = rows.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q),
    )
  }
  return rows
})

const stageFilterOptions = computed(() => [
  { label: 'All stages', value: null },
  ...ALL_PIPELINE_STAGES.map((s) => ({
    label: PIPELINE_STAGE_LABELS[s],
    value: s,
  })),
])

const stageStats = computed(() => {
  const counts: Partial<Record<PipelineStage, number>> = {}
  store.list.forEach((p) => {
    counts[p.pipelineStage] = (counts[p.pipelineStage] ?? 0) + 1
  })
  return ALL_PIPELINE_STAGES.filter((s) => (counts[s] ?? 0) > 0).map((s) => ({
    stage: s,
    label: PIPELINE_STAGE_LABELS[s],
    count: counts[s]!,
  }))
})

function toggleStageFilter(stage: PipelineStage) {
  stageFilter.value = stageFilter.value === stage ? null : stage
}

function clearFilters() {
  searchQuery.value = ''
  stageFilter.value = null
}

// ── Utilities ────────────────────────────────────────────────────────────────

function daysInStage(p: RushProspectSummary): string {
  const from = p.lastStageChangedAt ?? p.createdAt
  const days = Math.floor((Date.now() - new Date(from).getTime()) / 86_400_000)
  return days === 0 ? 'Today' : `${days}d`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ── Prospect detail dialog ───────────────────────────────────────────────────

const detailVisible = ref(false)
const detailLoading = ref(false)
const currentProspect = ref<RushProspectSummary | null>(null)
const fullProspect = ref<RushProspectResponse | null>(null)
const saving = ref(false)

const editForm = ref({
  firstName: '',
  lastName: '',
  phone: '',
  classYear: null as ClassYear | null,
  enrollmentSemester: null as 'fall' | 'spring' | null,
  enrollmentYear: null as number | null,
  hometown: '',
  highSchool: '',
  major: '',
  gpaStr: '',
  actScoreStr: '',
  satScoreStr: '',
  pipelineStage: 'inquiry' as PipelineStage,
  internalRating: null as number | null,
})

async function openDetail(prospect: RushProspectSummary) {
  currentProspect.value = prospect
  detailVisible.value = true
  detailLoading.value = true
  await store.fetchOne(prospect.id)
  if (store.current) {
    fullProspect.value = store.current
    populateEditForm(store.current)
  }
  detailLoading.value = false
}

function populateEditForm(p: RushProspectResponse) {
  editForm.value = {
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone ?? '',
    classYear: p.classYear,
    enrollmentSemester: p.enrollmentSemester,
    enrollmentYear: p.enrollmentYear,
    hometown: p.hometown ?? '',
    highSchool: p.highSchool ?? '',
    major: p.major ?? '',
    gpaStr: p.gpa != null ? String(p.gpa) : '',
    actScoreStr: p.actScore != null ? String(p.actScore) : '',
    satScoreStr: p.satScore != null ? String(p.satScore) : '',
    pipelineStage: p.pipelineStage,
    internalRating: p.internalRating,
  }
}

function onDetailClose() {
  fullProspect.value = null
  currentProspect.value = null
  newNote.value = ''
}

async function saveProspect() {
  if (!fullProspect.value) return
  saving.value = true
  try {
    const ef = editForm.value
    await store.updateProspect(fullProspect.value.id, {
      firstName: ef.firstName.trim() || undefined,
      lastName: ef.lastName.trim() || undefined,
      phone: ef.phone.trim() || undefined,
      classYear: ef.classYear ?? undefined,
      enrollmentSemester: ef.enrollmentSemester ?? null,
      enrollmentYear: ef.enrollmentYear ?? null,
      hometown: ef.hometown.trim() || undefined,
      highSchool: ef.highSchool.trim() || undefined,
      major: ef.major.trim() || undefined,
      gpa: ef.gpaStr ? parseFloat(ef.gpaStr) : null,
      actScore: ef.actScoreStr ? parseInt(ef.actScoreStr, 10) : null,
      satScore: ef.satScoreStr ? parseInt(ef.satScoreStr, 10) : null,
      pipelineStage: ef.pipelineStage,
      internalRating: ef.internalRating,
    })
    fullProspect.value = store.current!
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Prospect updated', life: 3000 })
    detailVisible.value = false
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save changes', life: 4000 })
  } finally {
    saving.value = false
  }
}

// ── Activity log ─────────────────────────────────────────────────────────────

const newNote = ref('')
const newActivityType = ref<'note' | 'event_attended' | 'call_logged'>('note')
const addingActivity = ref(false)

const manualActivityTypeOptions = [
  { label: 'Note', value: 'note' },
  { label: 'Call Logged', value: 'call_logged' },
  { label: 'Event Attended', value: 'event_attended' },
]

async function logActivity() {
  if (!fullProspect.value || !newNote.value.trim()) return
  addingActivity.value = true
  try {
    await store.addActivity(fullProspect.value.id, {
      activityType: newActivityType.value,
      note: newNote.value.trim(),
    })
    fullProspect.value = store.current!
    newNote.value = ''
    newActivityType.value = 'note'
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to log activity', life: 4000 })
  } finally {
    addingActivity.value = false
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────

function confirmDelete(prospect: RushProspectSummary) {
  confirm.require({
    message: `Remove ${prospect.firstName} ${prospect.lastName} from the pipeline? This cannot be undone.`,
    header: 'Delete Prospect',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.deleteProspect(prospect.id)
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Prospect removed', life: 3000 })
        if (detailVisible.value && currentProspect.value?.id === prospect.id) {
          detailVisible.value = false
        }
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete prospect', life: 4000 })
      }
    },
  })
}

// ── Select options ───────────────────────────────────────────────────────────

const classYearOptions = [
  { label: 'Freshman', value: 'freshman' },
  { label: 'Sophomore', value: 'sophomore' },
  { label: 'Junior', value: 'junior' },
  { label: 'Senior', value: 'senior' },
  { label: 'Other', value: 'other' },
]

const semesterOptions = [
  { label: 'Fall', value: 'fall' },
  { label: 'Spring', value: 'spring' },
]

const pipelineStageOptions = ALL_PIPELINE_STAGES.map((s) => ({
  label: PIPELINE_STAGE_LABELS[s],
  description: PIPELINE_STAGE_DESCRIPTIONS[s],
  value: s,
}))
</script>
