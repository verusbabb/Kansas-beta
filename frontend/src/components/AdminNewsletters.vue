<template>
  <div class="flex flex-col gap-6">
    <!-- Add Newsletter Section -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-book text-[#6F8FAF]"></i>
          <span>Add Newsletter</span>
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-6">
          <div class="text-surface-600">
            Add a new newsletter to the site. Upload a PDF file and select the season and year below.
          </div>
          
          <form @submit.prevent="handleAddNewsletter" class="flex flex-col gap-5">
            <!-- Newsletter File Upload -->
            <div class="flex flex-col gap-2">
              <label for="newsletter-file" class="font-semibold text-surface-700">
                Newsletter PDF File <span class="text-red-500">*</span>
              </label>
              <input
                id="newsletter-file"
                type="file"
                accept="application/pdf"
                @change="handleFileSelect"
                :class="{ 'p-invalid': newsletterErrors.file }"
                class="w-full p-2 border border-surface-300 rounded-md hover:border-surface-400 focus:outline-none focus:ring-2 focus:ring-[#6F8FAF] focus:border-transparent"
              />
              <small v-if="newsletterErrors.file" class="p-error">
                {{ newsletterErrors.file }}
              </small>
              <small v-if="selectedFileName" class="text-surface-600">
                Selected: {{ selectedFileName }}
              </small>
              <small class="text-surface-500">
                Upload a PDF file (max 20MB)
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
                :disabled="isSubmittingNewsletter || !isNewsletterFormValid"
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
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-list text-[#6F8FAF]"></i>
          <span>Newsletters ({{ sortedNewsletters.length }})</span>
        </div>
      </template>
      <template #content>
        <div v-if="newsletterStore.loading" class="text-center py-8">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <div class="mt-4 text-surface-600">Loading newsletters...</div>
        </div>

        <div v-else-if="sortedNewsletters.length === 0" class="text-center py-8">
          <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
          <div class="text-surface-600">No newsletters yet. Add one above to get started.</div>
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
                <span class="text-surface-700 truncate flex-1 min-w-0" :title="newsletter.filePath">
                  {{ newsletter.filePath.split('/').pop() || newsletter.filePath }}
                </span>
              </div>
              <div class="text-sm text-surface-500">
                Added {{ formatDate(newsletter.createdAt || '') }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Message from 'primevue/message'
import { useNewsletterStore } from '@/stores/newsletter'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const newsletterStore = useNewsletterStore()
const toast = useToast()
const confirm = useConfirm()

// Newsletter form
const newsletterForm = ref({
  file: null as File | null,
  season: null as string | null,
  year: null as number | null,
})

const selectedFileName = ref('')
const removingNewsletterId = ref<string | null>(null)

const newsletterErrors = ref({
  file: '',
  season: '',
  year: '',
})

const isSubmittingNewsletter = ref(false)
const newsletterSuccess = ref(false)

// Computed property to check if newsletter form is valid
const isNewsletterFormValid = computed(() => {
  return (
    newsletterForm.value.file !== null &&
    newsletterForm.value.season !== null &&
    newsletterForm.value.year !== null
  )
})

// Season options
const seasonOptions = [
  { label: 'Spring', value: 'spring' },
  { label: 'Summer', value: 'summer' },
  { label: 'Fall', value: 'fall' },
  { label: 'Winter', value: 'winter' },
]

// Year options - from 1990 to current year + 1 (for future newsletters)
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  const startYear = 1990
  const endYear = currentYear + 1
  
  for (let year = endYear; year >= startYear; year--) {
    years.push(year)
  }
  return years
})

// Get sorted newsletters from store
const sortedNewsletters = computed(() => newsletterStore.sortedNewsletters)

// Fetch newsletters on mount
onMounted(async () => {
  if (newsletterStore.newsletters.length === 0) {
    try {
      await newsletterStore.fetchNewsletters()
    } catch (error) {
      console.error('Error fetching newsletters:', error)
    }
  }
})

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] || null
  
  if (file) {
    // Validate file type
    if (file.type !== 'application/pdf') {
      newsletterErrors.value.file = 'File must be a PDF'
      newsletterForm.value.file = null
      selectedFileName.value = ''
      return
    }
    
    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024 // 20MB in bytes
    if (file.size > maxSize) {
      newsletterErrors.value.file = 'File size must be less than 20MB'
      newsletterForm.value.file = null
      selectedFileName.value = ''
      return
    }
    
    newsletterForm.value.file = file
    selectedFileName.value = file.name
    newsletterErrors.value.file = ''
  } else {
    newsletterForm.value.file = null
    selectedFileName.value = ''
  }
}

const validateNewsletterForm = () => {
  newsletterErrors.value = {
    file: '',
    season: '',
    year: '',
  }

  let isValid = true

  if (!newsletterForm.value.file) {
    newsletterErrors.value.file = 'Please select a PDF file'
    isValid = false
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

  if (!newsletterForm.value.file) {
    return
  }

  isSubmittingNewsletter.value = true

  try {
    await newsletterStore.addNewsletter(
      newsletterForm.value.file,
      newsletterForm.value.season as 'spring' | 'summer' | 'fall' | 'winter',
      newsletterForm.value.year!,
    )

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
    file: null,
    season: null,
    year: null,
  }
  selectedFileName.value = ''
  newsletterErrors.value = {
    file: '',
    season: '',
    year: '',
  }
  newsletterSuccess.value = false
  // Reset file input
  const fileInput = document.getElementById('newsletter-file') as HTMLInputElement
  if (fileInput) {
    fileInput.value = ''
  }
}

const handleRemoveNewsletter = (newsletter: any) => {
  const seasonCapitalized = (newsletter.season || '').charAt(0).toUpperCase() + (newsletter.season || '').slice(1)
  
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

const formatDate = (dateString: string) => {
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
</script>

