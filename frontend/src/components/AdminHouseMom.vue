<template>
  <Card class="mb-6">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-heart text-[#6F8FAF]"></i>
        <span>Edit House Mom</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-6">
        <p class="text-surface-600 m-0">
          Update the house mom shown on the People page. Photo is stored in cloud storage; bio supports rich text.
        </p>

        <div v-if="loading" class="text-center py-10 text-surface-600">
          <i class="pi pi-spin pi-spinner text-2xl text-[#6F8FAF]"></i>
        </div>

        <Message v-else-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>

        <form v-else class="flex flex-col gap-5" @submit.prevent="saveProfile">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label for="hm-first" class="font-semibold text-surface-700">First name</label>
              <InputText id="hm-first" v-model="form.firstName" class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label for="hm-last" class="font-semibold text-surface-700">Last name</label>
              <InputText id="hm-last" v-model="form.lastName" class="w-full" />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label for="hm-email" class="font-semibold text-surface-700">Email</label>
            <InputText
              id="hm-email"
              v-model="form.email"
              type="email"
              class="w-full"
              :class="{ 'p-invalid': errors.email }"
            />
            <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
          </div>

          <div class="flex flex-col gap-2">
            <label for="hm-phone" class="font-semibold text-surface-700">Phone</label>
            <InputText id="hm-phone" v-model="form.phone" class="w-full" placeholder="Optional" />
          </div>

          <div class="flex flex-col gap-2">
            <span class="font-semibold text-surface-700">Photo</span>
            <div class="flex flex-wrap items-start gap-4">
              <div
                class="hm-admin-thumb overflow-hidden bg-surface-200 ring-2 ring-surface-300 shrink-0"
              >
                <img
                  v-if="previewUrl"
                  :src="previewUrl"
                  alt="Current house mom photo"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-surface-500 text-sm"
                >
                  No photo
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="text-sm text-surface-600 max-w-full"
                  @change="onFileChange"
                />
                <div class="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    label="Upload photo"
                    icon="pi pi-upload"
                    size="small"
                    :loading="photoUploading"
                    :disabled="!pendingFile || photoUploading"
                    @click="uploadPhoto"
                  />
                  <Button
                    type="button"
                    label="Remove photo"
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    outlined
                    :loading="photoRemoving"
                    :disabled="!hasStoredPhoto || photoRemoving"
                    @click="removePhoto"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label for="hm-bio" class="font-semibold text-surface-700">Bio</label>
            <Editor
              id="hm-bio"
              v-model="form.bioHtml"
              editorStyle="height: 220px"
              :modules="editorModules"
            />
            <small class="text-surface-500">Rich text appears on the public House Mom section.</small>
          </div>

          <div class="flex gap-3">
            <Button
              type="submit"
              label="Save profile"
              icon="pi pi-check"
              :loading="saving"
              class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
            />
          </div>
        </form>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Editor from 'primevue/editor'
import { useToast } from 'primevue/usetoast'
import apiClient, { isAxiosRejection } from '@/services/api'
import type { HouseMomPublic, UpdateHouseMomPayload } from '@/types/houseMom'
import { formatUsPhoneForDisplay } from '@/utils/usPhone'
import { registerAdminUnsaved } from '@/utils/adminUnsavedRegistry'

const toast = useToast()

const editorModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean'],
  ],
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const saving = ref(false)
const photoUploading = ref(false)
const photoRemoving = ref(false)

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  bioHtml: '',
})

const errors = ref({ email: '' })
/** JSON snapshot after last successful load/save for dirty detection. */
const savedHouseMomSnapshot = ref('')
const serverPhotoUrl = ref<string | null>(null)
const pendingFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const previewUrl = computed(() => serverPhotoUrl.value)

const hasStoredPhoto = computed(() => Boolean(serverPhotoUrl.value))

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function houseMomFormSnapshot(): string {
  return JSON.stringify({
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    email: form.value.email,
    phone: form.value.phone,
    bioHtml: form.value.bioHtml,
  })
}

function applyFromServer(row: HouseMomPublic) {
  form.value.firstName = row.firstName ?? ''
  form.value.lastName = row.lastName ?? ''
  form.value.email = row.email ?? ''
  form.value.phone = formatUsPhoneForDisplay(row.phone ?? '')
  form.value.bioHtml = row.bioHtml ?? ''
  serverPhotoUrl.value = row.photoUrl ?? null
  savedHouseMomSnapshot.value = houseMomFormSnapshot()
}

function isHouseMomFormDirty(): boolean {
  if (loading.value || loadError.value) return false
  return houseMomFormSnapshot() !== savedHouseMomSnapshot.value || pendingFile.value != null
}

async function discardHouseMomEdits() {
  pendingFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
  await fetchHouseMom()
}

async function fetchHouseMom() {
  loading.value = true
  loadError.value = null
  try {
    const { data } = await apiClient.get<HouseMomPublic>('/house-mom')
    applyFromServer(data)
  } catch {
    loadError.value = 'Could not load house mom.'
  } finally {
    loading.value = false
  }
}

function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const f = input.files?.[0]
  pendingFile.value = f ?? null
}

async function uploadPhoto() {
  const f = pendingFile.value
  if (!f) return
  photoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', f)
    const { data } = await apiClient.post<HouseMomPublic>('/house-mom/photo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    applyFromServer(data)
    pendingFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    toast.add({ severity: 'success', summary: 'Photo updated', life: 3000 })
  } catch (e: unknown) {
    if (!isAxiosRejection(e)) {
      toast.add({ severity: 'error', summary: 'Upload failed', life: 4000 })
    }
  } finally {
    photoUploading.value = false
  }
}

async function removePhoto() {
  photoRemoving.value = true
  try {
    const { data } = await apiClient.delete<HouseMomPublic>('/house-mom/photo')
    applyFromServer(data)
    toast.add({ severity: 'success', summary: 'Photo removed', life: 3000 })
  } catch (e: unknown) {
    if (!isAxiosRejection(e)) {
      toast.add({ severity: 'error', summary: 'Could not remove photo', life: 4000 })
    }
  } finally {
    photoRemoving.value = false
  }
}

function validate(): boolean {
  errors.value = { email: '' }
  const e = form.value.email.trim()
  if (e && !emailRegex.test(e)) {
    errors.value.email = 'Enter a valid email'
    return false
  }
  return true
}

async function saveProfile() {
  if (!validate()) return
  saving.value = true
  try {
    const payload: UpdateHouseMomPayload = {
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      email: form.value.email.trim().toLowerCase(),
      phone: form.value.phone.trim() || null,
      bioHtml: form.value.bioHtml?.trim() ? form.value.bioHtml : null,
    }
    const { data } = await apiClient.put<HouseMomPublic>('/house-mom', payload)
    applyFromServer(data)
    toast.add({ severity: 'success', summary: 'Saved', detail: 'House mom profile updated.', life: 3500 })
  } catch (e: unknown) {
    if (!isAxiosRejection(e)) {
      toast.add({ severity: 'error', summary: 'Save failed', life: 4000 })
    }
  } finally {
    saving.value = false
  }
}

let unregisterHouseMom: (() => void) | null = null

onMounted(() => {
  void fetchHouseMom()
  unregisterHouseMom = registerAdminUnsaved({
    id: 'admin-house-mom',
    isDirty: () => isHouseMomFormDirty(),
    discard: () => {
      void discardHouseMomEdits()
    },
  })
})

onUnmounted(() => {
  unregisterHouseMom?.()
})
</script>

<style scoped>
.hm-admin-thumb {
  width: 7rem;
  height: 8.75rem;
  border-radius: 50%;
}

:deep(.p-editor-toolbar > span.ql-formats) {
  display: none !important;
}
</style>
