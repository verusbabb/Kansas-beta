<template>
  <div class="flex flex-col gap-6">
    <!-- Header row — matches AdminAddPerson style -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-surface-900 flex items-center gap-2">
        <i class="pi pi-users text-[#6F8FAF]"></i>
        Bulk Import Members &amp; Parents
      </h2>
      <Button
        :icon="open ? 'pi pi-minus' : 'pi pi-plus'"
        :label="open ? 'Collapse' : 'Expand'"
        severity="secondary"
        outlined
        :disabled="phase === 'loading'"
        @click="toggle"
      />
    </div>

    <!-- Collapsible body -->
    <Card v-if="open">
      <template #content>
        <div class="flex flex-col gap-8">

        <!-- ── INSTRUCTIONS (hidden once import starts) ─────────────────── -->
        <template v-if="phase === 'idle'">
          <div class="flex flex-col gap-5">
            <p class="m-0 text-surface-700 text-sm leading-relaxed">
              Upload a <span class="font-semibold">.csv</span> file with one row per member.
              Each row may include optional mom and/or dad columns — the import will create the
              parent records and link them to the member automatically.
              Matching is done by <span class="font-semibold">Email</span>; existing records are
              updated, new ones are created. Member and Parent flags are
              <span class="font-semibold">additive</span> — an existing flag is never removed.
            </p>

            <!-- Member columns -->
            <div>
              <p class="m-0 mb-2 font-semibold text-surface-900 text-sm">Member columns (one per row)</p>
              <ul class="m-0 pl-5 list-disc space-y-1 text-sm text-surface-800">
                <li><span class="font-medium">First Name</span> — required</li>
                <li><span class="font-medium">Last Name</span> — required</li>
                <li><span class="font-medium">Email</span> — required; match key for upsert</li>
                <li><span class="font-medium">Pledge Class Year</span> — required; year between 1900–2100</li>
                <li><span class="font-medium">Phone</span> — optional</li>
                <li><span class="font-medium">Street Address</span>, <span class="font-medium">City</span>, <span class="font-medium">State</span>, <span class="font-medium">Zip</span> — optional; State accepts full name or 2-letter code</li>
                <li><span class="font-medium">LinkedIn</span> — optional (also: <em>LinkedIn Profile</em>, <em>LinkedIn URL</em>)</li>
              </ul>
            </div>

            <!-- Parent columns -->
            <div>
              <p class="m-0 mb-2 font-semibold text-surface-900 text-sm">Mom columns (optional — all three required together to create a mom record)</p>
              <ul class="m-0 pl-5 list-disc space-y-1 text-sm text-surface-800">
                <li><span class="font-medium">Mom First Name</span>, <span class="font-medium">Mom Last Name</span>, <span class="font-medium">Mom Email</span> — all three required to create a mom record</li>
                <li><span class="font-medium">Mom Phone</span>, <span class="font-medium">Mom Street Address</span>, <span class="font-medium">Mom City</span>, <span class="font-medium">Mom State</span>, <span class="font-medium">Mom Zip</span> — optional</li>
              </ul>
              <p class="m-0 mt-2 mb-2 font-semibold text-surface-900 text-sm">Dad columns (same pattern)</p>
              <ul class="m-0 pl-5 list-disc space-y-1 text-sm text-surface-800">
                <li><span class="font-medium">Dad First Name</span>, <span class="font-medium">Dad Last Name</span>, <span class="font-medium">Dad Email</span> — all three required to create a dad record</li>
                <li><span class="font-medium">Dad Phone</span>, <span class="font-medium">Dad Street Address</span>, <span class="font-medium">Dad City</span>, <span class="font-medium">Dad State</span>, <span class="font-medium">Dad Zip</span> — optional</li>
              </ul>
            </div>

            <!-- Template download -->
            <div class="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50/60 px-4 py-3">
              <i class="pi pi-file text-[#6F8FAF] text-lg shrink-0" aria-hidden="true" />
              <p class="m-0 text-sm text-surface-700 flex-1">
                Download a pre-formatted CSV template with the correct column headers and two example rows.
              </p>
              <Button
                type="button"
                label="Download Template"
                icon="pi pi-download"
                severity="secondary"
                outlined
                size="small"
                @click="downloadTemplate"
              />
            </div>
          </div>

          <!-- Upload controls -->
          <div class="flex flex-col gap-4">
            <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
              <div class="flex flex-col gap-1.5 min-w-0 flex-1 sm:max-w-md">
                <div>
                  <label for="family-import-file" class="font-semibold text-surface-700 text-sm">CSV File</label>
                  <p class="m-0 text-xs text-surface-500 mt-0.5">Comma-separated (.csv) files only</p>
                </div>
                <input
                  id="family-import-file"
                  type="file"
                  accept=".csv,text/csv"
                  class="text-sm text-surface-800 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#6F8FAF] file:text-white hover:file:bg-[#5A7A9F]"
                  @change="onFileChange"
                />
              </div>
              <Button
                type="button"
                label="Run import"
                icon="pi pi-upload"
                class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
                :disabled="!selectedFile"
                @click="runImport"
              />
            </div>
            <div class="flex items-center gap-2">
              <Checkbox v-model="sendInvites" inputId="family-import-invites" binary />
              <label for="family-import-invites" class="text-sm text-surface-700 cursor-pointer select-none">
                Send a login invite to all people from this import who have never logged in
              </label>
            </div>
          </div>
        </template>

        <!-- ── PROGRESS ──────────────────────────────────────────────────── -->
        <div v-else-if="phase === 'loading'" class="flex flex-col items-center gap-4 py-8">
          <ProgressSpinner style="width: 48px; height: 48px" strokeWidth="4" />
          <p class="m-0 text-surface-600 text-sm">Importing — please wait…</p>
        </div>

        <!-- ── RESULTS ───────────────────────────────────────────────────── -->
        <div v-else-if="phase === 'done' && result" class="flex flex-col gap-5">
          <!-- Summary bar -->
          <div class="flex items-start justify-between flex-wrap gap-3">
            <div class="flex flex-col gap-1">
              <p class="m-0 font-semibold text-surface-900 text-sm">Import complete</p>
              <ul class="m-0 pl-0 list-none text-sm space-y-0.5">
                <li>
                  <span class="text-green-700 font-medium">{{ result.membersAdded }}</span> member{{ result.membersAdded !== 1 ? 's' : '' }} added,
                  <span class="text-blue-700 font-medium">{{ result.membersUpdated }}</span> updated
                </li>
                <li>
                  <span class="text-green-700 font-medium">{{ result.parentsAdded }}</span> parent{{ result.parentsAdded !== 1 ? 's' : '' }} added,
                  <span class="text-blue-700 font-medium">{{ result.parentsUpdated }}</span> updated
                </li>
                <li>
                  <span class="text-indigo-700 font-medium">{{ result.relationshipsCreated }}</span> member–parent relationship{{ result.relationshipsCreated !== 1 ? 's' : '' }} created
                </li>
                <li v-if="result.invitesSent > 0">
                  <span class="text-teal-700 font-medium">{{ result.invitesSent }}</span> login invite{{ result.invitesSent !== 1 ? 's' : '' }} sent
                </li>
                <li v-if="result.skippedCount > 0">
                  <span class="text-amber-700 font-medium">{{ result.skippedCount }}</span> row{{ result.skippedCount !== 1 ? 's' : '' }} skipped
                </li>
              </ul>
            </div>
            <Button
              type="button"
              label="Clear results"
              icon="pi pi-times"
              severity="secondary"
              size="small"
              outlined
              @click="clearResults"
            />
          </div>

          <!-- Warnings -->
          <div v-if="result.warnings.length > 0" class="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
            <p class="m-0 mb-1.5 text-sm font-semibold text-amber-900">Non-fatal warnings</p>
            <ul class="m-0 pl-4 list-disc text-xs text-amber-800 space-y-0.5">
              <li v-for="(w, i) in result.warnings" :key="i">{{ w }}</li>
            </ul>
          </div>

          <!-- Skipped rows table -->
          <div v-if="result.skipped.length > 0">
            <p class="m-0 mb-2 text-sm font-semibold text-red-800">Skipped rows</p>
            <div class="overflow-x-auto rounded-lg border border-red-200">
              <table class="w-full text-xs text-surface-800 border-collapse">
                <thead class="bg-red-50 text-surface-700">
                  <tr>
                    <th class="px-3 py-2 text-left font-semibold border-b border-red-200 whitespace-nowrap">Row #</th>
                    <th class="px-3 py-2 text-left font-semibold border-b border-red-200 whitespace-nowrap">First Name</th>
                    <th class="px-3 py-2 text-left font-semibold border-b border-red-200 whitespace-nowrap">Last Name</th>
                    <th class="px-3 py-2 text-left font-semibold border-b border-red-200 whitespace-nowrap">Email</th>
                    <th class="px-3 py-2 text-left font-semibold border-b border-red-200">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, i) in result.skipped"
                    :key="i"
                    :class="i % 2 === 0 ? 'bg-white' : 'bg-red-50/30'"
                    class="border-b border-red-100 last:border-0"
                  >
                    <td class="px-3 py-2 whitespace-nowrap text-surface-500">{{ row.sourceRow }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ row.firstName || '—' }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ row.lastName || '—' }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{{ row.email || '—' }}</td>
                    <td class="px-3 py-2 text-red-800">{{ row.reason }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Bottom collapse button -->
        <div class="flex justify-end pt-2 border-t border-surface-100">
          <Button
            type="button"
            label="Collapse"
            icon="pi pi-minus"
            severity="secondary"
            size="small"
            outlined
            :disabled="phase === 'loading'"
            @click="toggle"
          />
        </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'
import { usePeopleStore } from '@/stores/people'
import type { PeopleMemberFamilyImportResponse } from '@/types/person'

const toast = useToast()
const peopleStore = usePeopleStore()

// Panel state
const open = ref(false)
function toggle() {
  if (phase.value === 'loading') return
  open.value = !open.value
}

type Phase = 'idle' | 'loading' | 'done'
const phase = ref<Phase>('idle')
const selectedFile = ref<File | null>(null)
const sendInvites = ref(false)
const result = ref<PeopleMemberFamilyImportResponse | null>(null)

function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

function clearResults() {
  phase.value = 'idle'
  result.value = null
  selectedFile.value = null
  sendInvites.value = false
  const input = document.getElementById('family-import-file') as HTMLInputElement | null
  if (input) input.value = ''
}

async function runImport() {
  const file = selectedFile.value
  if (!file) return
  phase.value = 'loading'
  result.value = null
  try {
    result.value = await peopleStore.memberFamilyImport(file, sendInvites.value)
    const r = result.value
    const total = r.membersAdded + r.membersUpdated + r.parentsAdded + r.parentsUpdated
    const severity = total > 0 ? 'success' : 'warn'
    toast.add({
      severity,
      summary: 'Import complete',
      detail: `${r.membersAdded + r.membersUpdated} member(s), ${r.parentsAdded + r.parentsUpdated} parent(s), ${r.relationshipsCreated} relationship(s)${r.skippedCount > 0 ? `, ${r.skippedCount} skipped` : ''}`,
      life: 7000,
    })
    phase.value = 'done'
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string | string[] } } }
    const raw = ax.response?.data?.message
    const detail = Array.isArray(raw) ? raw.join(', ') : raw || 'Import failed'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 7000 })
    phase.value = 'idle'
  }
}

// ── Template download ─────────────────────────────────────────────────────

function downloadTemplate() {
  const headers = [
    'First Name', 'Last Name', 'Email', 'Phone',
    'Street Address', 'City', 'State', 'Zip', 'Pledge Class Year', 'LinkedIn',
    'Mom First Name', 'Mom Last Name', 'Mom Email', 'Mom Phone',
    'Mom Street Address', 'Mom City', 'Mom State', 'Mom Zip',
    'Dad First Name', 'Dad Last Name', 'Dad Email', 'Dad Phone',
    'Dad Street Address', 'Dad City', 'Dad State', 'Dad Zip',
  ]

  const examples = [
    [
      'John', 'Smith', 'jsmith@example.com', '913-555-0101',
      '123 Main St', 'Lawrence', 'KS', '66044', '2022', 'linkedin.com/in/jsmith',
      'Linda', 'Smith', 'lsmith@example.com', '913-555-0102',
      '123 Main St', 'Lawrence', 'KS', '66044',
      'Robert', 'Smith', 'rsmith@example.com', '913-555-0103',
      '123 Main St', 'Lawrence', 'KS', '66044',
    ],
    [
      'Mike', 'Jones', 'mjones@example.com', '',
      '', '', '', '', '2023', '',
      'Carol', 'Jones', 'cjones@example.com', '785-555-0202',
      '', '', '', '',
      '', '', '', '',
      '', '', '', '',
    ],
  ]

  const esc = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n')
      ? `"${v.replace(/"/g, '""')}"`
      : v

  const lines = [
    headers.map(esc).join(','),
    ...examples.map((row) => row.map(esc).join(',')),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF' + lines], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'member-family-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>
