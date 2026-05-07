<template>
  <div class="flex flex-col gap-6">
    <div ref="formCardRef" class="mb-6">
      <Card :pt="formCardPassThrough">
        <template #title>
          <button
            id="rush-event-form-trigger"
            type="button"
            class="flex flex-wrap items-center justify-between gap-3 w-full text-left text-xl font-semibold leading-normal rounded-md border-0 bg-transparent p-1 -m-1 cursor-pointer text-surface-900 transition-colors hover:bg-surface-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F8FAF]"
            :aria-expanded="formOpen"
            aria-controls="rush-event-form-panel"
            :aria-label="
              formOpen
                ? editingEvent
                  ? 'Hide edit rush event form'
                  : 'Hide add rush event form'
                : editingEvent
                  ? 'Show edit rush event form'
                  : 'Show add rush event form'
            "
            v-tooltip.top="formOpen ? 'Hide form' : 'Show form'"
            @click="formOpen = !formOpen"
          >
            <span class="flex items-center gap-2 min-w-0">
              <i class="pi pi-plus-circle ml-3 text-xl text-[#6F8FAF] shrink-0" aria-hidden="true"></i>
              <span>{{ editingEvent ? 'Edit Rush Event' : 'Add Rush Event' }}</span>
            </span>
            <i
              :class="[
                'pi shrink-0 text-xl text-[#6F8FAF]',
                formOpen ? 'pi-minus' : 'pi-plus',
              ]"
              aria-hidden="true"
            />
          </button>
        </template>
        <template #content>
          <div
            id="rush-event-form-panel"
            v-show="formOpen"
            class="flex flex-col gap-6"
            role="region"
            aria-labelledby="rush-event-form-trigger"
          >
            <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">
              <div class="flex flex-col gap-2">
                <label for="rush-title" class="font-semibold text-surface-700">
                  Title <span class="text-red-500">*</span>
                </label>
                <InputText
                  id="rush-title"
                  v-model="form.title"
                  placeholder="Open House"
                  :class="{ 'p-invalid': errors.title }"
                  class="w-full"
                />
                <small v-if="errors.title" class="p-error">{{ errors.title }}</small>
              </div>

              <div class="flex flex-col gap-2">
                <label for="rush-display-date" class="font-semibold text-surface-700">
                  Display date <span class="text-red-500">*</span>
                </label>
                <InputText
                  id="rush-display-date"
                  v-model="form.displayDate"
                  placeholder="Fall 2026, Sep 12, or TBD"
                  :class="{ 'p-invalid': errors.displayDate }"
                  class="w-full"
                />
                <small v-if="errors.displayDate" class="p-error">{{ errors.displayDate }}</small>
                <small class="text-surface-500 text-xs">
                  Shown on the public timeline (not a calendar picker).
                </small>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="flex flex-col gap-2">
                  <label for="rush-icon" class="font-semibold text-surface-700">Timeline icon</label>
                  <Select
                    id="rush-icon"
                    v-model="form.icon"
                    :options="iconOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select icon"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label for="rush-sort" class="font-semibold text-surface-700">Sort order</label>
                  <InputNumber
                    id="rush-sort"
                    v-model="form.sortOrder"
                    :min="0"
                    show-buttons
                    class="w-full"
                  />
                  <small class="text-surface-500 text-xs">Lower numbers appear first.</small>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <label for="rush-location" class="font-semibold text-surface-700">Location</label>
                <InputText
                  id="rush-location"
                  v-model="form.location"
                  placeholder="Chapter House"
                  class="w-full"
                />
              </div>

              <div class="flex flex-col gap-2">
                <label for="rush-time-label" class="font-semibold text-surface-700">Time</label>
                <InputText
                  id="rush-time-label"
                  v-model="form.timeLabel"
                  placeholder="6:00 PM CT"
                  class="w-full"
                />
              </div>

              <div class="flex flex-col gap-2">
                <label for="rush-description" class="font-semibold text-surface-700">
                  Description
                </label>
                <Editor
                  id="rush-description"
                  v-model="form.description"
                  editorStyle="height: 200px"
                  :class="{ 'p-invalid': errors.description }"
                  :modules="editorModules"
                />
                <small v-if="errors.description" class="p-error">{{ errors.description }}</small>
              </div>

              <div class="flex gap-3">
                <Button
                  type="submit"
                  :label="editingEvent ? 'Update' : 'Create'"
                  icon="pi pi-check"
                  :loading="submitting"
                  :disabled="submitting || !isFormFilled"
                  :class="[
                    'bg-[#6F8FAF] hover:bg-[#5A7A9F]',
                    (submitting || !isFormFilled) && '!cursor-not-allowed',
                  ]"
                />
                <Button
                  v-if="editingEvent"
                  label="Cancel"
                  icon="pi pi-times"
                  outlined
                  type="button"
                  :disabled="submitting"
                  @click="cancelEdit"
                />
              </div>
            </form>
          </div>
        </template>
      </Card>
    </div>

    <Card class="mb-6 min-w-0">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-list text-[#6F8FAF]"></i>
          <span>Rush events ({{ rushEventStore.events.length }})</span>
        </div>
      </template>
      <template #content>
        <div v-if="rushEventStore.loading" class="text-center py-8">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <p class="mt-4 text-surface-600">Loading…</p>
        </div>

        <div v-else-if="rushEventStore.events.length === 0" class="text-center py-8">
          <i class="pi pi-calendar-times text-4xl text-surface-400 mb-4"></i>
          <p class="text-surface-600">
            No rush events yet. Open <strong>Add Rush Event</strong> above.
          </p>
        </div>

        <div v-else class="admin-rush-event-cards flex flex-col gap-4 min-w-0">
          <Card
            v-for="ev in sortedEvents"
            :key="ev.id"
            class="min-w-0 max-w-full cursor-pointer hover:shadow-lg transition-shadow"
            @click="editEvent(ev)"
          >
            <template #content>
              <div class="flex flex-col md:flex-row gap-4 min-w-0">
                <div class="flex-shrink-0">
                  <div
                    class="w-16 h-16 bg-gradient-to-br from-[#5A7A9F] to-[#6F8FAF] rounded-lg flex items-center justify-center text-white"
                  >
                    <i :class="[ev.icon, 'text-2xl']"></i>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div
                    class="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2 min-w-0"
                  >
                    <div class="min-w-0 flex-1 md:pr-2">
                      <h3 class="text-xl font-bold text-surface-900 break-words">{{ ev.title }}</h3>
                      <p class="text-surface-600 text-sm mt-1 break-words">
                        {{ ev.displayDate }}
                        <span v-if="ev.location" class="ml-2 inline-block">
                          <i class="pi pi-map-marker mr-1"></i>{{ ev.location }}
                        </span>
                        <span v-if="ev.timeLabel" class="ml-2 inline-block">
                          <i class="pi pi-clock mr-1"></i>{{ ev.timeLabel }}
                        </span>
                      </p>
                      <p class="text-surface-500 text-xs mt-1">Sort: {{ ev.sortOrder }}</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                      <Button
                        icon="pi pi-pencil"
                        label="Edit"
                        size="small"
                        outlined
                        class="text-[#6F8FAF] border-[#6F8FAF]"
                        @click.stop="editEvent(ev)"
                      />
                      <Button
                        icon="pi pi-trash"
                        label="Delete"
                        size="small"
                        outlined
                        severity="danger"
                        @click.stop="confirmDelete(ev)"
                      />
                    </div>
                  </div>
                  <div
                    v-if="ev.description"
                    class="rush-event-desc-preview text-surface-600 line-clamp-2"
                    v-html="ev.description"
                  ></div>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Editor from 'primevue/editor'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useRushEventStore, type RushEvent } from '@/stores/rushEvent'

const rushEventStore = useRushEventStore()
const confirm = useConfirm()
const toast = useToast()

const formOpen = ref(false)
const formCardRef = ref<HTMLElement | null>(null)

const formCardPassThrough = computed(() =>
  formOpen.value ? {} : { body: { class: '!p-0' }, content: { class: '!p-0' } },
)

const iconOptions = [
  { label: 'Calendar', value: 'pi pi-calendar' },
  { label: 'Home', value: 'pi pi-home' },
  { label: 'Users', value: 'pi pi-users' },
  { label: 'Star', value: 'pi pi-star' },
  { label: 'Heart', value: 'pi pi-heart' },
  { label: 'Map marker', value: 'pi pi-map-marker' },
  { label: 'Clock', value: 'pi pi-clock' },
  { label: 'Megaphone', value: 'pi pi-megaphone' },
]

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

const editingEvent = ref<RushEvent | null>(null)
const submitting = ref(false)

const form = ref({
  title: '',
  displayDate: '',
  description: '',
  icon: 'pi pi-calendar',
  location: '',
  timeLabel: '',
  sortOrder: 0,
})

const errors = ref({
  title: '',
  displayDate: '',
  description: '',
})

const sortedEvents = computed(() =>
  [...rushEventStore.events].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.title.localeCompare(b.title)
  }),
)

/** Same idea as AdminAddPerson: disable submit until required fields look filled */
const isFormFilled = computed(
  () =>
    (form.value.title ?? '').trim() !== '' &&
    (form.value.displayDate ?? '').trim() !== '',
)

function nextSortOrder(): number {
  const ev = rushEventStore.events
  if (ev.length === 0) return 0
  return Math.max(...ev.map((e) => e.sortOrder)) + 1
}

function resetForm() {
  form.value = {
    title: '',
    displayDate: '',
    description: '',
    icon: 'pi pi-calendar',
    location: '',
    timeLabel: '',
    sortOrder: nextSortOrder(),
  }
  errors.value = { title: '', displayDate: '', description: '' }
  editingEvent.value = null
}

function validate(): boolean {
  errors.value = { title: '', displayDate: '', description: '' }
  let ok = true
  if (!(form.value.title ?? '').trim()) {
    errors.value.title = 'Title is required'
    ok = false
  }
  if (!(form.value.displayDate ?? '').trim()) {
    errors.value.displayDate = 'Display date is required'
    ok = false
  }
  return ok
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  try {
    const payload = {
      title: (form.value.title ?? '').trim(),
      displayDate: (form.value.displayDate ?? '').trim(),
      description: form.value.description || undefined,
      icon:
        typeof form.value.icon === 'string' && form.value.icon.trim()
          ? form.value.icon.trim()
          : 'pi pi-calendar',
      location: (form.value.location ?? '').trim() || undefined,
      timeLabel: (form.value.timeLabel ?? '').trim() || undefined,
      sortOrder:
        typeof form.value.sortOrder === 'number' && !Number.isNaN(form.value.sortOrder)
          ? form.value.sortOrder
          : 0,
    }
    if (editingEvent.value) {
      await rushEventStore.update(editingEvent.value.id, payload)
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Rush event updated',
        life: 3000,
      })
    } else {
      await rushEventStore.create(payload)
      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Rush event created',
        life: 3000,
      })
    }
    resetForm()
    formOpen.value = false
  } catch (e: unknown) {
    console.error(e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not save rush event',
      life: 5000,
    })
  } finally {
    submitting.value = false
  }
}

function editEvent(ev: RushEvent) {
  editingEvent.value = ev
  form.value = {
    title: ev.title,
    displayDate: ev.displayDate,
    description: ev.description || '',
    icon: ev.icon,
    location: ev.location || '',
    timeLabel: ev.timeLabel || '',
    sortOrder: ev.sortOrder,
  }
  formOpen.value = true
  void nextTick(() => {
    formCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function cancelEdit() {
  resetForm()
  formOpen.value = false
}

function confirmDelete(ev: RushEvent) {
  confirm.require({
    message: `Delete "${ev.title}"?`,
    header: 'Confirm',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await rushEventStore.delete(ev.id)
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Rush event removed',
          life: 3000,
        })
      } catch {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not delete',
          life: 5000,
        })
      }
    },
  })
}

onMounted(async () => {
  await rushEventStore.fetchAll()
  resetForm()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rush-event-desc-preview {
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
}

.rush-event-desc-preview :deep(img) {
  max-width: 100%;
  height: auto;
}

.admin-rush-event-cards :deep(.p-card .p-card-body) {
  min-width: 0;
}

.rush-event-desc-preview :deep(p),
.rush-event-desc-preview :deep(li) {
  overflow-wrap: anywhere;
  word-break: break-word;
}

:deep(.p-editor-toolbar > span.ql-formats) {
  display: none !important;
}

:deep(ul),
:deep(ol) {
  margin-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding-left: 1rem;
}

:deep(ul) {
  list-style-type: disc;
}

:deep(ol) {
  list-style-type: decimal;
}

:deep(li) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

:deep(button[type='submit']:disabled),
:deep(button[type='submit'].p-disabled) {
  cursor: not-allowed !important;
}
</style>
