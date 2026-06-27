<template>
  <div class="flex flex-col gap-6">
    <!-- Role reference: helps admins understand what they grant when changing a role -->
    <Card>
      <template #content>
        <button
          type="button"
          class="flex items-center justify-between w-full text-left"
          @click="showRoleGuide = !showRoleGuide"
        >
          <span class="flex items-center gap-2 font-semibold text-surface-800">
            <i class="pi pi-info-circle text-[#6F8FAF]"></i>
            What can each role do?
          </span>
          <i
            :class="['pi text-surface-500', showRoleGuide ? 'pi-chevron-up' : 'pi-chevron-down']"
          ></i>
        </button>

        <div v-show="showRoleGuide" class="mt-4 flex flex-col gap-4">
          <p class="text-surface-600 text-sm m-0">{{ PUBLIC_ACCESS_SUMMARY }}</p>

          <div class="grid gap-4 md:grid-cols-3">
            <div
              v-for="role in roleGuide"
              :key="role.value"
              class="border border-surface-200 rounded-lg p-4 flex flex-col gap-2"
            >
              <span :class="['self-start px-2 py-1 text-xs font-semibold rounded capitalize', roleBadgeClass(role.value)]">
                {{ role.label }}
              </span>
              <p class="text-sm text-surface-600 m-0">{{ role.summary }}</p>

              <div>
                <div class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Can</div>
                <ul class="list-disc pl-5 text-sm text-surface-700 space-y-1 m-0">
                  <li v-for="(item, i) in role.can" :key="i">{{ item }}</li>
                </ul>
              </div>

              <div v-if="role.cannot && role.cannot.length">
                <div class="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1 mt-2">Cannot</div>
                <ul class="list-disc pl-5 text-sm text-surface-500 space-y-1 m-0">
                  <li v-for="(item, i) in role.cannot" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>

          <Message severity="warn" :closable="false" class="text-sm">{{ ADMIN_CAUTION }}</Message>
        </div>
      </template>
    </Card>

    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-users text-[#6F8FAF]"></i>
          <span>
            App users
            <span v-if="isFiltered">({{ filteredUsers.length }} of {{ userStore.activeUsers.length }})</span>
            <span v-else>({{ userStore.activeUsers.length }})</span>
          </span>
        </div>
      </template>
      <template #content>
        <p class="text-surface-600 text-sm mb-5 m-0">
          People are invited to the app from the <strong>Members</strong> page. This page manages existing
          accounts — change a user's role, resend a lost invite email, or remove app access entirely.
          Protected accounts cannot be edited or deleted.
        </p>

        <div v-if="userStore.loading" class="text-center py-8">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <div class="mt-4 text-surface-600">Loading users...</div>
        </div>

        <template v-else>
          <!-- Search + filter row -->
          <div class="flex flex-col sm:flex-row gap-3 mb-5">
            <IconField class="flex-1">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="searchQuery"
                placeholder="Search by name or email…"
                class="w-full"
              />
            </IconField>
            <Select
              v-model="roleFilter"
              :options="roleFilterOptions"
              option-label="label"
              option-value="value"
              placeholder="All roles"
              class="w-full sm:w-44"
            />
            <Button
              v-if="isFiltered"
              icon="pi pi-times"
              label="Clear"
              severity="secondary"
              outlined
              @click="clearFilters"
            />
          </div>

          <div v-if="userStore.activeUsers.length === 0" class="text-center py-8">
            <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
            <div class="text-surface-600">
              No app users yet. Go to <strong>Admin / Members</strong> to invite people from the directory.
            </div>
          </div>

          <div v-else-if="filteredUsers.length === 0" class="text-center py-8">
            <i class="pi pi-search text-4xl text-surface-400 mb-4"></i>
            <div class="text-surface-600">No users match your search.</div>
          </div>

          <div v-else class="space-y-3">
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="flex items-center justify-between p-4 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
          >
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <div>
                  <div class="font-semibold text-surface-900">
                    {{ user.firstName }} {{ user.lastName }}
                  </div>
                  <div class="text-sm text-surface-600">{{ user.email }}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      :class="[
                        'px-2 py-1 text-xs font-semibold rounded',
                        roleBadgeClass(user.role),
                      ]"
                    >
                      {{ roleLabel(user.role) }}
                    </span>
                    <span class="text-xs text-surface-500">
                      <template v-if="user.lastLoginAt">
                        Last login {{ formatRelativeDate(user.lastLoginAt) }} · {{ user.loginCount ?? 0 }} {{ (user.loginCount ?? 0) === 1 ? 'login' : 'logins' }}
                      </template>
                      <template v-else>
                        Not yet logged in
                      </template>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button
                v-if="!user.isProtected"
                icon="pi pi-send"
                severity="secondary"
                outlined
                rounded
                :loading="resendingInviteUserId === user.id"
                :disabled="resendingInviteUserId === user.id || removingUserId === user.id || editingUserId === user.id"
                @click="handleResendInvite(user)"
                v-tooltip.top="'Resend invite email'"
              />
              <Button
                v-if="!user.isProtected"
                icon="pi pi-pencil"
                severity="secondary"
                outlined
                rounded
                :disabled="editingUserId === user.id || removingUserId === user.id || resendingInviteUserId === user.id"
                @click="handleEditUser(user)"
                v-tooltip.top="'Change role'"
              />
              <Button
                v-if="!user.isProtected"
                icon="pi pi-trash"
                severity="danger"
                outlined
                rounded
                :loading="removingUserId === user.id"
                :disabled="removingUserId === user.id || editingUserId === user.id || resendingInviteUserId === user.id"
                @click="handleRemoveUser(user)"
                v-tooltip.top="'Remove user'"
              />
              <span
                v-if="user.isProtected"
                class="text-xs text-surface-500 italic"
                v-tooltip.top="'This user is protected and cannot be edited or deleted'"
              >
                Protected
              </span>
            </div>
          </div>
        </div>
        </template>
      </template>
    </Card>

    <Dialog
      :visible="editUserDialogVisible"
      modal
      header="Change role"
      :style="{ width: '28rem' }"
      :breakpoints="{ '575px': '95vw' }"
      @update:visible="onEditUserDialogVisible"
    >
      <form @submit.prevent="handleUpdateUser" class="flex flex-col gap-5">
        <p v-if="editUserSummary" class="text-surface-600 text-sm m-0">{{ editUserSummary }}</p>
        <div class="flex flex-col gap-2">
          <label for="edit-user-role" class="font-semibold text-surface-700">Role</label>
          <Select
            id="edit-user-role"
            v-model="editUserForm.role"
            :options="roleOptions"
            option-label="label"
            option-value="value"
            placeholder="Select role"
            :class="{ 'p-invalid': editUserErrors.role }"
            class="w-full"
          />
          <small v-if="selectedRoleSummary" class="text-surface-500">{{ selectedRoleSummary }}</small>
          <small v-if="editUserErrors.role" class="p-error">{{ editUserErrors.role }}</small>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            outlined
            @click="onEditUserDialogVisible(false)"
            :disabled="isUpdatingUser"
          />
          <Button
            type="submit"
            label="Update"
            icon="pi pi-check"
            :loading="isUpdatingUser"
            :disabled="isUpdatingUser || !isEditUserFormValid"
            class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
          />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useUserStore } from '@/stores/user'
import { UserRole, type UserResponseDto } from '@/types/user'
import {
  ROLE_INFO,
  ROLE_ORDER,
  ROLE_OPTIONS,
  ROLE_FILTER_OPTIONS,
  PUBLIC_ACCESS_SUMMARY,
  ADMIN_CAUTION,
} from '@/constants/roles'
import { registerAdminUnsaved } from '@/utils/adminUnsavedRegistry'

const toast = useToast()
const confirm = useConfirm()
const userStore = useUserStore()

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays} days ago`
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }
  const years = Math.floor(diffDays / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

const roleOptions = ROLE_OPTIONS
const roleFilterOptions = ROLE_FILTER_OPTIONS

const showRoleGuide = ref(false)
const roleGuide = ROLE_ORDER.map((value) => ROLE_INFO[value])

function roleLabel(role: UserRole): string {
  return ROLE_INFO[role]?.label ?? role
}

function roleBadgeClass(role: UserRole): string {
  if (role === UserRole.ADMIN) return 'bg-blue-100 text-blue-800'
  if (role === UserRole.EDITOR) return 'bg-green-100 text-green-800'
  if (role === UserRole.RUSH_CHAIR) return 'bg-amber-100 text-amber-800'
  if (role === UserRole.MEMBER) return 'bg-purple-100 text-purple-800'
  return 'bg-slate-100 text-slate-800'
}

const searchQuery = ref('')
const roleFilter = ref<UserRole | null>(null)

const isFiltered = computed(() => searchQuery.value.trim() !== '' || roleFilter.value !== null)

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return userStore.activeUsers.filter((u) => {
    const matchesRole = roleFilter.value === null || u.role === roleFilter.value
    const matchesSearch =
      !q ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    return matchesRole && matchesSearch
  })
})

function clearFilters() {
  searchQuery.value = ''
  roleFilter.value = null
}

const removingUserId = ref<string | null>(null)
const editingUserId = ref<string | null>(null)
const resendingInviteUserId = ref<string | null>(null)

const editUserDialogVisible = ref(false)
const editUserForm = ref({
  id: '',
  role: UserRole.VIEWER,
})
const editUserSummary = ref('')

const editUserErrors = ref({
  role: '',
})

const isUpdatingUser = ref(false)
const editUserBaseline = ref('')

function snapshotEditUserForm(): string {
  return JSON.stringify(editUserForm.value)
}

function isEditUserDialogDirty(): boolean {
  return editUserDialogVisible.value && snapshotEditUserForm() !== editUserBaseline.value
}

function onEditUserDialogVisible(next: boolean) {
  if (next) {
    editUserDialogVisible.value = true
    return
  }
  if (!editUserDialogVisible.value) return
  if (!isEditUserDialogDirty()) {
    editUserDialogVisible.value = false
    editingUserId.value = null
    editUserSummary.value = ''
    return
  }
  confirm.require({
    message: 'Discard unsaved role change?',
    header: 'Unsaved changes',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Keep editing',
    acceptLabel: 'Discard',
    accept: () => {
      editUserDialogVisible.value = false
      editingUserId.value = null
      editUserSummary.value = ''
    },
  })
}

const isEditUserFormValid = computed(() => editUserForm.value.role != null)

const selectedRoleSummary = computed(() =>
  editUserForm.value.role ? ROLE_INFO[editUserForm.value.role].summary : '',
)

let unregisterAdminUsers: (() => void) | null = null

onMounted(async () => {
  try {
    await userStore.fetchUsers()
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load users or directory',
      life: 3000,
    })
  }
  unregisterAdminUsers = registerAdminUnsaved({
    id: 'admin-users',
    isDirty: () => isEditUserDialogDirty(),
    discard: () => {
      editUserDialogVisible.value = false
      editingUserId.value = null
      editUserSummary.value = ''
    },
  })
})

onUnmounted(() => {
  unregisterAdminUsers?.()
})

function validateEditUserForm(): boolean {
  editUserErrors.value = { role: '' }
  if (!editUserForm.value.role) {
    editUserErrors.value.role = 'Role is required'
    return false
  }
  return true
}

const handleResendInvite = async (user: UserResponseDto) => {
  resendingInviteUserId.value = user.id
  try {
    const result = await userStore.resendInvite(user.id)
    if (result.sent) {
      toast.add({
        severity: 'success',
        summary: 'Invite sent',
        detail: `A password-set email was sent to ${user.email}.`,
        life: 4000,
      })
    } else {
      toast.add({
        severity: 'warn',
        summary: 'Email not sent',
        detail: result.reason ?? 'This user already has a login method and does not need a password reset.',
        life: 6000,
      })
    }
  } catch (error: unknown) {
    const ax = error as { response?: { data?: { message?: string | string[] } } }
    const raw = ax.response?.data?.message
    const detail = Array.isArray(raw) ? raw.join(', ') : raw || 'Failed to resend invite'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    resendingInviteUserId.value = null
  }
}

const handleEditUser = (user: UserResponseDto) => {
  editUserForm.value = {
    id: user.id,
    role: user.role,
  }
  editUserSummary.value = `${user.firstName} ${user.lastName} · ${user.email}`
  editingUserId.value = user.id
  editUserBaseline.value = snapshotEditUserForm()
  editUserDialogVisible.value = true
}

const handleUpdateUser = async () => {
  if (!validateEditUserForm()) return
  isUpdatingUser.value = true
  try {
    await userStore.updateUser(editUserForm.value.id, {
      role: editUserForm.value.role,
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Role updated.',
      life: 3000,
    })
    editUserDialogVisible.value = false
    editingUserId.value = null
    editUserSummary.value = ''
  } catch (error: unknown) {
    const ax = error as { response?: { data?: { message?: string | string[] } } }
    const raw = ax.response?.data?.message
    const detail = Array.isArray(raw) ? raw.join(', ') : raw || 'Failed to update user'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    isUpdatingUser.value = false
  }
}

const handleRemoveUser = (user: UserResponseDto) => {
  confirm.require({
    message: `Remove app access for ${user.firstName} ${user.lastName} (${user.email})?`,
    header: 'Remove user',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Remove',
    accept: async () => {
      removingUserId.value = user.id
      try {
        await userStore.deleteUser(user.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User removed.',
          life: 3000,
        })
      } catch (error: unknown) {
        const ax = error as { response?: { data?: { message?: string | string[] } } }
        const raw = ax.response?.data?.message
        const detail = Array.isArray(raw) ? raw.join(', ') : raw || 'Failed to remove user'
        toast.add({ severity: 'error', summary: 'Error', detail, life: 3000 })
      } finally {
        removingUserId.value = null
      }
    },
  })
}
</script>
