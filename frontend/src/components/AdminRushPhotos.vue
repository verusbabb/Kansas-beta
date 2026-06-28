<template>
  <div class="flex flex-col gap-6">
    <!-- Upload Section -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-upload text-[#6F8FAF]"></i>
          <span>Upload Rush Photo</span>
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-6">
          <div class="text-surface-600">
            Upload photos that appear in the "Life at Beta" gallery on the Rush page. JPEG, PNG, WebP, or GIF (max 10MB).
          </div>

          <form @submit.prevent="handleUpload" class="flex flex-col gap-5">
            <div class="flex flex-col gap-2">
              <label for="rush-photo-file" class="font-semibold text-surface-700">
                Photo File <span class="text-red-500">*</span>
              </label>
              <input
                id="rush-photo-file"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                @change="handleFileSelect"
                :class="{ 'p-invalid': errors.file }"
                class="w-full p-2 border border-surface-300 rounded-md hover:border-surface-400 focus:outline-none focus:ring-2 focus:ring-[#6F8FAF] focus:border-transparent"
              />
              <small v-if="errors.file" class="p-error">{{ errors.file }}</small>
              <small v-if="selectedFileName" class="text-surface-600">Selected: {{ selectedFileName }}</small>
              <small class="text-surface-500">JPEG, PNG, WebP, or GIF — max 10MB</small>
            </div>

            <div class="flex flex-col gap-2">
              <label for="rush-photo-caption" class="font-semibold text-surface-700">
                Caption <span class="text-surface-500 font-normal">(optional)</span>
              </label>
              <InputText
                id="rush-photo-caption"
                v-model="form.caption"
                placeholder="e.g. Brothers at the chapter house BBQ"
                maxlength="500"
                class="w-full"
              />
              <small class="text-surface-500">{{ form.caption?.length ?? 0 }}/500</small>
            </div>

            <div class="flex gap-3 justify-end">
              <Button
                type="button"
                label="Clear"
                icon="pi pi-times"
                severity="secondary"
                outlined
                @click="resetForm"
              />
              <Button
                type="submit"
                label="Upload Photo"
                icon="pi pi-upload"
                :loading="uploading"
                :disabled="uploading || !form.file"
                class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
              />
            </div>
          </form>
        </div>
      </template>
    </Card>

    <!-- Photos Grid -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-images text-[#6F8FAF]"></i>
            <span>Rush Photos ({{ store.sortedPhotos.length }})</span>
          </div>
          <Button
            v-if="selectedIds.length > 0"
            label="Delete Selected"
            icon="pi pi-trash"
            severity="danger"
            outlined
            :loading="deletingMany"
            :class="{ 'animate-pulse': selectedIds.length > 0 && !deletingMany }"
            @click="confirmDeleteMany"
          />
        </div>
      </template>
      <template #content>
        <div v-if="store.loading" class="text-center py-8">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <p class="mt-4 text-surface-600">Loading photos…</p>
        </div>

        <div v-else-if="store.sortedPhotos.length === 0" class="text-center py-8">
          <i class="pi pi-images text-6xl text-surface-400 mb-4"></i>
          <p class="text-surface-600">No photos yet. Upload one above.</p>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card
            v-for="photo in store.sortedPhotos"
            :key="photo.id"
            class="relative hover:shadow-lg transition-shadow"
            :class="{ 'ring-2 ring-[#6F8FAF]': selectedIds.includes(photo.id) }"
          >
            <template #content>
              <div class="flex flex-col gap-3">
                <!-- Select for deletion checkbox -->
                <div class="absolute top-2 left-2 z-10">
                  <Checkbox
                    :modelValue="selectedIds.includes(photo.id)"
                    @update:modelValue="toggleSelect(photo.id)"
                    :binary="true"
                    v-tooltip.top="'Select for deletion'"
                  />
                </div>

                <!-- Thumbnail -->
                <div class="relative w-full rush-photo-thumb bg-surface-100 rounded overflow-hidden">
                  <img
                    v-if="urlCache[photo.id]"
                    :src="urlCache[photo.id]"
                    :alt="photo.caption || 'Rush photo'"
                    class="w-full h-full object-cover"
                    @error="handleImgError(photo.id)"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-surface-400"
                  >
                    <i class="pi pi-image text-3xl"></i>
                  </div>
                </div>

                <!-- Caption + meta -->
                <div class="flex flex-col gap-1 min-w-0">
                  <div
                    v-if="editingId !== photo.id"
                    class="text-sm text-surface-700 break-words line-clamp-2"
                    :title="photo.caption"
                  >
                    {{ photo.caption || 'No caption' }}
                  </div>
                  <div v-else class="flex flex-col gap-1">
                    <InputText
                      v-model="editCaption"
                      placeholder="Caption…"
                      maxlength="500"
                      size="small"
                      class="w-full text-sm"
                    />
                    <div class="flex gap-1">
                      <Button
                        icon="pi pi-check"
                        size="small"
                        :loading="savingId === photo.id"
                        @click="saveCaption(photo.id)"
                        v-tooltip.top="'Save'"
                      />
                      <Button
                        icon="pi pi-times"
                        size="small"
                        severity="secondary"
                        outlined
                        @click="cancelEdit"
                        v-tooltip.top="'Cancel'"
                      />
                    </div>
                  </div>
                  <div class="text-xs text-surface-500">Sort: {{ photo.sortOrder }}</div>
                  <div class="text-xs text-surface-500">
                    {{ formatDate(photo.createdAt || '') }}
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2">
                  <Button
                    v-if="editingId !== photo.id"
                    icon="pi pi-pencil"
                    label="Edit"
                    size="small"
                    outlined
                    class="flex-1 text-[#6F8FAF] border-[#6F8FAF]"
                    @click="startEdit(photo)"
                  />
                  <Button
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    outlined
                    class="flex-1"
                    :loading="deletingId === photo.id"
                    @click="confirmDelete(photo)"
                  />
                </div>
              </div>
            </template>
          </Card>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useRushPhotoStore, type RushPhoto } from '@/stores/rushPhoto'

const store = useRushPhotoStore()
const confirm = useConfirm()
const toast = useToast()

// Upload form
const form = ref({ file: null as File | null, caption: '' })
const selectedFileName = ref('')
const errors = ref({ file: '' })
const uploading = ref(false)

// Grid state
const selectedIds = ref<string[]>([])
const deletingId = ref<string | null>(null)
const deletingMany = ref(false)

// Inline caption edit
const editingId = ref<string | null>(null)
const editCaption = ref('')
const savingId = ref<string | null>(null)

// Signed URL cache
const urlCache = ref<Record<string, string>>({})
const loadingUrlIds = ref<Set<string>>(new Set())

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  if (!file) { form.value.file = null; selectedFileName.value = ''; return }

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    errors.value.file = 'File must be an image (JPEG, PNG, WebP, or GIF)'
    form.value.file = null
    selectedFileName.value = ''
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    errors.value.file = 'File size must be less than 10MB'
    form.value.file = null
    selectedFileName.value = ''
    return
  }
  form.value.file = file
  selectedFileName.value = file.name
  errors.value.file = ''
}

async function handleUpload() {
  if (!form.value.file) { errors.value.file = 'Please select a photo'; return }
  uploading.value = true
  try {
    await store.upload(form.value.file, form.value.caption || undefined)
    toast.add({ severity: 'success', summary: 'Uploaded', detail: 'Photo uploaded', life: 3000 })
    resetForm()
    store.sortedPhotos.forEach((p) => loadUrl(p.id))
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.response?.data?.message || 'Failed to upload photo',
      life: 5000,
    })
  } finally {
    uploading.value = false
  }
}

function resetForm() {
  form.value = { file: null, caption: '' }
  selectedFileName.value = ''
  errors.value = { file: '' }
  const input = document.getElementById('rush-photo-file') as HTMLInputElement
  if (input) input.value = ''
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  idx > -1 ? selectedIds.value.splice(idx, 1) : selectedIds.value.push(id)
}

function startEdit(photo: RushPhoto) {
  editingId.value = photo.id
  editCaption.value = photo.caption ?? ''
}

function cancelEdit() {
  editingId.value = null
  editCaption.value = ''
}

async function saveCaption(id: string) {
  savingId.value = id
  try {
    await store.update(id, { caption: editCaption.value || undefined })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Caption updated', life: 3000 })
    editingId.value = null
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save caption', life: 5000 })
  } finally {
    savingId.value = null
  }
}

function confirmDelete(photo: RushPhoto) {
  confirm.require({
    message: `Delete this photo${photo.caption ? `: "${photo.caption}"` : ''}?`,
    header: 'Delete Photo',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      deletingId.value = photo.id
      try {
        await store.remove(photo.id)
        delete urlCache.value[photo.id]
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Photo deleted', life: 3000 })
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete', life: 5000 })
      } finally {
        deletingId.value = null
      }
    },
  })
}

function confirmDeleteMany() {
  const count = selectedIds.value.length
  confirm.require({
    message: `Delete ${count} photo${count !== 1 ? 's' : ''}?`,
    header: 'Delete Photos',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      deletingMany.value = true
      try {
        const ids = [...selectedIds.value]
        await store.removeMany(ids)
        ids.forEach((id) => delete urlCache.value[id])
        selectedIds.value = []
        toast.add({ severity: 'success', summary: 'Deleted', detail: `${count} photo(s) deleted`, life: 3000 })
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete photos', life: 5000 })
      } finally {
        deletingMany.value = false
      }
    },
  })
}

async function loadUrl(id: string) {
  if (urlCache.value[id] || loadingUrlIds.value.has(id)) return
  loadingUrlIds.value.add(id)
  try {
    urlCache.value[id] = await store.getSignedUrl(id)
  } catch {
    // leave undefined — thumbnail will show placeholder icon
  } finally {
    loadingUrlIds.value.delete(id)
  }
}

function handleImgError(id: string) {
  delete urlCache.value[id]
  setTimeout(() => loadUrl(id), 1500)
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

onMounted(async () => {
  try {
    await store.fetchAll()
    store.sortedPhotos.forEach((p) => loadUrl(p.id))
  } catch {
    // errors shown by toast via store
  }
})
</script>

<style scoped>
.rush-photo-thumb {
  aspect-ratio: 4 / 3;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
