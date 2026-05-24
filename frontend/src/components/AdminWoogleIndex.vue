<template>
  <Card class="mb-6">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-sync text-[#6F8FAF]"></i>
        <span>Woogle Knowledge Index</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-6">
        <div class="text-surface-600">
          Re-indexes all site content — newsletters (PDFs from GCS), calendar events, rush events, and member profiles — into the vector store so Woogle can answer natural-language questions about them. This is safe to run at any time; existing entries are replaced in place.
        </div>

        <Button
          label="Re-index All Content"
          icon="pi pi-sync"
          :loading="submitting"
          :disabled="submitting || status?.state === 'running'"
          @click="handleReindex"
          class="w-full md:w-auto"
        />

        <!-- Live status card -->
        <Card v-if="status">
          <template #content>
            <div class="flex flex-col gap-3">

              <!-- Running -->
              <div v-if="status.state === 'running'" class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <i class="pi pi-spin pi-spinner text-[#6F8FAF] text-2xl"></i>
                  <span class="font-bold text-lg">Indexing in progress…</span>
                </div>
                <div class="text-sm text-surface-600">
                  Started at {{ formatTime(status.startedAt) }}.
                  {{ status.indexed > 0 ? `${status.indexed} chunks indexed so far.` : 'Processing sources…' }}
                </div>
              </div>

              <!-- Done -->
              <div v-else-if="status.state === 'done'" class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <i class="pi pi-check-circle text-green-600 text-2xl"></i>
                  <span class="font-bold text-lg">Indexing complete</span>
                </div>
                <div class="text-sm text-surface-600 flex flex-col gap-1">
                  <div><i class="pi pi-file mr-2 text-[#6F8FAF]"></i>{{ status.indexed }} chunks indexed</div>
                  <div><i class="pi pi-clock mr-2 text-surface-400"></i>Completed at {{ formatTime(status.completedAt) }}</div>
                  <div v-if="status.errors > 0">
                    <i class="pi pi-exclamation-triangle mr-2 text-yellow-500"></i>{{ status.errors }} source(s) had errors — check server logs
                  </div>
                </div>
              </div>

              <!-- Error -->
              <div v-else-if="status.state === 'error'" class="flex items-center gap-2 text-red-600">
                <i class="pi pi-exclamation-triangle text-2xl"></i>
                <div>
                  <div class="font-bold">Indexing failed</div>
                  <div class="text-sm text-surface-600">All sources errored — check server logs for details.</div>
                </div>
              </div>

            </div>
          </template>
        </Card>

        <!-- Request error -->
        <Card v-if="error">
          <template #content>
            <div class="flex items-center gap-2 text-red-600">
              <i class="pi pi-exclamation-triangle text-2xl"></i>
              <div>
                <div class="font-bold">Could not start indexing</div>
                <div class="text-sm text-surface-600">{{ error }}</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import apiClient from '@/services/api'

type JobState = 'idle' | 'running' | 'done' | 'error'

interface IndexingStatus {
  state: JobState
  startedAt: string | null
  completedAt: string | null
  indexed: number
  errors: number
}

const submitting = ref(false)
const status = ref<IndexingStatus | null>(null)
const error = ref<string | null>(null)
let pollInterval: ReturnType<typeof setInterval> | null = null

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

const pollStatus = async () => {
  try {
    const { data } = await apiClient.get<IndexingStatus>('/ask/reindex/status')
    status.value = data
    if (data.state === 'done' || data.state === 'error') {
      stopPolling()
    }
  } catch {
    // non-fatal — keep polling
  }
}

const handleReindex = async () => {
  submitting.value = true
  status.value = null
  error.value = null
  stopPolling()

  try {
    await apiClient.post('/ask/reindex')
    // Start polling every 4 seconds
    pollInterval = setInterval(pollStatus, 4000)
    await pollStatus()
  } catch (err: any) {
    error.value = err?.response?.data?.message ?? err?.message ?? 'Unknown error'
  } finally {
    submitting.value = false
  }
}

const formatTime = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

onMounted(async () => {
  const { data } = await apiClient.get<IndexingStatus>('/ask/reindex/status')
  if (data.state !== 'idle') {
    status.value = data
    if (data.state === 'running') {
      pollInterval = setInterval(pollStatus, 4000)
    }
  }
})

onUnmounted(stopPolling)
</script>
