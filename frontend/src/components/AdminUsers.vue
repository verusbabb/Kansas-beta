<template>
  <div class="flex flex-col gap-6">
    <!-- Add Site Admin Section -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-users text-[#6F8FAF]"></i>
          <span>Add/Manage Site Admins</span>
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-6">
          <div class="text-surface-600">
            Add a new user with admin or editor role. Users will be able to log in after being created.
          </div>
          
          <form @submit.prevent="handleAddUser" class="flex flex-col gap-5">
            <!-- First Name and Last Name Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <!-- First Name -->
              <div class="flex flex-col gap-2">
                <label for="user-first-name" class="font-semibold text-surface-700">
                  First Name <span class="text-red-500">*</span>
                </label>
                <InputText
                  id="user-first-name"
                  v-model="userForm.firstName"
                  placeholder="John"
                  :class="{ 'p-invalid': userErrors.firstName }"
                  class="w-full"
                />
                <small v-if="userErrors.firstName" class="p-error">
                  {{ userErrors.firstName }}
                </small>
              </div>

              <!-- Last Name -->
              <div class="flex flex-col gap-2">
                <label for="user-last-name" class="font-semibold text-surface-700">
                  Last Name <span class="text-red-500">*</span>
                </label>
                <InputText
                  id="user-last-name"
                  v-model="userForm.lastName"
                  placeholder="Doe"
                  :class="{ 'p-invalid': userErrors.lastName }"
                  class="w-full"
                />
                <small v-if="userErrors.lastName" class="p-error">
                  {{ userErrors.lastName }}
                </small>
              </div>
            </div>

            <!-- Email -->
            <div class="flex flex-col gap-2">
              <label for="user-email" class="font-semibold text-surface-700">
                Email <span class="text-red-500">*</span>
              </label>
              <InputText
                id="user-email"
                v-model="userForm.email"
                type="email"
                placeholder="user@example.com"
                :class="{ 'p-invalid': userErrors.email }"
                class="w-full"
              />
              <small v-if="userErrors.email" class="p-error">
                {{ userErrors.email }}
              </small>
            </div>

            <!-- Role -->
            <div class="flex flex-col gap-2">
              <label for="user-role" class="font-semibold text-surface-700">
                Role <span class="text-red-500">*</span>
              </label>
              <Select
                id="user-role"
                v-model="userForm.role"
                :options="roleOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select role"
                :class="{ 'p-invalid': userErrors.role }"
                class="w-full"
              />
              <small v-if="userErrors.role" class="p-error">
                {{ userErrors.role }}
              </small>
            </div>

            <!-- Submit Button -->
            <div class="flex gap-3">
              <Button
                type="submit"
                label="Save"
                icon="pi pi-check"
                :loading="isSubmittingUser"
                :disabled="isSubmittingUser || !isUserFormValid"
                class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
              />
            </div>

            <!-- Success Message -->
            <Message
              v-if="userSuccess"
              severity="success"
              :closable="false"
              class="w-full"
            >
              User added successfully!
            </Message>
          </form>
        </div>
      </template>
    </Card>

    <!-- Users List Section -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-list text-[#6F8FAF]"></i>
          <span>Users with Admin or Editor Privileges ({{ userStore.activeUsers.length }})</span>
        </div>
      </template>
      <template #content>
        <div v-if="userStore.loading" class="text-center py-8">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <div class="mt-4 text-surface-600">Loading users...</div>
        </div>

        <div v-else-if="userStore.activeUsers.length === 0" class="text-center py-8">
          <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
          <div class="text-surface-600">No users yet. Add one above to get started.</div>
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
                        'px-2 py-1 text-xs font-semibold rounded',
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : user.role === 'editor'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
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
                v-tooltip.top="'Edit user'"
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

    <!-- Edit User Dialog -->
    <Dialog
      v-model:visible="editUserDialogVisible"
      modal
      header="Edit User"
      :style="{ width: '50rem' }"
      :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    >
      <form @submit.prevent="handleUpdateUser" class="flex flex-col gap-5">
        <!-- First Name and Last Name Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- First Name -->
          <div class="flex flex-col gap-2">
            <label for="edit-user-first-name" class="font-semibold text-surface-700">
              First Name <span class="text-red-500">*</span>
            </label>
            <InputText
              id="edit-user-first-name"
              v-model="editUserForm.firstName"
              placeholder="John"
              :class="{ 'p-invalid': editUserErrors.firstName }"
              class="w-full"
            />
            <small v-if="editUserErrors.firstName" class="p-error">
              {{ editUserErrors.firstName }}
            </small>
          </div>

          <!-- Last Name -->
          <div class="flex flex-col gap-2">
            <label for="edit-user-last-name" class="font-semibold text-surface-700">
              Last Name <span class="text-red-500">*</span>
            </label>
            <InputText
              id="edit-user-last-name"
              v-model="editUserForm.lastName"
              placeholder="Doe"
              :class="{ 'p-invalid': editUserErrors.lastName }"
              class="w-full"
            />
            <small v-if="editUserErrors.lastName" class="p-error">
              {{ editUserErrors.lastName }}
            </small>
          </div>
        </div>

        <!-- Email -->
        <div class="flex flex-col gap-2">
          <label for="edit-user-email" class="font-semibold text-surface-700">
            Email <span class="text-red-500">*</span>
          </label>
          <InputText
            id="edit-user-email"
            v-model="editUserForm.email"
            type="email"
            placeholder="user@example.com"
            :class="{ 'p-invalid': editUserErrors.email }"
            class="w-full"
          />
          <small v-if="editUserErrors.email" class="p-error">
            {{ editUserErrors.email }}
          </small>
        </div>

        <!-- Role -->
        <div class="flex flex-col gap-2">
          <label for="edit-user-role" class="font-semibold text-surface-700">
            Role <span class="text-red-500">*</span>
          </label>
          <Select
            id="edit-user-role"
            v-model="editUserForm.role"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select role"
            :class="{ 'p-invalid': editUserErrors.role }"
            class="w-full"
          />
          <small v-if="editUserErrors.role" class="p-error">
            {{ editUserErrors.role }}
          </small>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            outlined
            @click="editUserDialogVisible = false"
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
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Message from 'primevue/message'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useUserStore } from '@/stores/user'
import { UserRole } from '@/types/user'

const toast = useToast()
const confirm = useConfirm()
const userStore = useUserStore()

// Local UI state
const removingUserId = ref<string | null>(null)
const editingUserId = ref<string | null>(null)

// User form (for adding)
const userForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  role: UserRole.EDITOR,
})

const userErrors = ref({
  firstName: '',
  lastName: '',
  email: '',
  role: '',
})

const isSubmittingUser = ref(false)
const userSuccess = ref(false)

// Edit user dialog and form
const editUserDialogVisible = ref(false)
const editUserForm = ref({
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  role: UserRole.EDITOR,
})

const editUserErrors = ref({
  firstName: '',
  lastName: '',
  email: '',
  role: '',
})

const isUpdatingUser = ref(false)

// Role options for dropdown
const roleOptions = [
  { label: 'Admin', value: UserRole.ADMIN },
  { label: 'Editor', value: UserRole.EDITOR },
]

// Computed property to check if all required fields are filled (add form)
const isUserFormValid = computed(() => {
  const form = userForm.value
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  return (
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.email.trim() !== '' &&
    emailRegex.test(form.email) &&
    form.role !== null &&
    form.role !== undefined
  )
})

// Computed property to check if all required fields are filled (edit form)
const isEditUserFormValid = computed(() => {
  const form = editUserForm.value
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  return (
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.email.trim() !== '' &&
    emailRegex.test(form.email) &&
    form.role !== null &&
    form.role !== undefined
  )
})

// Fetch users on mount
onMounted(async () => {
  try {
    await userStore.fetchUsers()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load users',
      life: 3000,
    })
  }
})

const validateUserForm = () => {
  userErrors.value = {
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  }

  let isValid = true

  if (!userForm.value.firstName.trim()) {
    userErrors.value.firstName = 'First name is required'
    isValid = false
  }

  if (!userForm.value.lastName.trim()) {
    userErrors.value.lastName = 'Last name is required'
    isValid = false
  }

  if (!userForm.value.email.trim()) {
    userErrors.value.email = 'Email is required'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.value.email)) {
    userErrors.value.email = 'Please enter a valid email address'
    isValid = false
  }

  if (!userForm.value.role) {
    userErrors.value.role = 'Role is required'
    isValid = false
  }

  return isValid
}

const handleAddUser = async () => {
  if (!validateUserForm()) {
    return
  }

  isSubmittingUser.value = true

  try {
    await userStore.createUser({
      firstName: userForm.value.firstName.trim(),
      lastName: userForm.value.lastName.trim(),
      email: userForm.value.email.trim(),
      role: userForm.value.role,
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User added successfully!',
      life: 3000,
    })

    resetUserForm()
    userSuccess.value = true
    setTimeout(() => {
      userSuccess.value = false
    }, 5000)
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to add user'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000,
    })
    console.error('Error adding user:', error)
  } finally {
    isSubmittingUser.value = false
  }
}

const resetUserForm = () => {
  userForm.value = {
    firstName: '',
    lastName: '',
    email: '',
    role: UserRole.EDITOR,
  }
  userErrors.value = {
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  }
  userSuccess.value = false
}

const handleEditUser = (user: any) => {
  editUserForm.value = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  }
  editUserErrors.value = {
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  }
  editingUserId.value = user.id
  editUserDialogVisible.value = true
}

const validateEditUserForm = () => {
  editUserErrors.value = {
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  }

  let isValid = true

  if (!editUserForm.value.firstName.trim()) {
    editUserErrors.value.firstName = 'First name is required'
    isValid = false
  }

  if (!editUserForm.value.lastName.trim()) {
    editUserErrors.value.lastName = 'Last name is required'
    isValid = false
  }

  if (!editUserForm.value.email.trim()) {
    editUserErrors.value.email = 'Email is required'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUserForm.value.email)) {
    editUserErrors.value.email = 'Please enter a valid email address'
    isValid = false
  }

  if (!editUserForm.value.role) {
    editUserErrors.value.role = 'Role is required'
    isValid = false
  }

  return isValid
}

const handleUpdateUser = async () => {
  if (!validateEditUserForm()) {
    return
  }

  isUpdatingUser.value = true

  try {
    await userStore.updateUser(editUserForm.value.id, {
      firstName: editUserForm.value.firstName.trim(),
      lastName: editUserForm.value.lastName.trim(),
      email: editUserForm.value.email.trim(),
      role: editUserForm.value.role,
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User updated successfully!',
      life: 3000,
    })

    editUserDialogVisible.value = false
    editingUserId.value = null
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to update user'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000,
    })
    console.error('Error updating user:', error)
  } finally {
    isUpdatingUser.value = false
  }
}

const handleRemoveUser = (user: any) => {
  confirm.require({
    message: `Are you sure you want to remove ${user.firstName} ${user.lastName} (${user.email})?`,
    header: 'Remove User',
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
          detail: 'User removed successfully',
          life: 3000,
        })
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to remove user'
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 3000,
        })
        console.error('Error removing user:', error)
      } finally {
        removingUserId.value = null
      }
    },
  })
}
</script>

