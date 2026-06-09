<template>
  <div class="flex flex-col gap-6">

    <!-- Stat cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="flex items-center gap-4 p-5 bg-white border border-surface-200 rounded-xl shadow-sm">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 shrink-0">
          <i class="pi pi-users text-xl text-blue-500"></i>
        </div>
        <div>
          <div class="text-2xl font-bold text-surface-900">{{ totalUsers }}</div>
          <div class="text-sm text-surface-500">Total app users</div>
        </div>
      </div>

      <div class="flex items-center gap-4 p-5 bg-white border border-surface-200 rounded-xl shadow-sm">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 shrink-0">
          <i class="pi pi-sign-in text-xl text-green-500"></i>
        </div>
        <div>
          <div class="text-2xl font-bold text-surface-900">{{ loggedInUsers }}</div>
          <div class="text-sm text-surface-500">Have logged in</div>
        </div>
      </div>

      <div class="flex items-center gap-4 p-5 bg-white border border-surface-200 rounded-xl shadow-sm">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 shrink-0">
          <i class="pi pi-clock text-xl text-amber-500"></i>
        </div>
        <div>
          <div class="text-2xl font-bold text-surface-900">{{ neverLoggedIn }}</div>
          <div class="text-sm text-surface-500">Never logged in</div>
        </div>
      </div>
    </div>

    <!-- Recent logins -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-history text-[#6F8FAF]"></i>
          <span>Recent Logins</span>
        </div>
      </template>
      <template #content>
        <div v-if="userStore.loading" class="text-center py-6">
          <i class="pi pi-spin pi-spinner text-2xl text-[#6F8FAF]"></i>
        </div>

        <div v-else-if="recentLogins.length === 0" class="text-center py-6 text-surface-400">
          <i class="pi pi-inbox text-4xl mb-2 block"></i>
          No logins recorded yet.
        </div>

        <div v-else class="flex flex-col divide-y divide-surface-100">
          <div
            v-for="user in recentLogins"
            :key="user.id"
            class="flex items-center justify-between py-3"
          >
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-9 h-9 rounded-full bg-surface-100 shrink-0">
                <span class="text-sm font-semibold text-surface-600">
                  {{ initials(user) }}
                </span>
              </div>
              <div>
                <div class="font-medium text-surface-900 text-sm">
                  {{ user.firstName }} {{ user.lastName }}
                </div>
                <div class="text-xs text-surface-500">{{ user.email }}</div>
              </div>
            </div>
            <div class="text-right shrink-0 ml-4">
              <div class="text-xs text-surface-700 font-medium">
                {{ formatRelative(user.lastLoginAt!) }}
              </div>
              <div class="text-xs text-surface-400">
                {{ user.loginCount }} {{ user.loginCount === 1 ? 'login' : 'logins' }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Card from 'primevue/card'
import { useUserStore } from '@/stores/user'
import type { UserResponseDto } from '@/types/user'

const userStore = useUserStore()

onMounted(() => {
  if (userStore.users.length === 0) {
    userStore.fetchUsers()
  }
})

const totalUsers = computed(() => userStore.users.length)

const loggedInUsers = computed(
  () => userStore.users.filter((u) => u.lastLoginAt).length,
)

const neverLoggedIn = computed(
  () => userStore.users.filter((u) => !u.lastLoginAt).length,
)

const recentLogins = computed<UserResponseDto[]>(() =>
  [...userStore.users]
    .filter((u) => u.lastLoginAt)
    .sort((a, b) => new Date(b.lastLoginAt!).getTime() - new Date(a.lastLoginAt!).getTime())
    .slice(0, 8),
)

function initials(user: UserResponseDto): string {
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>
