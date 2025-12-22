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
  import { useConfirm } from 'primevue/useconfirm'
  import { useHealthStore } from '@/stores/health'
  import { useNewsletterStore } from '@/stores/newsletter'
  import { useToast } from 'primevue/usetoast'

  const healthStore = useHealthStore()
  const newsletterStore = useNewsletterStore()
  const toast = useToast()
  const confirm = useConfirm()
  
  const activeSection = ref('overview')
  const isCheckingHealth = ref(false)
  const healthStatus = ref(null)
  const healthError = ref(null)
  const removingNewsletterId = ref(null)

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
    }
  })

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

