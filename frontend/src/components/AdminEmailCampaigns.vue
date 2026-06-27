<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between flex-wrap gap-3">
        <span>Email Campaigns</span>
        <Button label="New Campaign" icon="pi pi-plus" @click="openComposer()" />
      </div>
    </template>

    <template #content>
      <!-- Loading -->
      <div v-if="store.loading && store.list.length === 0" class="flex justify-center py-16">
        <ProgressSpinner style="width: 48px; height: 48px" />
      </div>

      <!-- Empty state -->
      <div v-else-if="store.list.length === 0" class="text-center py-16 text-surface-500">
        <i class="pi pi-envelope text-5xl mb-4 block text-surface-300"></i>
        <p class="mb-4">No campaigns yet.</p>
        <Button label="Create your first campaign" icon="pi pi-plus" outlined @click="openComposer()" />
      </div>

      <!-- Campaign list -->
      <DataTable v-else :value="store.list" paginator :rows="10" data-key="id" responsive-layout="scroll">
        <Column field="subject" header="Subject" sortable>
          <template #body="{ data }">
            <span class="font-medium text-surface-800">{{ data.subject }}</span>
          </template>
        </Column>

        <Column header="Audience">
          <template #body="{ data }">
            <span class="text-sm">{{ audienceLabel(data) }}</span>
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="statusLabel(data)" :severity="statusTagSeverity(data)" />
          </template>
        </Column>

        <Column field="recipientCount" header="Recipients" sortable>
          <template #body="{ data }">
            <span v-if="data.recipientCount != null">{{ data.recipientCount }}</span>
            <span v-else class="text-surface-400">—</span>
          </template>
        </Column>

        <Column field="createdByName" header="Created By" sortable>
          <template #body="{ data }">
            <span class="text-sm">{{ data.createdByName ?? '—' }}</span>
          </template>
        </Column>

        <Column field="sentAt" header="Sent" sortable>
          <template #body="{ data }">
            <span v-if="data.sentAt" class="text-sm">{{ formatDate(data.sentAt) }}</span>
            <span v-else class="text-surface-400">—</span>
          </template>
        </Column>

        <Column header="" style="width: 130px">
          <template #body="{ data }">
            <div class="flex items-center gap-1" @click.stop>
              <Button
                v-if="data.status === 'draft'"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                v-tooltip.top="'Edit draft'"
                @click="openComposer(data.id)"
              />
              <Button
                v-else
                icon="pi pi-eye"
                size="small"
                text
                severity="secondary"
                v-tooltip.top="'View'"
                @click="openComposer(data.id)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                v-tooltip.top="'Delete'"
                @click="confirmDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </template>
  </Card>

  <!-- Composer / Viewer dialog -->
  <Dialog
    v-model:visible="composerVisible"
    :header="dialogHeader"
    modal
    :style="{ width: '760px', maxWidth: '95vw' }"
    @hide="onComposerHide"
  >
    <div v-if="isReadOnly" class="flex flex-col gap-4">
      <!-- Read-only sent view -->
      <div>
        <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Subject</label>
        <p class="text-surface-800 font-medium">{{ form.subject }}</p>
      </div>
      <div>
        <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Audience</label>
        <p class="text-surface-700 text-sm">{{ store.current ? audienceLabel(store.current) : '' }}</p>
      </div>
      <div>
        <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Sent</label>
        <p class="text-surface-700 text-sm">
          {{ store.current?.sentAt ? formatDate(store.current.sentAt) : '' }}
          · {{ store.current?.recipientCount ?? 0 }} recipients
        </p>
      </div>
      <div>
        <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1 block">Message</label>
        <div class="border border-surface-200 rounded-lg p-4 email-preview" v-html="form.bodyHtml"></div>
      </div>

      <!-- Recipients + delivery/open tracking -->
      <div>
        <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2 block">
          Recipients
        </label>

        <div v-if="store.loadingRecipients" class="flex justify-center py-6">
          <ProgressSpinner style="width: 32px; height: 32px" />
        </div>

        <template v-else-if="store.recipients">
          <!-- Summary chips -->
          <div class="flex flex-wrap gap-2 mb-3">
            <Tag :value="`${store.recipients.summary.total} sent`" severity="secondary" />
            <Tag :value="`${store.recipients.summary.delivered} delivered`" severity="info" />
            <Tag :value="`${store.recipients.summary.opened} opened`" severity="success" />
            <Tag
              v-if="store.recipients.summary.bounced > 0"
              :value="`${store.recipients.summary.bounced} bounced`"
              severity="danger"
            />
            <Tag
              v-if="store.recipients.summary.dropped > 0"
              :value="`${store.recipients.summary.dropped} dropped`"
              severity="danger"
            />
            <Tag
              v-if="store.recipients.summary.spam > 0"
              :value="`${store.recipients.summary.spam} spam`"
              severity="warn"
            />
          </div>

          <p class="text-surface-400 text-xs mb-2">
            Open tracking is approximate — image-blocking clients undercount and privacy proxies can
            overcount.
          </p>

          <DataTable
            :value="store.recipients.recipients"
            paginator
            :rows="10"
            data-key="id"
            size="small"
            responsive-layout="scroll"
          >
            <Column header="Name">
              <template #body="{ data }">
                <span class="text-surface-800">{{ data.firstName }} {{ data.lastName }}</span>
              </template>
            </Column>
            <Column field="email" header="Email">
              <template #body="{ data }">
                <span class="text-surface-600 text-sm">{{ data.email }}</span>
              </template>
            </Column>
            <Column header="Status" sortable field="status">
              <template #body="{ data }">
                <Tag :value="recipientStatusLabel(data)" :severity="recipientStatusSeverity(data)" />
                <span
                  v-if="data.bounceReason"
                  class="block text-surface-400 text-xs mt-1 truncate max-w-[220px]"
                  v-tooltip.top="data.bounceReason"
                >
                  {{ data.bounceReason }}
                </span>
              </template>
            </Column>
            <Column header="Opened">
              <template #body="{ data }">
                <span v-if="data.openedAt" class="text-surface-700 text-sm">
                  {{ formatDateTime(data.openedAt) }}
                  <span v-if="data.openCount > 1" class="text-surface-400">({{ data.openCount }}×)</span>
                </span>
                <span v-else class="text-surface-300">—</span>
              </template>
            </Column>
          </DataTable>
        </template>

        <p v-else class="text-surface-400 text-sm">No recipient data available.</p>
      </div>
    </div>

    <div v-else class="flex flex-col gap-5">
      <!-- Subject -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold text-surface-700">Subject</label>
        <InputText v-model="form.subject" placeholder="e.g. You're invited to Parents Weekend" class="w-full" />
      </div>

      <!-- Audience -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-surface-700">Who should receive this?</label>
        <Select
          v-model="form.audienceType"
          :options="audienceOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />

        <!-- Class year options -->
        <div v-if="form.audienceType === 'class_years'" class="mt-2 p-3 rounded-lg bg-surface-50 border border-surface-200 flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Pledge Class Years</label>
            <MultiSelect
              v-model="form.audienceClassYears"
              :options="yearOptions"
              option-label="label"
              option-value="value"
              placeholder="Select one or more years"
              filter
              display="chip"
              class="w-full"
            />
          </div>
          <div class="flex flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <Checkbox v-model="form.audienceIncludeMembers" :binary="true" input-id="inc-members" />
              <label for="inc-members" class="text-sm text-surface-700">Members of these years</label>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox v-model="form.audienceIncludeParents" :binary="true" input-id="inc-parents" />
              <label for="inc-parents" class="text-sm text-surface-700">Parents of those members</label>
            </div>
          </div>
        </div>

        <!-- Custom individual selection -->
        <div v-if="form.audienceType === 'custom'" class="mt-2 p-3 rounded-lg bg-surface-50 border border-surface-200 flex flex-col gap-2">
          <label class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Search and add people</label>
          <AutoComplete
            v-model="selectedPeople"
            :suggestions="peopleSuggestions"
            multiple
            force-selection
            :delay="200"
            option-label="firstName"
            placeholder="Type a name or email…"
            class="w-full email-people-autocomplete"
            @complete="searchPeople"
          >
            <template #chip="{ value }">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-100 text-primary-800 text-sm">
                {{ value.firstName }} {{ value.lastName }}
              </span>
            </template>
            <template #option="{ option }">
              <div class="flex flex-col">
                <span class="text-surface-800">{{ option.firstName }} {{ option.lastName }}</span>
                <span class="text-surface-500 text-xs">
                  {{ option.personalEmail }}
                  <span v-if="personTag(option)"> · {{ personTag(option) }}</span>
                </span>
              </div>
            </template>
          </AutoComplete>
          <small class="text-surface-400">
            Only people with an email on file appear here.
            <span v-if="selectedPeople.length > 0">{{ selectedPeople.length }} selected.</span>
          </small>
        </div>

        <!-- Live recipient count -->
        <div class="mt-1 flex items-center gap-2 text-sm">
          <i class="pi pi-users text-surface-400" />
          <span v-if="previewLoading" class="text-surface-500">Counting recipients…</span>
          <span v-else class="text-surface-700">
            <span class="font-semibold">{{ recipientCount }}</span> recipient{{ recipientCount === 1 ? '' : 's' }}
          </span>
          <span v-if="!previewLoading && recipientSample.length > 0" class="text-surface-400 truncate">
            · {{ sampleNames }}
          </span>
        </div>
      </div>

      <!-- Body -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold text-surface-700">Message</label>
        <Editor v-model="form.bodyHtml" editorStyle="height: 240px">
          <template #toolbar>
            <span class="ql-formats">
              <select class="ql-header">
                <option value="1"></option>
                <option value="2"></option>
                <option value="3"></option>
                <option selected></option>
              </select>
            </span>
            <span class="ql-formats">
              <button class="ql-bold"></button>
              <button class="ql-italic"></button>
              <button class="ql-underline"></button>
              <button class="ql-strike"></button>
            </span>
            <span class="ql-formats">
              <button class="ql-list" value="ordered"></button>
              <button class="ql-list" value="bullet"></button>
              <button class="ql-indent" value="-1"></button>
              <button class="ql-indent" value="+1"></button>
            </span>
            <span class="ql-formats">
              <button class="ql-link"></button>
              <button class="ql-clean"></button>
            </span>
          </template>
        </Editor>
        <small class="text-surface-400">Your message will be wrapped in a branded Kansas Beta email template.</small>
      </div>
    </div>

    <template #footer>
      <div v-if="!isReadOnly" class="flex items-center justify-between w-full flex-wrap gap-2">
        <Button label="Preview" icon="pi pi-eye" text severity="secondary" @click="showPreview = true" />
        <div class="flex items-center gap-2">
          <Button label="Save Draft" icon="pi pi-save" outlined :loading="store.saving" @click="saveDraft()" />
          <Button label="Send" icon="pi pi-send" :loading="store.sending" @click="confirmSend" />
        </div>
      </div>
      <div v-else class="flex justify-end w-full">
        <Button label="Close" text @click="composerVisible = false" />
      </div>
    </template>
  </Dialog>

  <!-- Email preview dialog -->
  <Dialog v-model:visible="showPreview" header="Email Preview" modal :style="{ width: '680px', maxWidth: '95vw' }">
    <div class="email-preview-frame">
      <div class="email-preview-header">Beta Theta Pi — Alpha Nu</div>
      <div class="email-preview-body email-preview" v-html="form.bodyHtml || '<p class=\'text-surface-400\'>Nothing to preview yet.</p>'"></div>
      <div class="email-preview-footer">
        Beta Theta Pi, Alpha Nu Chapter · University of Kansas<br />kansasbeta.org
      </div>
    </div>
  </Dialog>

  <Toast />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import AutoComplete from 'primevue/autocomplete'
import Checkbox from 'primevue/checkbox'
import Editor from 'primevue/editor'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'
import { useEmailCampaignStore } from '@/stores/emailCampaign'
import { usePeopleStore } from '@/stores/people'
import type { PersonResponse } from '@/types/person'
import {
  AUDIENCE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_SEVERITY,
  RECIPIENT_STATUS_LABELS,
  RECIPIENT_STATUS_SEVERITY,
  type EmailAudienceType,
  type EmailCampaignSummary,
  type EmailAudiencePayload,
  type RecipientPreviewItem,
  type EmailCampaignRecipient,
} from '@/types/emailCampaign'

const store = useEmailCampaignStore()
const peopleStore = usePeopleStore()
const confirm = useConfirm()
const toast = useToast()

function statusLabel(c: EmailCampaignSummary): string {
  return STATUS_LABELS[c.status]
}
function statusTagSeverity(c: EmailCampaignSummary): string {
  return STATUS_SEVERITY[c.status]
}

const audienceOptions = (
  ['everyone', 'all_members', 'all_parents', 'class_years', 'custom'] as EmailAudienceType[]
).map((value) => ({ value, label: AUDIENCE_TYPE_LABELS[value] }))

const yearOptions = computed(() => {
  const years = new Set<number>()
  for (const p of peopleStore.list) {
    if (p.pledgeClassYear != null) years.add(p.pledgeClassYear)
  }
  return [...years].sort((a, b) => b - a).map((y) => ({ label: String(y), value: y }))
})

// ── Composer state ────────────────────────────────────────────────────────────

const composerVisible = ref(false)
const showPreview = ref(false)
const editingId = ref<string | null>(null)
const isReadOnly = ref(false)

const form = ref({
  subject: '',
  bodyHtml: '',
  audienceType: 'everyone' as EmailAudienceType,
  audienceClassYears: [] as number[],
  audienceIncludeMembers: true,
  audienceIncludeParents: false,
})

// Custom audience: selected people + autocomplete suggestions
const selectedPeople = ref<PersonResponse[]>([])
const peopleSuggestions = ref<PersonResponse[]>([])

/** People in the directory who have an email on file (eligible recipients). */
const emailablePeople = computed(() =>
  peopleStore.list.filter((p) => !!p.personalEmail && (p.isMember || p.isParent)),
)

function searchPeople(event: { query: string }) {
  const q = event.query.trim().toLowerCase()
  const selectedIds = new Set(selectedPeople.value.map((p) => p.id))
  const pool = emailablePeople.value.filter((p) => !selectedIds.has(p.id))
  if (!q) {
    peopleSuggestions.value = pool.slice(0, 25)
    return
  }
  peopleSuggestions.value = pool
    .filter((p) => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase()
      return name.includes(q) || (p.personalEmail ?? '').toLowerCase().includes(q)
    })
    .slice(0, 25)
}

function personTag(p: PersonResponse): string {
  const parts: string[] = []
  if (p.isMember) parts.push(p.pledgeClassYear ? `PC ${p.pledgeClassYear}` : 'Member')
  if (p.isParent) parts.push('Parent')
  return parts.join(', ')
}

const dialogHeader = computed(() => {
  if (isReadOnly.value) return 'Campaign Details'
  return editingId.value ? 'Edit Campaign' : 'New Campaign'
})

function resetForm() {
  form.value = {
    subject: '',
    bodyHtml: '',
    audienceType: 'everyone',
    audienceClassYears: [],
    audienceIncludeMembers: true,
    audienceIncludeParents: false,
  }
  selectedPeople.value = []
}

async function openComposer(id?: string) {
  showPreview.value = false
  if (id) {
    await store.fetchOne(id)
    const c = store.current
    if (!c) return
    editingId.value = id
    isReadOnly.value = c.status === 'sent'
    form.value = {
      subject: c.subject,
      bodyHtml: c.bodyHtml,
      audienceType: c.audienceType,
      audienceClassYears: c.audienceClassYears ?? [],
      audienceIncludeMembers: c.audienceIncludeMembers,
      audienceIncludeParents: c.audienceIncludeParents,
    }
    if (c.audienceType === 'custom' && c.audiencePersonIds?.length) {
      if (peopleStore.list.length === 0) await peopleStore.fetchPeople({ silent: true })
      const byId = new Map(peopleStore.list.map((p) => [p.id, p]))
      selectedPeople.value = c.audiencePersonIds
        .map((pid) => byId.get(pid))
        .filter((p): p is PersonResponse => !!p)
    } else {
      selectedPeople.value = []
    }
    // For sent campaigns, load the recipient snapshot + delivery/open status.
    if (c.status === 'sent') {
      store.fetchRecipients(id)
    }
  } else {
    editingId.value = null
    isReadOnly.value = false
    resetForm()
  }
  composerVisible.value = true
}

function onComposerHide() {
  editingId.value = null
  isReadOnly.value = false
  store.current = null
  store.recipients = null
}

function recipientStatusLabel(r: EmailCampaignRecipient): string {
  return RECIPIENT_STATUS_LABELS[r.status]
}
function recipientStatusSeverity(r: EmailCampaignRecipient): string {
  return RECIPIENT_STATUS_SEVERITY[r.status]
}

// ── Live recipient preview ──────────────────────────────────────────────────

const recipientCount = ref(0)
const recipientSample = ref<RecipientPreviewItem[]>([])
const previewLoading = ref(false)
let previewTimer: ReturnType<typeof setTimeout> | null = null

const sampleNames = computed(() =>
  recipientSample.value.map((r) => `${r.firstName} ${r.lastName}`).join(', '),
)

function currentAudiencePayload(): EmailAudiencePayload {
  return {
    audienceType: form.value.audienceType,
    audienceClassYears: form.value.audienceClassYears,
    audienceIncludeMembers: form.value.audienceIncludeMembers,
    audienceIncludeParents: form.value.audienceIncludeParents,
    audiencePersonIds: selectedPeople.value.map((p) => p.id),
  }
}

function audienceIsValid(): boolean {
  if (form.value.audienceType === 'class_years') {
    if (form.value.audienceClassYears.length === 0) return false
    if (!form.value.audienceIncludeMembers && !form.value.audienceIncludeParents) return false
  }
  if (form.value.audienceType === 'custom' && selectedPeople.value.length === 0) return false
  return true
}

async function refreshPreview() {
  if (isReadOnly.value) return
  if (!audienceIsValid()) {
    recipientCount.value = 0
    recipientSample.value = []
    previewLoading.value = false
    return
  }
  previewLoading.value = true
  try {
    const res = await store.previewRecipients(currentAudiencePayload())
    recipientCount.value = res.count
    recipientSample.value = res.sample
  } catch {
    recipientCount.value = 0
    recipientSample.value = []
  } finally {
    previewLoading.value = false
  }
}

watch(
  () => [
    form.value.audienceType,
    form.value.audienceClassYears,
    form.value.audienceIncludeMembers,
    form.value.audienceIncludeParents,
    selectedPeople.value,
    composerVisible.value,
  ],
  () => {
    if (!composerVisible.value || isReadOnly.value) return
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = setTimeout(refreshPreview, 300)
  },
  { deep: true },
)

// ── Validation + persistence ──────────────────────────────────────────────────

function validate(): string | null {
  if (!form.value.subject.trim()) return 'Please enter a subject.'
  if (!form.value.bodyHtml.trim()) return 'Please enter a message.'
  if (form.value.audienceType === 'class_years') {
    if (form.value.audienceClassYears.length === 0) return 'Select at least one pledge class year.'
    if (!form.value.audienceIncludeMembers && !form.value.audienceIncludeParents) {
      return 'Choose to include members, parents, or both.'
    }
  }
  if (form.value.audienceType === 'custom' && selectedPeople.value.length === 0) {
    return 'Add at least one person to the list.'
  }
  return null
}

function buildPayload() {
  return {
    subject: form.value.subject.trim(),
    bodyHtml: form.value.bodyHtml,
    audienceType: form.value.audienceType,
    audienceClassYears:
      form.value.audienceType === 'class_years' ? form.value.audienceClassYears : undefined,
    audienceIncludeMembers: form.value.audienceIncludeMembers,
    audienceIncludeParents: form.value.audienceIncludeParents,
    audiencePersonIds:
      form.value.audienceType === 'custom' ? selectedPeople.value.map((p) => p.id) : undefined,
  }
}

async function saveDraft(silent = false): Promise<string | null> {
  const err = validate()
  if (err) {
    toast.add({ severity: 'warn', summary: 'Incomplete', detail: err, life: 4000 })
    return null
  }
  try {
    if (editingId.value) {
      await store.updateCampaign(editingId.value, buildPayload())
    } else {
      const created = await store.createCampaign(buildPayload())
      editingId.value = created.id
    }
    if (!silent) {
      toast.add({ severity: 'success', summary: 'Saved', detail: 'Draft saved', life: 3000 })
      composerVisible.value = false
    }
    return editingId.value
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save draft', life: 4000 })
    return null
  }
}

function confirmSend() {
  const err = validate()
  if (err) {
    toast.add({ severity: 'warn', summary: 'Incomplete', detail: err, life: 4000 })
    return
  }
  const count = recipientCount.value
  confirm.require({
    header: 'Send this email?',
    message:
      count > 0
        ? `This will send "${form.value.subject.trim()}" to ${count} recipient${count === 1 ? '' : 's'}. This cannot be undone.`
        : `This audience currently resolves to 0 recipients. Adjust the audience before sending.`,
    icon: 'pi pi-send',
    acceptLabel: count > 0 ? 'Send Now' : 'OK',
    rejectLabel: 'Cancel',
    acceptClass: count > 0 ? '' : 'p-button-secondary',
    accept: async () => {
      if (count === 0) return
      await doSend()
    },
  })
}

async function doSend() {
  // Persist latest edits first so the send uses current content.
  // Silent so we don't show a "Draft saved" toast on top of the "Sent" toast.
  const id = await saveDraft(true)
  if (!id) return
  try {
    await store.sendCampaign(id)
    // Close on the next tick so the close isn't swallowed by the just-dismissed confirm overlay.
    composerVisible.value = false
    await nextTick()
    toast.add({ severity: 'success', summary: 'Sent', detail: 'Your email is on its way!', life: 4000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Send failed', detail: 'The email could not be sent. Please try again.', life: 5000 })
  }
}

function confirmDelete(campaign: EmailCampaignSummary) {
  confirm.require({
    header: 'Delete campaign?',
    message: `Delete "${campaign.subject}"? This cannot be undone.`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.deleteCampaign(campaign.id)
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Campaign deleted', life: 3000 })
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete campaign', life: 4000 })
      }
    },
  })
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function audienceLabel(c: {
  audienceType: EmailAudienceType
  audienceClassYears: number[] | null
  audienceIncludeMembers: boolean
  audienceIncludeParents: boolean
}): string {
  if (c.audienceType === 'class_years') {
    const years = (c.audienceClassYears ?? []).join(', ')
    const who: string[] = []
    if (c.audienceIncludeMembers) who.push('members')
    if (c.audienceIncludeParents) who.push('parents')
    return `PC ${years} (${who.join(' + ') || 'no one'})`
  }
  return AUDIENCE_TYPE_LABELS[c.audienceType]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

onMounted(() => {
  store.fetchCampaigns()
  if (peopleStore.list.length === 0) {
    peopleStore.fetchPeople({ silent: true })
  }
})
</script>

<style scoped>
.email-people-autocomplete :deep(.p-autocomplete-input-multiple) {
  width: 100%;
}

.email-preview :deep(a) {
  color: #6f8faf;
  text-decoration: underline;
}
.email-preview :deep(h1),
.email-preview :deep(h2),
.email-preview :deep(h3) {
  font-weight: 700;
  margin: 0.5em 0;
}
.email-preview :deep(ul),
.email-preview :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.email-preview-frame {
  background-color: #f4f4f5;
  padding: 24px;
  border-radius: 8px;
}
.email-preview-header {
  background-color: #6f8faf;
  color: #fff;
  font-weight: 700;
  text-align: center;
  padding: 16px;
  border-radius: 8px 8px 0 0;
}
.email-preview-body {
  background-color: #fff;
  padding: 24px;
  font-size: 16px;
  line-height: 1.6;
}
.email-preview-footer {
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  padding: 16px;
  border-radius: 0 0 8px 8px;
}
</style>
