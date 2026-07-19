<template>
  <div class="bg-surface-0 min-h-screen">

    <!-- Hero banner -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-5xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Chapter Resources</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Documents, policies, and reference materials for chapter leadership
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

  <div class="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">

    <!-- Stat / filter strip -->
    <div class="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible">
      <div
        v-for="opt in tagFilterOptions"
        :key="opt.value"
        class="flex items-center gap-3 p-4 bg-white border rounded-xl shadow-sm cursor-pointer transition-all select-none shrink-0 sm:shrink"
        :class="activeTagFilter === opt.value
          ? 'border-[#6F8FAF] ring-1 ring-[#6F8FAF]'
          : 'border-surface-200 hover:border-surface-300'"
        @click="activeTagFilter = opt.value"
      >
        <div class="flex items-center justify-center w-9 h-9 rounded-full shrink-0" :class="opt.iconBg">
          <i :class="[opt.icon, opt.iconColor, 'text-base']"></i>
        </div>
        <div>
          <div class="text-lg font-bold text-surface-900 leading-tight">{{ tagCount(opt.value) }}</div>
          <div class="text-xs text-surface-500 leading-tight">{{ opt.label }}</div>
        </div>
      </div>
    </div>

    <!-- Main content card -->
    <Card>
      <template #title>
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <i class="pi pi-folder-open text-[#6F8FAF]"></i>
            <span>
              Documents
              <span v-if="activeTagFilter !== 'all'" class="text-sm font-normal text-surface-500 ml-1">
                — {{ tagLabel(activeTagFilter) }}
              </span>
            </span>
          </div>
          <Button label="Add Document" icon="pi pi-upload" @click="showAddDialog = true" />
        </div>
      </template>
      <template #content>
        <p class="text-surface-600 text-sm mb-5 m-0">
          Store and manage chapter documents — contracts, policies, insurance forms, and national
          materials. Only editors and admins can view or manage resources.
        </p>

        <!-- Loading -->
        <div v-if="resourceStore.loading" class="text-center py-10">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <div class="mt-4 text-surface-600">Loading resources...</div>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredResources.length === 0" class="text-center py-10">
          <i class="pi pi-inbox text-6xl text-surface-400 mb-4 block"></i>
          <div class="text-surface-600">
            {{ activeTagFilter === 'all' ? 'No documents uploaded yet.' : `No ${tagLabel(activeTagFilter).toLowerCase()} documents yet.` }}
          </div>
        </div>

        <!-- Resource list -->
        <div v-else class="flex flex-col gap-3">
          <div
            v-for="resource in filteredResources"
            :key="resource.id"
            class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors"
          >
            <!-- Icon + content grouped so they stay together on mobile -->
            <div class="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <!-- File type icon -->
              <div
                class="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 mt-0.5 sm:mt-0"
                :class="fileTypeInfo(resource.currentVersion?.originalFilename).bg"
              >
                <i :class="[fileTypeInfo(resource.currentVersion?.originalFilename).icon, fileTypeInfo(resource.currentVersion?.originalFilename).color, 'text-xl']"></i>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-0.5">
                  <span class="font-semibold text-surface-900">{{ resource.title }}</span>
                  <span :class="tagBadgeClass(resource.tag)">{{ tagLabel(resource.tag) }}</span>
                  <span
                    v-if="resource.currentVersion && resource.currentVersion.versionNumber > 1"
                    class="px-1.5 py-0.5 text-xs font-medium bg-surface-100 text-surface-600 rounded"
                  >
                    v{{ resource.currentVersion.versionNumber }}
                  </span>
                </div>
                <div v-if="resource.description" class="text-sm text-surface-600 truncate">
                  {{ resource.description }}
                </div>
              <div class="text-xs text-surface-400 mt-0.5 space-y-0.5">
                <div v-if="resource.currentVersion">
                  {{ resource.currentVersion.originalFilename }} · {{ formatFileSize(resource.currentVersion.fileSize) }}
                </div>
                <div class="flex flex-wrap gap-x-3">
                  <span>Added {{ formatDate(resource.createdAt) }}</span>
                  <span><i class="pi pi-user mr-1"></i>{{ resource.uploadedBy }}</span>
                </div>
              </div>
              </div>
            </div>

            <!-- Actions: below content on mobile (indented past the icon), inline on desktop -->
            <div class="flex items-center gap-1 shrink-0 pl-14 sm:pl-0">
              <Button
                icon="pi pi-download"
                severity="primary"
                outlined
                rounded
                v-tooltip.top="'Download'"
                :loading="downloadingId === resource.id"
                @click="handleDownload(resource)"
              />
              <Button
                icon="pi pi-upload"
                severity="secondary"
                outlined
                rounded
                v-tooltip.top="'Replace file'"
                @click="openReplaceDialog(resource)"
              />
              <Button
                v-if="resource.currentVersion && resource.currentVersion.versionNumber > 1"
                icon="pi pi-history"
                severity="secondary"
                outlined
                rounded
                v-tooltip.top="'Version history'"
                @click="openHistoryDialog(resource)"
              />
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                outlined
                rounded
                v-tooltip.top="'Edit details'"
                @click="openEditDialog(resource)"
              />
              <Button
                v-if="authStore.isAdmin"
                icon="pi pi-trash"
                severity="danger"
                outlined
                rounded
                v-tooltip.top="'Delete'"
                :loading="deletingId === resource.id"
                @click="confirmDelete(resource)"
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- ─── Add Document Dialog ─────────────────────────────────────── -->
    <Dialog
      v-model:visible="showAddDialog"
      header="Add Document"
      :modal="true"
      :style="{ width: '480px' }"
      @hide="resetAddForm"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Title <span class="text-red-500">*</span></label>
          <InputText v-model="addForm.title" placeholder="e.g. Housing Contract 2026" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Category <span class="text-red-500">*</span></label>
          <Select
            v-model="addForm.tag"
            :options="tagOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select category"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Description</label>
          <Textarea v-model="addForm.description" placeholder="Optional notes about this document" rows="2" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">File <span class="text-red-500">*</span></label>
          <FileUpload
            mode="basic"
            :auto="false"
            chooseLabel="Choose file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            :maxFileSize="52428800"
            @select="onAddFileSelect"
            class="w-full"
          />
          <span v-if="addForm.file" class="text-xs text-surface-600 mt-1">
            Selected: {{ addForm.file.name }} ({{ formatFileSize(addForm.file.size) }})
          </span>
          <span class="text-xs text-surface-400">PDF, Word, Excel, PowerPoint, TXT, CSV — max 50 MB</span>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" outlined @click="showAddDialog = false" />
        <Button
          label="Upload"
          icon="pi pi-upload"
          :loading="addLoading"
          :disabled="!addForm.title || !addForm.tag || !addForm.file"
          @click="handleAdd"
        />
      </template>
    </Dialog>

    <!-- ─── Edit Dialog ─────────────────────────────────────────────── -->
    <Dialog
      v-model:visible="showEditDialog"
      header="Edit Document Details"
      :modal="true"
      :style="{ width: '440px' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Title <span class="text-red-500">*</span></label>
          <InputText v-model="editForm.title" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Category <span class="text-red-500">*</span></label>
          <Select
            v-model="editForm.tag"
            :options="tagOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Description</label>
          <Textarea v-model="editForm.description" rows="2" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" outlined @click="showEditDialog = false" />
        <Button label="Save" :loading="editLoading" :disabled="!editForm.title || !editForm.tag" @click="handleEdit" />
      </template>
    </Dialog>

    <!-- ─── Replace File Dialog ─────────────────────────────────────── -->
    <Dialog
      v-model:visible="showReplaceDialog"
      header="Replace Document"
      :modal="true"
      :style="{ width: '440px' }"
    >
      <div class="flex flex-col gap-3 pt-2">
        <p class="text-sm text-surface-600 m-0">
          Uploading a new file will become the current version. The previous file is retained in version history.
        </p>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">New file <span class="text-red-500">*</span></label>
          <FileUpload
            mode="basic"
            :auto="false"
            chooseLabel="Choose file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            :maxFileSize="52428800"
            @select="onReplaceFileSelect"
            class="w-full"
          />
          <span v-if="replaceFile" class="text-xs text-surface-600 mt-1">
            Selected: {{ replaceFile.name }} ({{ formatFileSize(replaceFile.size) }})
          </span>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" outlined @click="showReplaceDialog = false" />
        <Button label="Upload New Version" icon="pi pi-upload" :loading="replaceLoading" :disabled="!replaceFile" @click="handleReplace" />
      </template>
    </Dialog>

    <!-- ─── Version History Dialog ─────────────────────────────────── -->
    <Dialog
      v-model:visible="showHistoryDialog"
      :header="`Version History — ${historyResource?.title ?? ''}`"
      :modal="true"
      :style="{ width: '560px' }"
    >
      <div v-if="historyLoading" class="text-center py-6">
        <i class="pi pi-spin pi-spinner text-2xl text-[#6F8FAF]"></i>
      </div>
      <div v-else-if="historyVersions.length === 0" class="text-center py-6 text-surface-500">
        No version history available.
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="version in historyVersions"
          :key="version.id"
          class="flex items-center justify-between p-3 border border-surface-200 rounded-lg"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold bg-surface-100 text-surface-700 px-2 py-0.5 rounded">
                v{{ version.versionNumber }}
              </span>
              <span v-if="version.versionNumber === historyVersions[0]?.versionNumber" class="text-xs text-green-700 font-medium">Current</span>
            </div>
            <div class="text-sm text-surface-700 mt-1">{{ version.originalFilename }}</div>
            <div class="text-xs text-surface-500">
              {{ formatFileSize(version.fileSize) }} · Uploaded {{ formatDate(version.createdAt) }} by {{ version.uploadedBy }}
            </div>
          </div>
          <Button
            icon="pi pi-download"
            severity="secondary"
            outlined
            rounded
            size="small"
            :loading="versionDownloadingId === version.id"
            v-tooltip.top="'Download this version'"
            @click="handleVersionDownload(version)"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Close" severity="secondary" outlined @click="showHistoryDialog = false" />
      </template>
    </Dialog>

    <!-- ─── Delete Confirm Dialog ──────────────────────────────────── -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Delete Document"
      :modal="true"
      :style="{ width: '420px' }"
    >
      <p class="text-surface-700 m-0">
        Are you sure you want to delete <strong>{{ deleteTarget?.title }}</strong>?
        This will remove all versions. This action cannot be undone.
      </p>
      <template #footer>
        <Button label="Cancel" severity="secondary" outlined @click="showDeleteDialog = false" />
        <Button label="Delete" severity="danger" :loading="deletingId === deleteTarget?.id" @click="handleDelete" />
      </template>
    </Dialog>

  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import { useResourceStore } from '@/stores/resources'
import { useAuthStore } from '@/stores/auth'
import type { ResourceResponseDto, ResourceVersionDto } from '@/types/resource'
import { ResourceTag, RESOURCE_TAG_LABELS } from '@/types/resource'

const toast = useToast()
const resourceStore = useResourceStore()
const authStore = useAuthStore()

// ─── Filter ─────────────────────────────────────────────────────────────────

const activeTagFilter = ref<string>('all')

const tagFilterOptions = [
  { label: 'All',       value: 'all',                  icon: 'pi pi-folder-open', iconBg: 'bg-blue-50',   iconColor: 'text-blue-500'   },
  { label: 'Legal',     value: ResourceTag.LEGAL,       icon: 'pi pi-file',        iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
  { label: 'Insurance', value: ResourceTag.INSURANCE,   icon: 'pi pi-shield',      iconBg: 'bg-purple-50', iconColor: 'text-purple-500' },
  { label: 'General Fraternity', value: ResourceTag.NATIONAL, icon: 'pi pi-flag', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  { label: 'Chapter Management', value: ResourceTag.CHAPTER_MANAGEMENT, icon: 'pi pi-briefcase', iconBg: 'bg-teal-50', iconColor: 'text-teal-500' },
  { label: 'Other',     value: ResourceTag.OTHER,       icon: 'pi pi-tag',         iconBg: 'bg-slate-50',  iconColor: 'text-slate-500'  },
]

function tagCount(value: string): number {
  if (value === 'all') return resourceStore.resources.length
  return resourceStore.resources.filter((r) => r.tag === value).length
}

const tagOptions = [
  { label: 'Legal', value: ResourceTag.LEGAL },
  { label: 'Insurance', value: ResourceTag.INSURANCE },
  { label: 'General Fraternity', value: ResourceTag.NATIONAL },
  { label: 'Chapter Management', value: ResourceTag.CHAPTER_MANAGEMENT },
  { label: 'Other', value: ResourceTag.OTHER },
]

const filteredResources = computed(() => {
  if (activeTagFilter.value === 'all') return resourceStore.resources
  return resourceStore.resources.filter((r) => r.tag === activeTagFilter.value)
})

// ─── Add dialog ─────────────────────────────────────────────────────────────

const showAddDialog = ref(false)
const addLoading = ref(false)
const addForm = ref({ title: '', tag: '' as ResourceTag | '', description: '', file: null as File | null })

function onAddFileSelect(event: { files: File[] }) {
  addForm.value.file = event.files[0] ?? null
}

function resetAddForm() {
  addForm.value = { title: '', tag: '', description: '', file: null }
}

async function handleAdd() {
  if (!addForm.value.title || !addForm.value.tag || !addForm.value.file) return
  addLoading.value = true
  try {
    await resourceStore.createResource(
      { title: addForm.value.title, tag: addForm.value.tag as ResourceTag, description: addForm.value.description || undefined },
      addForm.value.file,
    )
    showAddDialog.value = false
    toast.add({ severity: 'success', summary: 'Document uploaded', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Upload failed', detail: 'Please try again.', life: 4000 })
  } finally {
    addLoading.value = false
  }
}

// ─── Edit dialog ─────────────────────────────────────────────────────────────

const showEditDialog = ref(false)
const editLoading = ref(false)
const editTarget = ref<ResourceResponseDto | null>(null)
const editForm = ref({ title: '', tag: '' as ResourceTag | '', description: '' })

function openEditDialog(resource: ResourceResponseDto) {
  editTarget.value = resource
  editForm.value = { title: resource.title, tag: resource.tag, description: resource.description ?? '' }
  showEditDialog.value = true
}

async function handleEdit() {
  if (!editTarget.value || !editForm.value.title || !editForm.value.tag) return
  editLoading.value = true
  try {
    await resourceStore.updateResource(editTarget.value.id, {
      title: editForm.value.title,
      tag: editForm.value.tag as ResourceTag,
      description: editForm.value.description || undefined,
    })
    showEditDialog.value = false
    toast.add({ severity: 'success', summary: 'Document updated', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Update failed', detail: 'Please try again.', life: 4000 })
  } finally {
    editLoading.value = false
  }
}

// ─── Replace dialog ──────────────────────────────────────────────────────────

const showReplaceDialog = ref(false)
const replaceLoading = ref(false)
const replaceTarget = ref<ResourceResponseDto | null>(null)
const replaceFile = ref<File | null>(null)

function openReplaceDialog(resource: ResourceResponseDto) {
  replaceTarget.value = resource
  replaceFile.value = null
  showReplaceDialog.value = true
}

function onReplaceFileSelect(event: { files: File[] }) {
  replaceFile.value = event.files[0] ?? null
}

async function handleReplace() {
  if (!replaceTarget.value || !replaceFile.value) return
  replaceLoading.value = true
  try {
    await resourceStore.replaceFile(replaceTarget.value.id, replaceFile.value)
    showReplaceDialog.value = false
    toast.add({ severity: 'success', summary: 'New version uploaded', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Upload failed', detail: 'Please try again.', life: 4000 })
  } finally {
    replaceLoading.value = false
  }
}

// ─── Download ────────────────────────────────────────────────────────────────

const downloadingId = ref<string | null>(null)

async function handleDownload(resource: ResourceResponseDto) {
  downloadingId.value = resource.id
  try {
    const url = await resourceStore.getDownloadUrl(resource.id)
    window.open(url, '_blank')
  } catch {
    toast.add({ severity: 'error', summary: 'Download failed', detail: 'Please try again.', life: 4000 })
  } finally {
    downloadingId.value = null
  }
}

// ─── Version history dialog ──────────────────────────────────────────────────

const showHistoryDialog = ref(false)
const historyLoading = ref(false)
const historyResource = ref<ResourceResponseDto | null>(null)
const historyVersions = ref<ResourceVersionDto[]>([])
const versionDownloadingId = ref<string | null>(null)

async function openHistoryDialog(resource: ResourceResponseDto) {
  historyResource.value = resource
  historyVersions.value = []
  showHistoryDialog.value = true
  historyLoading.value = true
  try {
    historyVersions.value = await resourceStore.getVersions(resource.id)
  } catch {
    toast.add({ severity: 'error', summary: 'Could not load history', life: 3000 })
  } finally {
    historyLoading.value = false
  }
}

async function handleVersionDownload(version: ResourceVersionDto) {
  if (!historyResource.value) return
  versionDownloadingId.value = version.id
  try {
    const url = await resourceStore.getVersionDownloadUrl(historyResource.value.id, version.id)
    window.open(url, '_blank')
  } catch {
    toast.add({ severity: 'error', summary: 'Download failed', life: 3000 })
  } finally {
    versionDownloadingId.value = null
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

const showDeleteDialog = ref(false)
const deletingId = ref<string | null>(null)
const deleteTarget = ref<ResourceResponseDto | null>(null)

function confirmDelete(resource: ResourceResponseDto) {
  deleteTarget.value = resource
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deletingId.value = deleteTarget.value.id
  try {
    await resourceStore.deleteResource(deleteTarget.value.id)
    showDeleteDialog.value = false
    toast.add({ severity: 'success', summary: 'Document deleted', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Delete failed', detail: 'Please try again.', life: 4000 })
  } finally {
    deletingId.value = null
    deleteTarget.value = null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tagLabel(tag: string): string {
  return RESOURCE_TAG_LABELS[tag as ResourceTag] ?? tag
}

function fileTypeInfo(filename?: string): { icon: string; color: string; bg: string } {
  const ext = filename?.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf')                          return { icon: 'pi pi-file-pdf',   color: 'text-red-500',    bg: 'bg-red-50'    }
  if (ext === 'doc' || ext === 'docx')        return { icon: 'pi pi-file-word',  color: 'text-blue-600',   bg: 'bg-blue-50'   }
  if (ext === 'xls' || ext === 'xlsx')        return { icon: 'pi pi-file-excel', color: 'text-green-600',  bg: 'bg-green-50'  }
  if (ext === 'ppt' || ext === 'pptx')        return { icon: 'pi pi-file',       color: 'text-orange-500', bg: 'bg-orange-50' }
  if (ext === 'txt' || ext === 'csv')         return { icon: 'pi pi-file',       color: 'text-slate-500',  bg: 'bg-slate-50'  }
  return                                             { icon: 'pi pi-file',       color: 'text-[#6F8FAF]',  bg: 'bg-blue-50'   }
}

function tagBadgeClass(tag: ResourceTag): string {
  const base = 'px-2 py-0.5 text-xs font-semibold rounded capitalize'
  const colors: Record<ResourceTag, string> = {
    [ResourceTag.LEGAL]: 'bg-blue-100 text-blue-800',
    [ResourceTag.INSURANCE]: 'bg-purple-100 text-purple-800',
    [ResourceTag.NATIONAL]: 'bg-amber-100 text-amber-800',
    [ResourceTag.CHAPTER_MANAGEMENT]: 'bg-teal-100 text-teal-800',
    [ResourceTag.OTHER]: 'bg-slate-100 text-slate-700',
  }
  return `${base} ${colors[tag] ?? colors[ResourceTag.OTHER]}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Init ────────────────────────────────────────────────────────────────────

onMounted(() => {
  resourceStore.fetchResources()
})
</script>
