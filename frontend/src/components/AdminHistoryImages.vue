<template>
  <div class="flex flex-col gap-6">
    <!-- Upload Section -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-upload text-[#6F8FAF]"></i>
          <span>Upload History Image</span>
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-6">
          <div class="text-surface-600">
            Upload photos that appear in the gallery on the History page. These images bring chapter history to life — the mansion, artifacts, and traditions. JPEG, PNG, WebP, or GIF (max 10MB).
          </div>

          <form @submit.prevent="handleUpload" class="flex flex-col gap-5">
            <div class="flex flex-col gap-2">
              <label for="history-img-file" class="font-semibold text-surface-700">
                Image File <span class="text-red-500">*</span>
              </label>
              <input
                id="history-img-file"
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
              <label for="history-img-caption" class="font-semibold text-surface-700">
                Caption <span class="text-surface-500 font-normal">(optional)</span>
              </label>
              <InputText
                id="history-img-caption"
                v-model="form.caption"
                placeholder="The Usher Mansion front entrance, circa 1920"
                maxlength="500"
                class="w-full"
              />
              <small class="text-surface-500">{{ form.caption?.length ?? 0 }}/500</small>
            </div>

            <div class="flex flex-col gap-2">
              <label for="history-img-alt" class="font-semibold text-surface-700">
                Alt Text <span class="text-surface-500 font-normal">(optional — for accessibility)</span>
              </label>
              <InputText
                id="history-img-alt"
                v-model="form.altText"
                placeholder="Black and white photo of the chapter house"
                maxlength="255"
                class="w-full"
              />
              <small class="text-surface-500">{{ form.altText?.length ?? 0 }}/255</small>
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
                label="Upload Image"
                icon="pi pi-cloud-upload"
                :loading="uploading"
                :disabled="!selectedFile"
              />
            </div>
          </form>
        </div>
      </template>
    </Card>

    <!-- Current Images -->
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-images text-[#6F8FAF]"></i>
            <span>History Page Images</span>
          </div>
          <Button
            v-if="selected.length > 0"
            label="Delete Selected"
            icon="pi pi-trash"
            severity="danger"
            outlined
            size="small"
            @click="confirmDeleteMany"
          />
        </div>
      </template>
      <template #content>
        <div v-if="store.loading" class="flex justify-center py-12">
          <ProgressSpinner />
        </div>

        <div v-else-if="store.images.length === 0" class="text-surface-500 text-center py-12">
          <i class="pi pi-images text-4xl mb-3 block opacity-30"></i>
          No images uploaded yet. Add the first one above.
        </div>

        <div v-else class="flex flex-col gap-4">
          <div class="text-surface-500 text-sm">
            {{ store.images.length }} image{{ store.images.length !== 1 ? 's' : '' }} — drag to reorder is not yet supported; use the Sort Order field to control display order.
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="img in store.images"
              :key="img.id"
              class="border border-surface-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
              :class="{ 'ring-2 ring-[#6F8FAF]': selected.includes(img.id) }"
            >
              <!-- Image preview -->
              <div class="relative aspect-[4/3] bg-surface-100 cursor-pointer" @click="toggleSelect(img.id)">
                <img
                  v-if="signedUrls[img.id]"
                  :src="signedUrls[img.id]"
                  :alt="img.altText || img.caption || 'History image'"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <Button
                    icon="pi pi-eye"
                    label="Load preview"
                    severity="secondary"
                    text
                    size="small"
                    @click.stop="loadSignedUrl(img.id)"
                  />
                </div>
                <div
                  v-if="selected.includes(img.id)"
                  class="absolute inset-0 bg-[#6F8FAF]/20 flex items-center justify-center"
                >
                  <i class="pi pi-check-circle text-white text-3xl drop-shadow"></i>
                </div>
              </div>

              <!-- Info + actions -->
              <div class="p-3 flex flex-col gap-2">
                <div v-if="editingId !== img.id" class="flex flex-col gap-1">
                  <p v-if="img.caption" class="text-sm font-medium text-surface-700 truncate">{{ img.caption }}</p>
                  <p v-if="img.altText" class="text-xs text-surface-500 truncate italic">{{ img.altText }}</p>
                  <p class="text-xs text-surface-400">Sort: {{ img.sortOrder }}</p>
                </div>

                <!-- Inline edit form -->
                <div v-else class="flex flex-col gap-2">
                  <InputText v-model="editForm.caption" placeholder="Caption" maxlength="500" class="w-full text-sm" />
                  <InputText v-model="editForm.altText" placeholder="Alt text" maxlength="255" class="w-full text-sm" />
                  <InputNumber v-model="editForm.sortOrder" :min="0" placeholder="Sort order" class="w-full" inputClass="text-sm" />
                </div>

                <div class="flex gap-2 justify-end">
                  <template v-if="editingId !== img.id">
                    <Button icon="pi pi-pencil" severity="secondary" text size="small" @click="startEdit(img)" />
                    <Button icon="pi pi-trash" severity="danger" text size="small" @click="confirmDelete(img.id)" />
                  </template>
                  <template v-else>
                    <Button icon="pi pi-times" label="Cancel" severity="secondary" text size="small" @click="cancelEdit" />
                    <Button icon="pi pi-check" label="Save" size="small" :loading="saving" @click="saveEdit(img.id)" />
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import { useHistoryImageStore } from '@/stores/historyImage'

const store = useHistoryImageStore()
const toast = useToast()
const confirm = useConfirm()

const selectedFile = ref<File | null>(null)
const selectedFileName = ref('')
const uploading = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)
const selected = ref<string[]>([])
const signedUrls = ref<Record<string, string>>({})

const form = ref({ caption: '', altText: '' })
const editForm = ref({ caption: '', altText: '', sortOrder: 0 })
const errors = ref({ file: '' })

onMounted(() => {
  store.fetchAll()
})

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0]
    selectedFileName.value = input.files[0].name
    errors.value.file = ''
  }
}

function resetForm() {
  selectedFile.value = null
  selectedFileName.value = ''
  form.value = { caption: '', altText: '' }
  errors.value = { file: '' }
  const fileInput = document.getElementById('history-img-file') as HTMLInputElement
  if (fileInput) fileInput.value = ''
}

async function handleUpload() {
  if (!selectedFile.value) {
    errors.value.file = 'Please select an image file'
    return
  }
  uploading.value = true
  try {
    await store.upload(
      selectedFile.value,
      form.value.caption || undefined,
      form.value.altText || undefined,
    )
    toast.add({ severity: 'success', summary: 'Uploaded', detail: 'Image uploaded successfully', life: 3000 })
    resetForm()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Upload Failed', detail: 'Could not upload image. Please try again.', life: 5000 })
  } finally {
    uploading.value = false
  }
}

async function loadSignedUrl(id: string) {
  try {
    signedUrls.value[id] = await store.getSignedUrl(id)
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load image preview', life: 3000 })
  }
}

function toggleSelect(id: string) {
  const idx = selected.value.indexOf(id)
  if (idx === -1) selected.value.push(id)
  else selected.value.splice(idx, 1)
}

function startEdit(img: { id: string; caption?: string; altText?: string; sortOrder: number }) {
  editingId.value = img.id
  editForm.value = {
    caption: img.caption ?? '',
    altText: img.altText ?? '',
    sortOrder: img.sortOrder,
  }
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id: string) {
  saving.value = true
  try {
    await store.update(id, {
      caption: editForm.value.caption || undefined,
      altText: editForm.value.altText || undefined,
      sortOrder: editForm.value.sortOrder,
    })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Image updated', life: 3000 })
    editingId.value = null
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save changes', life: 3000 })
  } finally {
    saving.value = false
  }
}

function confirmDelete(id: string) {
  confirm.require({
    message: 'Delete this image? It will be removed from the History page.',
    header: 'Delete Image',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.remove(id)
        selected.value = selected.value.filter((s) => s !== id)
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Image removed', life: 3000 })
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete image', life: 3000 })
      }
    },
  })
}

function confirmDeleteMany() {
  const count = selected.value.length
  confirm.require({
    message: `Delete ${count} selected image${count !== 1 ? 's' : ''}? This cannot be undone.`,
    header: 'Delete Images',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete All',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.removeMany([...selected.value])
        selected.value = []
        toast.add({ severity: 'success', summary: 'Deleted', detail: `${count} image${count !== 1 ? 's' : ''} removed`, life: 3000 })
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete images', life: 3000 })
      }
    },
  })
}
</script>
