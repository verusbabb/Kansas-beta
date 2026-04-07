<template>
  <div class="flex flex-col gap-6">
    <Card class="mb-6" :pt="assignRolesCardPassThrough">
      <template #title>
        <button
          id="assign-roles-trigger"
          type="button"
          class="flex flex-wrap items-center justify-between gap-3 w-full text-left text-xl font-semibold leading-normal rounded-md border-0 bg-transparent p-1 -m-1 cursor-pointer text-surface-900 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F8FAF]"
          :aria-expanded="assignRolesFormOpen"
          aria-controls="assign-roles-panel"
          :aria-label="assignRolesFormOpen ? 'Hide add/manage user roles' : 'Show add/manage user roles'"
          v-tooltip.top="assignRolesFormOpen ? 'Hide panel' : 'Show panel'"
          @click="assignRolesFormOpen = !assignRolesFormOpen"
        >
          <span class="flex items-center gap-2 min-w-0">
            <i class="pi pi-users ml-3 text-xl text-[#6F8FAF] shrink-0" aria-hidden="true"></i>
            <span>Add/Manage User Roles</span>
          </span>
          <i
            :class="[
              'pi shrink-0 text-xl text-[#6F8FAF]',
              assignRolesFormOpen ? 'pi-minus' : 'pi-plus',
            ]"
            aria-hidden="true"
          />
        </button>
      </template>
      <template #content>
        <div
          id="assign-roles-panel"
          v-show="assignRolesFormOpen"
          class="flex flex-col gap-6"
          role="region"
          aria-labelledby="assign-roles-trigger"
        >
          <p class="text-surface-600 text-sm m-0">
            Search the chapter directory, choose someone with an email on file, then set their app role
            (Viewer, Editor, or Admin). This creates an app account if they do not have one yet, or updates
            their role if they do.
          </p>

          <div v-if="peopleStore.loading" class="text-surface-600 text-sm">Loading directory…</div>
          <template v-else>
            <div class="flex flex-col gap-2 max-w-xl">
              <label for="admin-user-role-person" class="font-semibold text-surface-700 text-sm"
                >Directory person</label
              >
              <Select
                id="admin-user-role-person"
                :model-value="selectedPersonId"
                :options="peopleSelectOptions"
                option-label="label"
                option-value="id"
                placeholder="Search by name or email…"
                filter
                filter-placeholder="Search"
                show-clear
                class="w-full"
                :disabled="assignRoleSaving"
                @update:model-value="onDirectoryPersonSelected"
              />
            </div>

            <div
              v-if="selectedPerson"
              class="flex flex-col gap-4 border-t border-surface-200 pt-4 max-w-xl"
            >
              <div class="rounded-lg border border-surface-200 bg-surface-50 p-4 flex flex-col gap-1">
                <div class="font-semibold text-surface-900">
                  {{ selectedPerson.firstName }} {{ selectedPerson.lastName }}
                </div>
                <div class="text-sm text-surface-600">{{ selectedPerson.email }}</div>
                <div v-if="linkedUserForSelected" class="text-xs text-surface-500 mt-1">
                  Existing app account · current role:
                  <span class="font-medium capitalize">{{ linkedUserForSelected.role }}</span>
                </div>
                <div v-else class="text-xs text-surface-500 mt-1">No app account yet — saving will create one.</div>
              </div>

              <div class="flex flex-col gap-2">
                <label for="admin-directory-role" class="font-semibold text-surface-700 text-sm">Role</label>
                <Select
                  id="admin-directory-role"
                  v-model="directoryRole"
                  :options="roleOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select role"
                  class="w-full"
                  :disabled="assignRoleSaving"
                />
              </div>

              <div class="flex gap-3">
                <Button
                  type="button"
                  label="Save role"
                  icon="pi pi-check"
                  class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
                  :loading="assignRoleSaving"
                  :disabled="assignRoleSaving || !canSaveDirectoryRole"
                  @click="handleSaveDirectoryRole"
                />
              </div>
            </div>
          </template>
        </div>
      </template>
    </Card>

    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-list text-[#6F8FAF]"></i>
          <span>App users and roles ({{ userStore.activeUsers.length }})</span>
        </div>
      </template>
      <template #content>
        <div v-if="userStore.loading" class="text-center py-8">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <div class="mt-4 text-surface-600">Loading users...</div>
        </div>

        <div v-else-if="userStore.activeUsers.length === 0" class="text-center py-8">
          <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
          <div class="text-surface-600">
            No app users yet. Open <strong>Add/Manage User Roles</strong> above to assign roles from the
            directory.
          </div>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="user in userStore.activeUsers"
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
                        'px-2 py-1 text-xs font-semibold rounded capitalize',
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : user.role === 'editor'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-800',
                      ]"
                    >
                      {{ user.role }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button
                v-if="!user.isProtected"
                icon="pi pi-pencil"
                severity="secondary"
                outlined
                rounded
                :disabled="editingUserId === user.id || removingUserId === user.id"
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
                :disabled="removingUserId === user.id || editingUserId === user.id"
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
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useUserStore } from '@/stores/user'
import { usePeopleStore } from '@/stores/people'
import { UserRole, type UserResponseDto } from '@/types/user'
import { registerAdminUnsaved } from '@/utils/adminUnsavedRegistry'

const toast = useToast()
const confirm = useConfirm()
const userStore = useUserStore()
const peopleStore = usePeopleStore()

const assignRolesFormOpen = ref(false)
const selectedPersonId = ref<string | null>(null)
const directoryRole = ref<UserRole>(UserRole.VIEWER)
const assignRolesBaseline = ref('')
const assignRoleSaving = ref(false)

const assignRolesCardPassThrough = computed(() =>
  assignRolesFormOpen.value
    ? {}
    : {
        body: { class: '!p-0' },
        content: { class: '!p-0' },
      },
)

const peopleSelectOptions = computed(() =>
  [...peopleStore.list]
    .filter((p) => p.email?.trim())
    .map((p) => ({
      id: p.id,
      label: `${p.firstName} ${p.lastName} · ${p.email}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
)

const selectedPerson = computed(() =>
  selectedPersonId.value ? peopleStore.list.find((p) => p.id === selectedPersonId.value) ?? null : null,
)

const linkedUserForSelected = computed(() =>
  selectedPersonId.value
    ? userStore.users.find((u) => u.personId === selectedPersonId.value) ?? null
    : null,
)

const roleOptions = [
  { label: 'Viewer', value: UserRole.VIEWER },
  { label: 'Editor', value: UserRole.EDITOR },
  { label: 'Admin', value: UserRole.ADMIN },
]

const canSaveDirectoryRole = computed(
  () => !!selectedPersonId.value && directoryRole.value != null,
)

function onDirectoryPersonSelected(id: string | null) {
  selectedPersonId.value = id
  if (!id) {
    assignRolesBaseline.value = ''
    directoryRole.value = UserRole.VIEWER
    return
  }
  const u = userStore.users.find((x) => x.personId === id)
  directoryRole.value = u?.role ?? UserRole.VIEWER
  assignRolesBaseline.value = JSON.stringify({ pid: id, role: directoryRole.value })
}

function isAssignRolesDirty(): boolean {
  if (!assignRolesFormOpen.value || !selectedPersonId.value || !assignRolesBaseline.value) return false
  try {
    const b = JSON.parse(assignRolesBaseline.value) as { pid: string; role: UserRole }
    return b.pid !== selectedPersonId.value || b.role !== directoryRole.value
  } catch {
    return true
  }
}

async function handleSaveDirectoryRole() {
  const pid = selectedPersonId.value
  if (!pid || !canSaveDirectoryRole.value) return
  assignRoleSaving.value = true
  try {
    await userStore.assignDirectoryPersonRole(pid, directoryRole.value)
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'User role was updated.',
      life: 3000,
    })
    assignRolesBaseline.value = JSON.stringify({ pid, role: directoryRole.value })
  } catch (error: unknown) {
    const ax = error as { response?: { data?: { message?: string | string[] } } }
    const raw = ax.response?.data?.message
    const detail = Array.isArray(raw) ? raw.join(', ') : raw || 'Could not save role'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    assignRoleSaving.value = false
  }
}

const removingUserId = ref<string | null>(null)
const editingUserId = ref<string | null>(null)

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

let unregisterAdminUsers: (() => void) | null = null

onMounted(async () => {
  try {
    await Promise.all([userStore.fetchUsers(), peopleStore.fetchPeople({ silent: true })])
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
    isDirty: () => isEditUserDialogDirty() || isAssignRolesDirty(),
    discard: () => {
      editUserDialogVisible.value = false
      editingUserId.value = null
      editUserSummary.value = ''
      selectedPersonId.value = null
      directoryRole.value = UserRole.VIEWER
      assignRolesBaseline.value = ''
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
