<template>
  <Card class="mb-6" :pt="cardPassThrough">
    <template #title>
      <button
        id="bulk-import-trigger"
        type="button"
        class="flex flex-wrap items-center justify-between gap-3 w-full text-left text-xl font-semibold leading-normal rounded-md border-0 bg-transparent p-1 -m-1 cursor-pointer text-surface-900 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F8FAF]"
        :aria-expanded="panelOpen"
        aria-controls="bulk-import-panel"
        :aria-label="panelOpen ? 'Hide Pennington bulk import' : 'Show Pennington bulk import'"
        v-tooltip.top="panelOpen ? 'Hide bulk import' : 'Show bulk import'"
        @click="panelOpen = !panelOpen"
      >
        <span class="flex items-center gap-2 min-w-0">
          <i class="pi pi-upload ml-3 text-xl text-[#6F8FAF] shrink-0" aria-hidden="true" />
          <span>Bulk import (Pennington CSV)</span>
        </span>
        <i
          :class="['pi shrink-0 text-xl text-[#6F8FAF]', panelOpen ? 'pi-minus' : 'pi-plus']"
          aria-hidden="true"
        />
      </button>
    </template>
    <template #content>
      <div
        id="bulk-import-panel"
        v-show="panelOpen"
        class="flex flex-col gap-6"
        role="region"
        aria-labelledby="bulk-import-trigger"
      >
        <div
          class="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-surface-800 leading-relaxed"
        >
          <p class="m-0 font-semibold text-amber-950">Use this importer only for the Pennington workflow</p>
          <p class="mt-2 mb-0">
            <span class="font-semibold">Pennington</span> gives you an Excel workbook
            (<span class="font-semibold">.xlsx</span>). This tool does not read Excel files directly—you must
            open that workbook in Excel (or similar), clean the sheet as needed, then use
            <span class="font-semibold">Save As</span> or <span class="font-semibold">Export</span> to produce a
            <span class="font-semibold">.csv</span> file (comma-separated) or a tab-separated
            <span class="font-semibold">.txt</span> file before uploading here.
          </p>
          <p class="mt-2 mb-0">
            Run a bulk upload <span class="font-semibold">only</span> with that cleaned file. The
            <span class="font-semibold">specific column headers</span> listed below must be present (names
            must match). Do not use this for arbitrary spreadsheets or other vendors’ formats.
          </p>
        </div>

        <div class="text-surface-700 text-sm leading-relaxed space-y-3 m-0">
          <p class="m-0">
            <span class="font-semibold text-surface-900">Required column headers</span> — the following must
            appear in the first row of your file (names must match exactly; column order does not matter):
          </p>
          <ul class="m-0 pl-5 list-disc space-y-1 text-surface-800">
            <li><span class="font-medium">Contact ID</span> — required (CRM person id; used to upsert)</li>
            <li><span class="font-medium">First Name</span> — required</li>
            <li><span class="font-medium">Last Name</span> — required</li>
            <li><span class="font-medium">Email</span> — required</li>
            <li>
              <span class="font-medium">Mailing Street</span>, <span class="font-medium">Mailing City</span>,
              <span class="font-medium">Mailing State/Province</span>, <span class="font-medium">Mailing Zip/Postal Code</span>
              — optional; include any subset. If state is present it must be a US state/DC we can normalize (name or 2-letter code).
            </li>
            <li><span class="font-medium">Constituent Code</span> — required (Alumni, Undergrad/Undergraduate, or Parent)</li>
            <li><span class="font-medium">Preferred Year</span> — required for Alumni and Undergrad; omit or leave empty for Parent</li>
            <li><span class="font-medium">Home Phone</span>, <span class="font-medium">Mobile</span> — optional</li>
          </ul>
          <p class="m-0 text-surface-600">
            <span class="font-semibold text-surface-800">Extra columns:</span> Additional columns from
            Pennington or your sheet are <span class="font-semibold">fine</span>—they are
            <span class="font-semibold">skipped</span> during import (not read, no error). They may still
            appear in a downloaded “skipped rows” report when a row is skipped for another reason.
          </p>
          <p class="m-0 text-surface-600">
            Rows that fail validation or conflict (e.g. duplicate Contact ID in the same file, email
            conflict) are skipped. Use <span class="font-semibold">Download skipped rows</span> after a run
            to see <code class="text-xs bg-surface-100 px-1 rounded">source_row</code> and
            <code class="text-xs bg-surface-100 px-1 rounded">skip_reason</code>.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          <div class="flex flex-col gap-1.5 min-w-0 flex-1 sm:max-w-md">
            <div>
              <label for="bulk-import-file" class="font-semibold text-surface-700 text-sm">File</label>
              <p class="m-0 text-xs text-surface-500 mt-0.5">CSV or tab-separated text only (not .xlsx)</p>
            </div>
            <input
              id="bulk-import-file"
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values,.txt"
              class="text-sm text-surface-800 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#6F8FAF] file:text-white hover:file:bg-[#5A7A9F]"
              :disabled="loading"
              @change="onFileChange"
            />
          </div>
          <Button
            type="button"
            label="Run import"
            icon="pi pi-upload"
            class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
            :loading="loading"
            :disabled="!selectedFile || loading"
            @click="runImport"
          />
          <Button
            v-if="skippedReport.count > 0"
            type="button"
            label="Download skipped rows"
            icon="pi pi-download"
            severity="secondary"
            outlined
            :disabled="loading || !skippedReport.content"
            v-tooltip.top="skippedRowsTooltip"
            @click="downloadSkipped"
          />
        </div>
        <p v-if="skippedReport.summary" class="text-surface-700 text-sm m-0">
          {{ skippedReport.summary }}
          <template v-if="skippedReport.count > 0">
            Use <span class="font-semibold">Download skipped rows</span> above for a
            <span class="font-semibold">.{{ skippedReport.fileFormat }}</span> file (same delimiter as your
            upload) with original columns plus
            <code class="text-xs bg-surface-100 px-1 rounded">source_row</code> and
            <code class="text-xs bg-surface-100 px-1 rounded">skip_reason</code>. Open it in Excel or Google
            Sheets like any spreadsheet export (double-click the file, or File → Open in Excel;
            Sheets: File → Import → Upload).
          </template>
        </p>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { usePeopleStore } from '@/stores/people'

const toast = useToast()
const peopleStore = usePeopleStore()

const panelOpen = ref(false)

const cardPassThrough = computed(() =>
  panelOpen.value
    ? {}
    : {
        body: { class: '!p-0' },
        content: { class: '!p-0' },
      },
)

const selectedFile = ref<File | null>(null)
const loading = ref(false)

const skippedReport = reactive({
  count: 0,
  content: '',
  summary: '',
  /** 'csv' | 'tsv' for download extension; from API when skips exist */
  fileFormat: 'csv' as 'csv' | 'tsv',
})

const skippedRowsTooltip = computed(() =>
  skippedReport.content
    ? 'Same delimiter as your upload, with source_row and skip_reason columns'
    : 'Report was empty; try importing again or check the network response',
)

function resetSkippedReport() {
  skippedReport.count = 0
  skippedReport.content = ''
  skippedReport.summary = ''
  skippedReport.fileFormat = 'csv'
}

function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const f = input.files?.[0]
  selectedFile.value = f ?? null
  resetSkippedReport()
}

async function runImport() {
  const file = selectedFile.value
  if (!file) return
  loading.value = true
  resetSkippedReport()
  try {
    const result = await peopleStore.bulkImportPeople(file)
    skippedReport.count = result.skippedCount ?? 0
    const raw = result.skippedFileContent ?? ''
    skippedReport.content = raw.length > 0 ? raw : ''
    if (result.skippedFileFormat === 'tsv' || result.skippedFileFormat === 'csv') {
      skippedReport.fileFormat = result.skippedFileFormat
    } else {
      skippedReport.fileFormat = 'csv'
    }
    skippedReport.summary = `Imported ${result.importedCount} row(s). Skipped ${result.skippedCount} row(s).`
    toast.add({
      severity: result.importedCount > 0 || result.skippedCount === 0 ? 'success' : 'warn',
      summary: 'Import finished',
      detail: skippedReport.summary,
      life: 6000,
    })
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string | string[] } } }
    const raw = ax.response?.data?.message
    const detail = Array.isArray(raw) ? raw.join(', ') : raw || 'Import failed'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 6000 })
  } finally {
    loading.value = false
  }
}

function downloadSkipped() {
  const text = skippedReport.content
  if (!text) {
    toast.add({
      severity: 'warn',
      summary: 'No skipped file',
      detail: 'The server did not return skipped row content. Check the browser Network tab for the import response.',
      life: 8000,
    })
    return
  }
  const mime =
    skippedReport.fileFormat === 'tsv'
      ? 'text/tab-separated-values;charset=utf-8'
      : 'text/csv;charset=utf-8'
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ext = skippedReport.fileFormat === 'tsv' ? 'tsv' : 'csv'
  a.download = `skipped-people-import-${new Date().toISOString().slice(0, 10)}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
