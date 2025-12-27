<template>
  <div class="bg-surface-0 min-h-screen">
    <ConfirmDialog />
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Admin Panel</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Manage site content and configuration
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content with Side Navigation -->
    <div class="max-w-7xl mx-auto px-6 py-8">
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Side Navigation -->
        <div class="w-full lg:w-64 flex-shrink-0">
          <Card class="sticky top-4">
            <template #content>
              <nav class="flex flex-col gap-2">
                <button
                  v-for="item in navItems"
                  :key="item.id"
                  @click="activeSection = item.id"
                  :class="[
                    'flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    activeSection === item.id
                      ? 'bg-gray-200 text-[#6F8FAF] font-semibold'
                      : 'hover:bg-gray-100 text-gray-700'
                  ]"
                >
                  <i :class="item.icon" class="text-lg"></i>
                  <span>{{ item.label }}</span>
                </button>
              </nav>
            </template>
          </Card>
        </div>

        <!-- Main Content Area -->
        <div class="flex-1">
          <!-- Add Newsletter Section -->
          <Card v-if="activeSection === 'newsletter'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-book text-[#6F8FAF]"></i>
                <span>Add Newsletter</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-6">
                <p class="text-surface-600">
                  Add a new newsletter to the site. Enter the newsletter link, season, and year below.
                </p>
                
                <form @submit.prevent="handleAddNewsletter" class="flex flex-col gap-5">
                  <!-- Newsletter Link -->
                  <div class="flex flex-col gap-2">
                    <label for="newsletter-link" class="font-semibold text-surface-700">
                      Newsletter Link <span class="text-red-500">*</span>
                    </label>
                    <InputText
                      id="newsletter-link"
                      v-model="newsletterForm.link"
                      placeholder="https://example.com/newsletter.pdf"
                      :class="{ 'p-invalid': newsletterErrors.link }"
                      class="w-full"
                    />
                    <small v-if="newsletterErrors.link" class="p-error">
                      {{ newsletterErrors.link }}
                    </small>
                    <small class="text-surface-500">
                      Enter the full URL to the newsletter PDF or webpage
                    </small>
                  </div>

                  <!-- Season and Year Row -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <!-- Season -->
                    <div class="flex flex-col gap-2">
                      <label for="newsletter-season" class="font-semibold text-surface-700">
                        Season <span class="text-red-500">*</span>
                      </label>
                      <Select
                        id="newsletter-season"
                        v-model="newsletterForm.season"
                        :options="seasonOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select season"
                        :class="{ 'p-invalid': newsletterErrors.season }"
                        class="w-full"
                      />
                      <small v-if="newsletterErrors.season" class="p-error">
                        {{ newsletterErrors.season }}
                      </small>
                    </div>

                    <!-- Year -->
                    <div class="flex flex-col gap-2">
                      <label for="newsletter-year" class="font-semibold text-surface-700">
                        Year <span class="text-red-500">*</span>
                      </label>
                      <Select
                        id="newsletter-year"
                        v-model="newsletterForm.year"
                        :options="yearOptions"
                        placeholder="Select year"
                        :class="{ 'p-invalid': newsletterErrors.year }"
                        class="w-full"
                      />
                      <small v-if="newsletterErrors.year" class="p-error">
                        {{ newsletterErrors.year }}
                      </small>
                    </div>
                  </div>

                  <!-- Submit Button -->
                  <div class="flex gap-3 justify-end">
                    <Button
                      type="button"
                      label="Clear"
                      icon="pi pi-times"
                      severity="secondary"
                      outlined
                      @click="resetNewsletterForm"
                    />
                    <Button
                      type="submit"
                      label="Add Newsletter"
                      icon="pi pi-plus"
                      :loading="isSubmittingNewsletter"
                      :disabled="isSubmittingNewsletter"
                    />
                  </div>
                </form>

                <!-- Success Message -->
                <Message
                  v-if="newsletterSuccess"
                  severity="success"
                  :closable="true"
                  @close="newsletterSuccess = false"
                >
                  Newsletter added successfully!
                </Message>
              </div>
            </template>
          </Card>

          <!-- Newsletter List Section -->
          <Card v-if="activeSection === 'newsletter'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-list text-[#6F8FAF]"></i>
                <span>Newsletters ({{ sortedNewsletters.length }})</span>
              </div>
            </template>
            <template #content>
              <div v-if="newsletterStore.loading" class="text-center py-8">
                <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
                <p class="mt-4 text-surface-600">Loading newsletters...</p>
              </div>

              <div v-else-if="sortedNewsletters.length === 0" class="text-center py-8">
                <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
                <p class="text-surface-600">No newsletters yet. Add one above to get started.</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="newsletter in sortedNewsletters"
                  :key="newsletter.id"
                  class="flex items-center justify-between p-4 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-2">
                      <div class="flex-shrink-0">
                        <div class="bg-gradient-to-br from-[#5A7A9F] to-[#6F8FAF] text-white px-3 py-1 rounded text-sm font-semibold capitalize">
                          {{ newsletter.season }} {{ newsletter.year }}
                        </div>
                      </div>
                      <a
                        :href="newsletter.link"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-[#6F8FAF] hover:underline truncate flex-1 min-w-0"
                        :title="newsletter.link"
                      >
                        {{ newsletter.link }}
                      </a>
                    </div>
                    <div class="text-sm text-surface-500">
                      Added {{ formatDate(newsletter.createdAt) }}
                    </div>
                  </div>
                  <div class="flex-shrink-0 ml-4">
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      outlined
                      rounded
                      :loading="removingNewsletterId === newsletter.id"
                      @click="handleRemoveNewsletter(newsletter)"
                      v-tooltip.top="'Delete newsletter'"
                    />
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Add Member Section -->
          <Card v-if="activeSection === 'member'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-user-plus text-[#6F8FAF]"></i>
                <span>Add Member</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-4">
                <p class="text-surface-600">
                  Add a new active member to the chapter.
                </p>
                <!-- Member form will go here -->
                <div class="text-center py-8 text-surface-500">
                  Member form coming soon...
                </div>
              </div>
            </template>
          </Card>

          <!-- Add Site Admin Section -->
          <Card v-if="activeSection === 'users'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-users text-[#6F8FAF]"></i>
                <span>Add site admin</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-6">
                <p class="text-surface-600">
                  Add a new user with admin or editor role. Users will be able to log in after being created.
                </p>
                
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
          <Card v-if="activeSection === 'users'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-list text-[#6F8FAF]"></i>
                <span>Users ({{ activeUsers.length }})</span>
              </div>
            </template>
            <template #content>
              <div v-if="isLoadingUsers" class="text-center py-8">
                <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
                <p class="mt-4 text-surface-600">Loading users...</p>
              </div>

              <div v-else-if="activeUsers.length === 0" class="text-center py-8">
                <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
                <p class="text-surface-600">No users yet. Add one above to get started.</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="user in activeUsers"
                  :key="user.id"
                  class="flex items-center justify-between p-4 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
                >
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <div>
                        <p class="font-semibold text-surface-900">
                          {{ user.firstName }} {{ user.lastName }}
                        </p>
                        <p class="text-sm text-surface-600">{{ user.email }}</p>
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

          <!-- Add Alumni Section -->
          <Card v-if="activeSection === 'alumni'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-id-card text-[#6F8FAF]"></i>
                <span>Add Alumni</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-4">
                <p class="text-surface-600">
                  Add a new alumnus to the alumni directory.
                </p>
                <!-- Alumni form will go here -->
                <div class="text-center py-8 text-surface-500">
                  Alumni form coming soon...
                </div>
              </div>
            </template>
          </Card>

          <!-- Manage Rush Events Section -->
          <Card v-if="activeSection === 'rush'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar text-[#6F8FAF]"></i>
                <span>Manage Rush Events</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-4">
                <p class="text-surface-600">
                  Add, edit, or remove rush events from the rush page.
                </p>
                <!-- Rush events management will go here -->
                <div class="text-center py-8 text-surface-500">
                  Rush events management coming soon...
                </div>
              </div>
            </template>
          </Card>

          <!-- Check Database Connection Section -->
          <Card v-if="activeSection === 'health'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-database text-[#6F8FAF]"></i>
                <span>Check Database Connection</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-4">
                <p class="text-surface-600">
                  Test the connection to the backend database.
                </p>
                
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
                            <span class="font-bold text-lg">
                              Status: {{ healthStatus.status === 'ok' ? 'Connected' : 'Disconnected' }}
                            </span>
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
                            <p class="font-bold">Connection Failed</p>
                            <p class="text-sm text-surface-600">{{ healthError }}</p>
                          </div>
                        </div>
                      </template>
                    </Card>
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Site Settings Section -->
          <Card v-if="activeSection === 'settings'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-cog text-[#6F8FAF]"></i>
                <span>Site Settings</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-4">
                <p class="text-surface-600">
                  Configure general site settings and preferences.
                </p>
                <!-- Settings form will go here -->
                <div class="text-center py-8 text-surface-500">
                  Site settings coming soon...
                </div>
              </div>
            </template>
          </Card>

          <!-- Default/Overview Section -->
          <Card v-if="activeSection === 'overview'">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-home text-[#6F8FAF]"></i>
                <span>Admin Overview</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-4">
                <p class="text-surface-700 mb-4">
                  Welcome to the Admin Panel. Use the side navigation to manage different aspects of the site.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="p-4 bg-gray-50 rounded-lg">
                    <h3 class="font-bold mb-2">Quick Stats</h3>
                    <p class="text-sm text-surface-600">Statistics coming soon...</p>
                  </div>
                  <div class="p-4 bg-gray-50 rounded-lg">
                    <h3 class="font-bold mb-2">Recent Activity</h3>
                    <p class="text-sm text-surface-600">Activity log coming soon...</p>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, computed, ref, watch } from 'vue'
  import Card from 'primevue/card'
  import Button from 'primevue/button'
  import InputText from 'primevue/inputtext'
  import Select from 'primevue/select'
  import Message from 'primevue/message'
  import ConfirmDialog from 'primevue/confirmdialog'
  import Dialog from 'primevue/dialog'
  import { useConfirm } from 'primevue/useconfirm'
  import { useHealthStore } from '@/stores/health'
  import { useNewsletterStore } from '@/stores/newsletter'
  import { useToast } from 'primevue/usetoast'
  import apiClient from '@/services/api'
  import { UserRole } from '@/types/user'

  const healthStore = useHealthStore()
  const newsletterStore = useNewsletterStore()
  const toast = useToast()
  const confirm = useConfirm()
  
  const activeSection = ref('overview')
  const isCheckingHealth = ref(false)
  const healthStatus = ref(null)
  const healthError = ref(null)
  const removingNewsletterId = ref(null)

  // User management
  const users = ref([])
  const isLoadingUsers = ref(false)
  const removingUserId = ref(null)
  const editingUserId = ref(null)

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

  // Filter to show only active (non-deleted) users
  const activeUsers = computed(() => {
    return users.value
  })

  // Newsletter form
  const newsletterForm = ref({
    link: '',
    season: null,
    year: null,
  })

  const newsletterErrors = ref({
    link: '',
    season: '',
    year: '',
  })

  const isSubmittingNewsletter = ref(false)
  const newsletterSuccess = ref(false)

  // Season options
  const seasonOptions = [
    { label: 'Spring', value: 'spring' },
    { label: 'Summer', value: 'summer' },
    { label: 'Fall', value: 'fall' },
    { label: 'Winter', value: 'winter' },
  ]

  // Year options - past 5 years, current year, and 1 future year
  const yearOptions = computed(() => {
    const currentYear = new Date().getFullYear()
    const years = []
    // Past 5 years
    for (let i = 5; i >= 1; i--) {
      years.push(currentYear - i)
    }
    // Current year
    years.push(currentYear)
    // Future year
    years.push(currentYear + 1)
    return years.sort((a, b) => b - a) // Sort descending (newest first)
  })

  const validateNewsletterForm = () => {
    newsletterErrors.value = {
      link: '',
      season: '',
      year: '',
    }

    let isValid = true

    if (!newsletterForm.value.link || newsletterForm.value.link.trim() === '') {
      newsletterErrors.value.link = 'Newsletter link is required'
      isValid = false
    } else {
      // Basic URL validation
      try {
        new URL(newsletterForm.value.link)
      } catch {
        newsletterErrors.value.link = 'Please enter a valid URL'
        isValid = false
      }
    }

    if (!newsletterForm.value.season) {
      newsletterErrors.value.season = 'Season is required'
      isValid = false
    }

    if (!newsletterForm.value.year) {
      newsletterErrors.value.year = 'Year is required'
      isValid = false
    }

    return isValid
  }

  const handleAddNewsletter = async () => {
    if (!validateNewsletterForm()) {
      return
    }

    isSubmittingNewsletter.value = true

    try {
      await newsletterStore.addNewsletter({
        link: newsletterForm.value.link.trim(),
        season: newsletterForm.value.season,
        year: newsletterForm.value.year,
      })

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Newsletter added successfully!',
        life: 3000,
      })

      resetNewsletterForm()
      newsletterSuccess.value = true
      setTimeout(() => {
        newsletterSuccess.value = false
      }, 5000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add newsletter'
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 3000,
      })
      console.error('Error adding newsletter:', error)
    } finally {
      isSubmittingNewsletter.value = false
    }
  }

  const resetNewsletterForm = () => {
    newsletterForm.value = {
      link: '',
      season: null,
      year: null,
    }
    newsletterErrors.value = {
      link: '',
      season: '',
      year: '',
    }
    newsletterSuccess.value = false
  }

  // Get sorted newsletters from store
  const sortedNewsletters = computed(() => newsletterStore.sortedNewsletters)

  // Fetch newsletters when newsletter section is active
  watch(activeSection, async (newSection) => {
    if (newSection === 'newsletter' && newsletterStore.newsletters.length === 0) {
      try {
        await newsletterStore.fetchNewsletters()
      } catch (error) {
        console.error('Error fetching newsletters:', error)
      }
    } else if (newSection === 'users' && users.value.length === 0) {
      await fetchUsers()
    }
  })

  // Fetch newsletters on mount if newsletter section is active
  onMounted(async () => {
    if (activeSection.value === 'newsletter') {
      try {
        await newsletterStore.fetchNewsletters()
      } catch (error) {
        console.error('Error fetching newsletters:', error)
      }
    } else if (activeSection.value === 'users') {
      await fetchUsers()
    }
  })

  // User management functions
  const fetchUsers = async () => {
    isLoadingUsers.value = true
    try {
      const response = await apiClient.get('/users')
      users.value = response.data
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load users',
        life: 3000,
      })
    } finally {
      isLoadingUsers.value = false
    }
  }

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
      await apiClient.post('/users', {
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

      // Refresh users list
      await fetchUsers()
    } catch (error) {
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

  const handleEditUser = (user) => {
    // Populate edit form with user data
    editUserForm.value = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    }
    // Clear any previous errors
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
      await apiClient.patch(`/users/${editUserForm.value.id}`, {
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

      // Close dialog and refresh users list
      editUserDialogVisible.value = false
      editingUserId.value = null
      await fetchUsers()
    } catch (error) {
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

  const handleRemoveUser = (user) => {
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
          await apiClient.delete(`/users/${user.id}`)
          toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'User removed successfully',
            life: 3000,
          })
          // Refresh users list
          await fetchUsers()
        } catch (error) {
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

  const handleRemoveNewsletter = (newsletter) => {
    const seasonCapitalized = newsletter.season.charAt(0).toUpperCase() + newsletter.season.slice(1)
    
    confirm.require({
      message: `Are you sure you want to delete the ${seasonCapitalized} ${newsletter.year} newsletter?`,
      header: 'Delete Newsletter',
      icon: 'pi pi-exclamation-triangle',
      rejectClass: 'p-button-secondary p-button-outlined',
      rejectLabel: 'Cancel',
      acceptLabel: 'Delete',
      accept: async () => {
        removingNewsletterId.value = newsletter.id
        try {
          await newsletterStore.removeNewsletter(newsletter.id)
          toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Newsletter deleted successfully',
            life: 3000,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete newsletter'
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 3000,
          })
          console.error('Error deleting newsletter:', error)
        } finally {
          removingNewsletterId.value = null
        }
      },
    })
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return 'Invalid date'
    }
  }

  const handleHealthCheck = async () => {
    isCheckingHealth.value = true
    healthError.value = null
    healthStatus.value = null

    try {
      const status = await healthStore.checkHealth()
      healthStatus.value = status
    } catch (error) {
      healthError.value = error.message || 'Failed to connect to database'
      console.error('Health check error:', error)
    } finally {
      isCheckingHealth.value = false
    }
  }

  const formatTimestamp = (timestamp) => {
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

  const formatUptime = (seconds) => {
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

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'pi pi-home'
    },
    {
      id: 'newsletter',
      label: 'Add Newsletter',
      icon: 'pi pi-book'
    },
    {
      id: 'users',
      label: 'Add site admin',
      icon: 'pi pi-users'
    },
    {
      id: 'member',
      label: 'Add Member',
      icon: 'pi pi-user-plus'
    },
    {
      id: 'alumni',
      label: 'Add Alumni',
      icon: 'pi pi-id-card'
    },
    {
      id: 'rush',
      label: 'Manage Rush Events',
      icon: 'pi pi-calendar'
    },
    {
      id: 'health',
      label: 'Check Database Connection',
      icon: 'pi pi-database'
    },
    {
      id: 'settings',
      label: 'Site Settings',
      icon: 'pi pi-cog'
    }
  ]
</script>

<style scoped>
  /* Additional styling if needed */
</style>

