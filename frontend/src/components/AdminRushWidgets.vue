<template>
  <div class="flex flex-col gap-6">
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-th-large text-[#6F8FAF]"></i>
          <span>Rush widget content</span>
        </div>
      </template>
      <template #content>
        <p class="text-surface-600 mb-4">
          These four blocks appear under &quot;Why Rush Beta Theta Pi?&quot; on the public
          <strong>Rush</strong> page. Edit the title and body for each card.
        </p>

        <div v-if="store.loading && store.widgets.length === 0" class="text-center py-10">
          <i class="pi pi-spin pi-spinner text-3xl text-[#6F8FAF]"></i>
          <p class="mt-2 text-surface-600">Loading widgets…</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card v-for="w in sortedWidgets" :key="w.id">
            <template #title>
              <span class="text-lg">{{ w.title }}</span>
            </template>
            <template #subtitle>
              <span class="text-surface-500 text-sm">Slot {{ w.slotIndex + 1 }} of 4</span>
            </template>
            <template #content>
              <div
                v-if="w.bodyHtml"
                class="widget-preview text-surface-700 text-sm line-clamp-4 mb-4"
                v-html="w.bodyHtml"
              />
              <p v-else class="text-surface-400 text-sm mb-4 italic">No body content yet.</p>
              <Button
                label="Edit"
                icon="pi pi-pencil"
                outlined
                class="text-[#6F8FAF] border-[#6F8FAF]"
                :disabled="store.loading"
                @click="openEdit(w)"
              />
            </template>
          </Card>
        </div>
      </template>
    </Card>

    <Dialog
      v-model:visible="dialogOpen"
      modal
      header="Edit rush widget"
      class="max-w-2xl w-full"
      :closable="!saving"
      @hide="onDialogHide"
    >
      <div v-if="editing" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label for="widget-title" class="font-semibold text-surface-700">
            Title <span class="text-red-500">*</span>
          </label>
          <InputText
            id="widget-title"
            v-model="draftTitle"
            class="w-full"
            :class="{ 'p-invalid': titleError }"
          />
          <small v-if="titleError" class="p-error">{{ titleError }}</small>
        </div>
        <div class="flex flex-col gap-2">
          <label for="widget-body" class="font-semibold text-surface-700">Body</label>
          <Editor
            id="widget-body"
            v-model="draftBodyHtml"
            editorStyle="height: 220px"
            :modules="editorModules"
          />
          <small class="text-surface-500 text-xs">Shown under the title on the Rush page.</small>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" outlined severity="secondary" :disabled="saving" @click="dialogOpen = false" />
        <Button
          label="Save"
          icon="pi pi-check"
          :loading="saving"
          :disabled="saving"
          class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
          type="button"
          @click="save"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Editor from 'primevue/editor'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { useRushPageWidgetStore, type RushPageWidget } from '@/stores/rushPageWidget'

const store = useRushPageWidgetStore()
const toast = useToast()

const dialogOpen = ref(false)
const editing = ref<RushPageWidget | null>(null)
const draftTitle = ref('')
const draftBodyHtml = ref('')
const titleError = ref('')
const saving = ref(false)

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

const sortedWidgets = computed(() =>
  [...store.widgets].sort((a, b) => a.slotIndex - b.slotIndex),
)

function openEdit(w: RushPageWidget) {
  editing.value = w
  draftTitle.value = w.title
  draftBodyHtml.value = w.bodyHtml ?? ''
  titleError.value = ''
  dialogOpen.value = true
}

function onDialogHide() {
  editing.value = null
  draftTitle.value = ''
  draftBodyHtml.value = ''
  titleError.value = ''
}

async function save() {
  titleError.value = ''
  const title = draftTitle.value.trim()
  if (!title) {
    titleError.value = 'Title is required'
    return
  }
  if (!editing.value) return
  saving.value = true
  try {
    await store.update(editing.value.id, {
      title,
      bodyHtml: draftBodyHtml.value || undefined,
    })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Widget updated', life: 3000 })
    dialogOpen.value = false
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not save widget', life: 5000 })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void store.fetchAll()
})
</script>

<style scoped>
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.widget-preview :deep(p) {
  margin: 0 0 0.25rem;
}

.widget-preview :deep(p:last-child) {
  margin-bottom: 0;
}

:deep(.p-editor-toolbar > span.ql-formats) {
  display: none !important;
}

:deep(.widget-preview ul),
:deep(.widget-preview ol) {
  margin-left: 1.25rem;
}
</style>
