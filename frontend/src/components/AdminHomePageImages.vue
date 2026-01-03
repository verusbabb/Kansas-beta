<template>
  <div class="flex flex-col gap-6">
    <!-- Upload Section -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-image text-[#6F8FAF]"></i>
          <span>Upload Hero Image</span>
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-6">
          <div class="text-surface-600">
            Upload, delete, and select images for the home page hero carousel. Images can be JPEG, PNG, WebP, or GIF (max 10MB).
          </div>
          
          <form @submit.prevent="handleUploadImage" class="flex flex-col gap-5">
            <!-- Image File Upload -->
            <div class="flex flex-col gap-2">
              <label for="hero-image-file" class="font-semibold text-surface-700">
                Image File <span class="text-red-500">*</span>
              </label>
              <input
                id="hero-image-file"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                @change="handleFileSelect"
                :class="{ 'p-invalid': imageErrors.file }"
                class="w-full p-2 border border-surface-300 rounded-md hover:border-surface-400 focus:outline-none focus:ring-2 focus:ring-[#6F8FAF] focus:border-transparent"
              />
              <small v-if="imageErrors.file" class="p-error">
                {{ imageErrors.file }}
              </small>
              <small v-if="selectedFileName" class="text-surface-600">
                Selected: {{ selectedFileName }}
              </small>
              <small class="text-surface-500">
                Upload an image file (JPEG, PNG, WebP, or GIF, max 10MB)
              </small>
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-2">
              <label for="hero-image-description" class="font-semibold text-surface-700">
                Description (Optional)
              </label>
              <Textarea
                id="hero-image-description"
                v-model="imageForm.description"
                placeholder="Enter a description for this image..."
                :rows="3"
                :maxlength="500"
                class="w-full"
              />
              <small class="text-surface-500">
                {{ imageForm.description?.length || 0 }}/500 characters
              </small>
            </div>

            <!-- Submit Button -->
            <div class="flex gap-3 justify-end">
              <Button
                type="button"
                label="Clear"
                icon="pi pi-times"
                severity="secondary"
                outlined
                @click="resetImageForm"
              />
              <Button
                type="submit"
                label="Upload Image"
                icon="pi pi-upload"
                :loading="isUploadingImage"
                :disabled="isUploadingImage || !isImageFormValid"
              />
            </div>
          </form>

          <!-- Success Message -->
          <Message
            v-if="uploadSuccess"
            severity="success"
            :closable="true"
            @close="uploadSuccess = false"
          >
            Image uploaded successfully!
          </Message>
        </div>
      </template>
    </Card>

    <!-- Images Grid Section -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-images text-[#6F8FAF]"></i>
            <span>All Images ({{ heroImageStore.sortedImages.length }})</span>
          </div>
          <div class="flex items-center gap-3">
            <Button
              v-if="selectedImageIds.length > 0"
              label="Delete Selected"
              icon="pi pi-trash"
              severity="danger"
              outlined
              :loading="isDeleting"
              :class="{ 'animate-pulse': selectedImageIds.length > 0 && !isDeleting }"
              @click="handleDeleteSelected"
            />
            <Button
              label="Save Carousel Selection"
              icon="pi pi-save"
              :loading="isSavingCarousel"
              :disabled="isSavingCarousel"
              :class="{ 'animate-pulse': hasCarouselChanges && !isSavingCarousel }"
              @click="handleSaveCarousel"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div v-if="heroImageStore.loading" class="text-center py-8">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <div class="mt-4 text-surface-600">Loading images...</div>
        </div>

        <div v-else-if="heroImageStore.sortedImages.length === 0" class="text-center py-8">
          <i class="pi pi-image text-6xl text-surface-400 mb-4"></i>
          <div class="text-surface-600">No images yet. Upload one above to get started.</div>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card
            v-for="image in heroImageStore.sortedImages"
            :key="image.id"
            class="relative hover:shadow-lg transition-shadow"
            :class="{ 'ring-2 ring-[#6F8FAF]': localCarouselSelection[image.id] }"
          >
            <template #content>
              <div class="flex flex-col gap-3">
                <!-- Checkbox for selection -->
                <div class="absolute top-2 left-2 z-10">
                  <Checkbox
                    :modelValue="selectedImageIds.includes(image.id)"
                    @update:modelValue="toggleImageSelection(image.id)"
                    :binary="true"
                    v-tooltip.top="'Select for deletion'"
                  />
                </div>

                <!-- Checkbox for carousel -->
                <div class="absolute top-2 right-2 z-10">
                  <Checkbox
                    :modelValue="localCarouselSelection[image.id] || false"
                    @update:modelValue="toggleCarouselSelection(image.id)"
                    :binary="true"
                    v-tooltip.top="'Include in carousel'"
                  />
                </div>

                <!-- Image Thumbnail -->
                <div class="relative w-full aspect-square bg-surface-100 rounded overflow-hidden">
                  <img
                    :data-image-id="image.id"
                    :src="imageUrlCache[image.id] || '/placeholder-image.jpg'"
                    :alt="image.description || 'Hero image'"
                    class="w-full h-full object-cover"
                    @error="handleImageError($event, image.id)"
                    @load="loadImageUrl(image.id)"
                  />
                  <div
                    v-if="localCarouselSelection[image.id]"
                    class="absolute top-0 right-0 bg-[#6F8FAF] text-white text-xs px-2 py-1 rounded-bl"
                  >
                    In Carousel
                  </div>
                </div>

                <!-- Image Info -->
                <div class="flex flex-col gap-1">
                  <div v-if="image.description" class="text-sm text-surface-700 line-clamp-2">
                    {{ image.description }}
                  </div>
                  <div class="text-xs text-surface-500">
                    Uploaded {{ formatDate(image.createdAt || '') }}
                  </div>
                  <div class="text-xs text-surface-500 truncate" :title="image.uploadedBy">
                    by {{ image.uploadedBy }}
                  </div>
                </div>

                <!-- Delete Button -->
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  outlined
                  size="small"
                  :loading="deletingImageId === image.id"
                  @click="handleDeleteImage(image)"
                  class="w-full"
                />
              </div>
            </template>
          </Card>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useHeroImageStore } from '@/stores/heroImage'

const heroImageStore = useHeroImageStore()
const toast = useToast()
const confirm = useConfirm()

// Image form
const imageForm = ref({
  file: null as File | null,
  description: '',
})

const selectedFileName = ref('')
const deletingImageId = ref<string | null>(null)
const isDeleting = ref(false)
const isUploadingImage = ref(false)
const uploadSuccess = ref(false)
const isSavingCarousel = ref(false)

const imageErrors = ref({
  file: '',
})

// Selected images for deletion
const selectedImageIds = ref<string[]>([])

// Local carousel selection state (before saving)
const localCarouselSelection = ref<Record<string, boolean>>({})

// Computed property to check if image form is valid
const isImageFormValid = computed(() => {
  return imageForm.value.file !== null
})

// Computed property to check if carousel selection has changed
const hasCarouselChanges = computed(() => {
  return heroImageStore.sortedImages.some(image => {
    const localValue = localCarouselSelection.value[image.id] || false
    return localValue !== image.isInCarousel
  })
})


const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] || null
  
  if (file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      imageErrors.value.file = 'File must be an image (JPEG, PNG, WebP, or GIF)'
      imageForm.value.file = null
      selectedFileName.value = ''
      return
    }
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      imageErrors.value.file = 'File size must be less than 10MB'
      imageForm.value.file = null
      selectedFileName.value = ''
      return
    }
    
    imageForm.value.file = file
    selectedFileName.value = file.name
    imageErrors.value.file = ''
  } else {
    imageForm.value.file = null
    selectedFileName.value = ''
  }
}

const handleUploadImage = async () => {
  if (!imageForm.value.file) {
    imageErrors.value.file = 'Please select an image file'
    return
  }

  isUploadingImage.value = true

  try {
    await heroImageStore.uploadHeroImage(
      imageForm.value.file,
      imageForm.value.description?.trim() || undefined,
    )

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Image uploaded successfully!',
      life: 3000,
    })

    resetImageForm()
    uploadSuccess.value = true
    setTimeout(() => {
      uploadSuccess.value = false
    }, 5000)

    // Refresh images list
    await heroImageStore.fetchHeroImages()
    // Update local carousel selection and preload URLs
    heroImageStore.sortedImages.forEach(image => {
      localCarouselSelection.value[image.id] = image.isInCarousel
      loadImageUrl(image.id)
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to upload image'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 3000,
    })
    console.error('Error uploading image:', error)
  } finally {
    isUploadingImage.value = false
  }
}

const resetImageForm = () => {
  imageForm.value = {
    file: null,
    description: '',
  }
  selectedFileName.value = ''
  imageErrors.value = {
    file: '',
  }
  uploadSuccess.value = false
  // Reset file input
  const fileInput = document.getElementById('hero-image-file') as HTMLInputElement
  if (fileInput) {
    fileInput.value = ''
  }
}

const toggleImageSelection = (imageId: string) => {
  const index = selectedImageIds.value.indexOf(imageId)
  if (index > -1) {
    selectedImageIds.value.splice(index, 1)
  } else {
    selectedImageIds.value.push(imageId)
  }
}

const toggleCarouselSelection = (imageId: string) => {
  localCarouselSelection.value[imageId] = !localCarouselSelection.value[imageId]
}

const handleSaveCarousel = async () => {
  isSavingCarousel.value = true

  try {
    const imageIds = Object.entries(localCarouselSelection.value)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id)

    await heroImageStore.bulkUpdateCarousel(imageIds)

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Carousel selection saved successfully!',
      life: 3000,
    })

    // Refresh images to get updated carousel status
    await heroImageStore.fetchHeroImages()
    // Update local selection to match store and preload URLs
    heroImageStore.sortedImages.forEach(image => {
      localCarouselSelection.value[image.id] = image.isInCarousel
      loadImageUrl(image.id)
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to save carousel selection'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 3000,
    })
    console.error('Error saving carousel selection:', error)
  } finally {
    isSavingCarousel.value = false
  }
}

const handleDeleteImage = (image: HeroImage) => {
  confirm.require({
    message: `Are you sure you want to delete this image${image.description ? `: "${image.description}"` : ''}?`,
    header: 'Delete Image',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    accept: async () => {
      deletingImageId.value = image.id
      try {
        await heroImageStore.deleteHeroImage(image.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Image deleted successfully',
          life: 3000,
        })
        // Remove from local selection
        delete localCarouselSelection.value[image.id]
        const index = selectedImageIds.value.indexOf(image.id)
        if (index > -1) {
          selectedImageIds.value.splice(index, 1)
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete image'
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 3000,
        })
        console.error('Error deleting image:', error)
      } finally {
        deletingImageId.value = null
      }
    },
  })
}

const handleDeleteSelected = async () => {
  if (selectedImageIds.value.length === 0) {
    return
  }

  confirm.require({
    message: `Are you sure you want to delete ${selectedImageIds.value.length} image(s)?`,
    header: 'Delete Images',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    accept: async () => {
      isDeleting.value = true
      try {
        await heroImageStore.deleteManyHeroImages(selectedImageIds.value)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: `${selectedImageIds.value.length} image(s) deleted successfully`,
          life: 3000,
        })
        // Remove from local selection
        selectedImageIds.value.forEach(id => {
          delete localCarouselSelection.value[id]
        })
        selectedImageIds.value = []
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete images'
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 3000,
        })
        console.error('Error deleting images:', error)
      } finally {
        isDeleting.value = false
      }
    },
  })
}

// Image URL cache
const imageUrlCache = ref<Record<string, string>>({})
const loadingImageIds = ref<Set<string>>(new Set())

const loadImageUrl = async (imageId: string) => {
  // Skip if already cached or loading
  if (imageUrlCache.value[imageId] || loadingImageIds.value.has(imageId)) {
    return
  }

  loadingImageIds.value.add(imageId)
  try {
    const url = await heroImageStore.getSignedUrl(imageId)
    imageUrlCache.value[imageId] = url
  } catch (error) {
    console.error('Error fetching image URL:', error)
  } finally {
    loadingImageIds.value.delete(imageId)
  }
}

// Load URLs for all images on mount
onMounted(async () => {
  try {
    await heroImageStore.fetchHeroImages()
    // Initialize local carousel selection from store
    heroImageStore.sortedImages.forEach(image => {
      localCarouselSelection.value[image.id] = image.isInCarousel
      // Preload image URLs
      loadImageUrl(image.id)
    })
  } catch (error) {
    console.error('Error fetching hero images:', error)
  }
})

const handleImageError = async (event: Event, imageId: string) => {
  // Clear cache and try to reload
  delete imageUrlCache.value[imageId]
  const img = event.target as HTMLImageElement
  // Try to reload after a short delay
  setTimeout(async () => {
    await loadImageUrl(imageId)
    if (imageUrlCache.value[imageId]) {
      img.src = imageUrlCache.value[imageId]
    }
  }, 1000)
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

// Import HeroImage type
import type { HeroImage } from '@/stores/heroImage'
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
