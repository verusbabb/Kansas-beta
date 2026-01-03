<template>
  <Card class="mb-6">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-database text-[#6F8FAF]"></i>
        <span>Check Database Connection</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-4">
        <div class="text-surface-600">
          Test the connection to the backend database.
        </div>
        
        <div class="flex flex-col gap-4">
          <Button
            label="Check Connection"
            icon="pi pi-refresh"
            :loading="isCheckingHealth"
            :disabled="isCheckingHealth"
            @click="handleHealthCheck"
            class="bg-gray-500 hover:bg-gray-600 w-full md:w-auto"
          />

          <div v-if="healthStatus" class="mt-4">
            <Card>
              <template #content>
                <div class="flex flex-col gap-3">
                  <div class="flex items-center gap-2">
                    <i 
                      :class="healthStatus.status === 'ok' ? 'pi pi-check-circle text-green-600' : 'pi pi-times-circle text-red-600'"
                      class="text-2xl"
                    ></i>
                    <div class="font-bold text-lg">
                      Status: {{ healthStatus.status === 'ok' ? 'Connected' : 'Disconnected' }}
                    </div>
                  </div>
                  
                  <div v-if="healthStatus.timestamp" class="text-sm text-surface-600">
                    <i class="pi pi-clock mr-2"></i>
                    Last checked: {{ formatTimestamp(healthStatus.timestamp) }}
                  </div>
                  
                  <div v-if="healthStatus.uptime !== undefined" class="text-sm text-surface-600">
                    <i class="pi pi-server mr-2"></i>
                    Uptime: {{ formatUptime(healthStatus.uptime) }}
                  </div>
                </div>
              </template>
            </Card>
          </div>

          <div v-if="healthError" class="mt-4">
            <Card>
              <template #content>
                <div class="flex items-center gap-2 text-red-600">
                  <i class="pi pi-exclamation-triangle text-2xl"></i>
                  <div>
                    <div class="font-bold">Connection Failed</div>
                    <div class="text-sm text-surface-600">{{ healthError }}</div>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import { useHealthStore } from '@/stores/health'

const healthStore = useHealthStore()

const isCheckingHealth = ref(false)
const healthStatus = ref<any>(null)
const healthError = ref<string | null>(null)

const handleHealthCheck = async () => {
  isCheckingHealth.value = true
  healthError.value = null
  healthStatus.value = null

  try {
    const status = await healthStore.checkHealth()
    healthStatus.value = status
  } catch (error: any) {
    healthError.value = error.message || 'Failed to connect to database'
    console.error('Health check error:', error)
  } finally {
    isCheckingHealth.value = false
  }
}

const formatTimestamp = (timestamp: string) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatUptime = (seconds: number) => {
  if (seconds === undefined || seconds === null) return 'N/A'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}
</script>

