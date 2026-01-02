<template>
  <div class="flex flex-col gap-6">
    <!-- Events List -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-list text-[#6F8FAF]"></i>
          <span>Calendar Events ({{ calendarEventStore.events.length }})</span>
        </div>
      </template>
      <template #content>
        <div v-if="calendarEventStore.loading" class="text-center py-8">
          <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
          <p class="mt-4 text-surface-600">Loading events...</p>
        </div>

        <div v-else-if="calendarEventStore.events.length === 0" class="text-center py-8">
          <i class="pi pi-calendar-times text-4xl text-surface-400 mb-4"></i>
          <p class="text-surface-600">No calendar events yet. Create your first event below.</p>
        </div>

        <div v-else class="flex flex-col gap-4">
          <Card
            v-for="event in sortedEvents"
            :key="event.id"
            class="cursor-pointer hover:shadow-lg transition-shadow"
            @click="editEvent(event)"
          >
            <template #content>
              <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-shrink-0">
                  <div class="w-16 h-16 bg-gradient-to-br from-[#5A7A9F] to-[#6F8FAF] rounded-lg flex items-center justify-center text-white">
                    <i class="pi pi-calendar text-2xl"></i>
                  </div>
                </div>
                <div class="flex-1">
                  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <h3 class="text-xl font-bold text-surface-900">{{ event.name }}</h3>
                    <div class="flex gap-2">
                      <Button
                        icon="pi pi-pencil"
                        label="Edit"
                        size="small"
                        outlined
                        @click.stop="editEvent(event)"
                        class="text-[#6F8FAF] border-[#6F8FAF]"
                      />
                      <Button
                        icon="pi pi-trash"
                        label="Delete"
                        size="small"
                        outlined
                        severity="danger"
                        @click.stop="confirmDelete(event)"
                      />
                    </div>
                  </div>
                  <p class="text-surface-700 mb-2">
                    <i class="pi pi-calendar mr-2"></i>
                    {{ formatDateRange(event) }}
                    <span v-if="!event.allDay && event.startTime" class="ml-2">
                      <i class="pi pi-clock mr-1"></i>
                      {{ formatTimeRange(event) }}
                    </span>
                    <span v-if="event.allDay" class="ml-2 text-sm text-surface-500">
                      (All Day)
                    </span>
                  </p>
                  <div v-if="event.description" class="text-surface-600 line-clamp-2" v-html="event.description"></div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </template>
    </Card>

    <!-- Add/Edit Event Form -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-plus-circle text-[#6F8FAF]"></i>
          <span>{{ editingEvent ? 'Edit Event' : 'Add New Event' }}</span>
        </div>
      </template>
      <template #content>
        <form @submit.prevent="handleSubmit" class="flex flex-col gap-5">
          <!-- Event Name -->
          <div class="flex flex-col gap-2">
            <label for="event-name" class="font-semibold text-surface-700">
              Event Name <span class="text-red-500">*</span>
            </label>
            <InputText
              id="event-name"
              v-model="eventForm.name"
              placeholder="Chapter Meeting"
              :class="{ 'p-invalid': eventErrors.name }"
              class="w-full"
            />
            <small v-if="eventErrors.name" class="p-error">
              {{ eventErrors.name }}
            </small>
          </div>

          <!-- Date Range Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Start Date -->
            <div class="flex flex-col gap-2">
              <label for="event-start-date" class="font-semibold text-surface-700">
                Start Date <span class="text-red-500">*</span>
              </label>
              <input
                id="event-start-date"
                v-model="eventForm.startDate"
                type="date"
                :class="{ 'p-invalid': eventErrors.startDate }"
                class="w-full p-2 border border-surface-300 rounded-md hover:border-surface-400 focus:outline-none focus:ring-2 focus:ring-[#6F8FAF] focus:border-transparent"
              />
              <small v-if="eventErrors.startDate" class="p-error">
                {{ eventErrors.startDate }}
              </small>
            </div>

            <!-- End Date -->
            <div class="flex flex-col gap-2">
              <label for="event-end-date" class="font-semibold text-surface-700">
                End Date <span class="text-red-500">*</span>
              </label>
              <input
                id="event-end-date"
                v-model="eventForm.endDate"
                type="date"
                :class="{ 'p-invalid': eventErrors.endDate }"
                class="w-full p-2 border border-surface-300 rounded-md hover:border-surface-400 focus:outline-none focus:ring-2 focus:ring-[#6F8FAF] focus:border-transparent"
              />
              <small v-if="eventErrors.endDate" class="p-error">
                {{ eventErrors.endDate }}
              </small>
            </div>
          </div>

          <!-- All Day Toggle -->
          <div class="flex items-center gap-3">
            <input
              id="event-all-day"
              v-model="eventForm.allDay"
              type="checkbox"
              class="w-4 h-4 text-[#6F8FAF] border-surface-300 rounded focus:ring-[#6F8FAF]"
            />
            <label for="event-all-day" class="font-semibold text-surface-700 cursor-pointer">
              All Day Event
            </label>
          </div>

          <!-- Time Range Row (shown if not all day) -->
          <div v-if="!eventForm.allDay" class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Start Time -->
            <div class="flex flex-col gap-2">
              <label for="event-start-time" class="font-semibold text-surface-700">
                Start Time
              </label>
              <input
                id="event-start-time"
                v-model="eventForm.startTime"
                type="time"
                :class="{ 'p-invalid': eventErrors.startTime }"
                class="w-full p-2 border border-surface-300 rounded-md hover:border-surface-400 focus:outline-none focus:ring-2 focus:ring-[#6F8FAF] focus:border-transparent"
              />
              <small v-if="eventErrors.startTime" class="p-error">
                {{ eventErrors.startTime }}
              </small>
              <small class="text-surface-500 text-xs">
                Times are in Central Time (CT)
              </small>
            </div>

            <!-- End Time -->
            <div class="flex flex-col gap-2">
              <label for="event-end-time" class="font-semibold text-surface-700">
                End Time
              </label>
              <input
                id="event-end-time"
                v-model="eventForm.endTime"
                type="time"
                :class="{ 'p-invalid': eventErrors.endTime }"
                class="w-full p-2 border border-surface-300 rounded-md hover:border-surface-400 focus:outline-none focus:ring-2 focus:ring-[#6F8FAF] focus:border-transparent"
              />
              <small v-if="eventErrors.endTime" class="p-error">
                {{ eventErrors.endTime }}
              </small>
              <small class="text-surface-500 text-xs">
                Times are in Central Time (CT)
              </small>
            </div>
          </div>

          <!-- Description (Rich Text Editor) -->
          <div class="flex flex-col gap-2">
            <label for="event-description" class="font-semibold text-surface-700">
              Description
            </label>
            <Editor
              id="event-description"
              v-model="eventForm.description"
              editorStyle="height: 200px"
              :class="{ 'p-invalid': eventErrors.description }"
              :modules="editorModules"
            />
            <small v-if="eventErrors.description" class="p-error">
              {{ eventErrors.description }}
            </small>
            <small class="text-surface-500">
              Format the event description with rich text formatting
            </small>
          </div>

          <!-- Submit Buttons -->
          <div class="flex gap-3">
            <Button
              type="submit"
              :label="editingEvent ? 'Update Event' : 'Create Event'"
              icon="pi pi-check"
              :loading="isSubmitting"
              :disabled="isSubmitting || !isFormValid"
              :class="[
                'bg-[#6F8FAF] hover:bg-[#5A7A9F]',
                (isSubmitting || !isFormValid) && '!cursor-not-allowed'
              ]"
            />
            <Button
              v-if="editingEvent"
              label="Cancel"
              icon="pi pi-times"
              outlined
              @click="cancelEdit"
              :disabled="isSubmitting"
            />
          </div>

          <!-- Success Message -->
          <Message
            v-if="successMessage"
            severity="success"
            :closable="false"
            class="w-full"
          >
            {{ successMessage }}
          </Message>
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Editor from 'primevue/editor'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useCalendarEventStore } from '@/stores/calendarEvent'

const calendarEventStore = useCalendarEventStore()
const confirm = useConfirm()
const toast = useToast()

// Configure Editor toolbar to ensure proper list handling
const editorModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    ['link'],
    ['clean']
  ]
}

const editingEvent = ref(null)
const isSubmitting = ref(false)
const successMessage = ref('')

const eventForm = ref({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  allDay: false,
})

const eventErrors = ref({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
})

// Watch allDay to clear times when toggled
watch(() => eventForm.value.allDay, (allDay) => {
  if (allDay) {
    eventForm.value.startTime = ''
    eventForm.value.endTime = ''
  }
})

const sortedEvents = computed(() => {
  return [...calendarEventStore.events].sort((a, b) => {
    const dateA = new Date(a.startDate)
    const dateB = new Date(b.startDate)
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime()
    }
    // If same date, sort by time
    const timeA = a.startTime || '00:00'
    const timeB = b.startTime || '00:00'
    return timeA.localeCompare(timeB)
  })
})

const isFormValid = computed(() => {
  return (
    eventForm.value.name.trim() !== '' &&
    eventForm.value.startDate !== '' &&
    eventForm.value.endDate !== '' &&
    new Date(eventForm.value.endDate) >= new Date(eventForm.value.startDate)
  )
})

const formatDateRange = (event) => {
  // Parse dates as local time to avoid timezone issues
  // event.startDate and event.endDate are in YYYY-MM-DD format
  const parseLocalDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day) // month is 0-indexed
  }
  
  const start = parseLocalDate(event.startDate)
  const end = parseLocalDate(event.endDate)
  
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

const formatTimeRange = (event) => {
  if (!event.startTime) return ''
  if (event.endTime) {
    return `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`
  }
  return formatTime(event.startTime)
}

const formatTime = (time) => {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

const resetForm = () => {
  eventForm.value = {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    allDay: false,
  }
  eventErrors.value = {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
  }
  editingEvent.value = null
  successMessage.value = ''
}

const validateForm = () => {
  let isValid = true
  eventErrors.value = {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
  }

  if (!eventForm.value.name.trim()) {
    eventErrors.value.name = 'Event name is required'
    isValid = false
  }

  if (!eventForm.value.startDate) {
    eventErrors.value.startDate = 'Start date is required'
    isValid = false
  }

  if (!eventForm.value.endDate) {
    eventErrors.value.endDate = 'End date is required'
    isValid = false
  }

  if (eventForm.value.startDate && eventForm.value.endDate) {
    const startDate = new Date(eventForm.value.startDate)
    const endDate = new Date(eventForm.value.endDate)
    if (endDate < startDate) {
      eventErrors.value.endDate = 'End date must be on or after start date'
      isValid = false
    }
  }

  if (!eventForm.value.allDay) {
    if (eventForm.value.startDate && eventForm.value.endDate) {
      const startDate = new Date(eventForm.value.startDate)
      const endDate = new Date(eventForm.value.endDate)
      
      if (startDate.toDateString() === endDate.toDateString()) {
        // Same day - validate times
        if (eventForm.value.startTime && eventForm.value.endTime) {
          const [startHour, startMin] = eventForm.value.startTime.split(':').map(Number)
          const [endHour, endMin] = eventForm.value.endTime.split(':').map(Number)
          const startMinutes = startHour * 60 + startMin
          const endMinutes = endHour * 60 + endMin
          
          if (endMinutes <= startMinutes) {
            eventErrors.value.endTime = 'End time must be after start time'
            isValid = false
          }
        }
      }
    }
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  successMessage.value = ''

  try {
    const eventData = {
      name: eventForm.value.name.trim(),
      description: eventForm.value.description || undefined,
      startDate: eventForm.value.startDate,
      endDate: eventForm.value.endDate,
      startTime: eventForm.value.allDay ? undefined : (eventForm.value.startTime || undefined),
      endTime: eventForm.value.allDay ? undefined : (eventForm.value.endTime || undefined),
      allDay: eventForm.value.allDay,
    }

    if (editingEvent.value) {
      await calendarEventStore.update(editingEvent.value.id, eventData)
      successMessage.value = 'Event updated successfully!'
      toast.add({ severity: 'success', summary: 'Success', detail: 'Event updated successfully', life: 3000 })
    } else {
      await calendarEventStore.create(eventData)
      successMessage.value = 'Event created successfully!'
      toast.add({ severity: 'success', summary: 'Success', detail: 'Event created successfully', life: 3000 })
    }

    resetForm()
  } catch (error: any) {
    console.error('Error saving event:', error)
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error.response?.data?.message || 'Failed to save event', 
      life: 5000 
    })
  } finally {
    isSubmitting.value = false
  }
}

const editEvent = (event) => {
  editingEvent.value = event
  eventForm.value = {
    name: event.name,
    description: event.description || '',
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime || '',
    endTime: event.endTime || '',
    allDay: event.allDay,
  }
  // Scroll to form
  setTimeout(() => {
    const formCard = document.querySelector('.p-card:last-of-type')
    formCard?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}

const cancelEdit = () => {
  resetForm()
}

const confirmDelete = (event) => {
  confirm.require({
    message: `Are you sure you want to delete "${event.name}"?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await calendarEventStore.delete(event.id)
        toast.add({ severity: 'success', summary: 'Success', detail: 'Event deleted successfully', life: 3000 })
      } catch (error: any) {
        console.error('Error deleting event:', error)
        toast.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: error.response?.data?.message || 'Failed to delete event', 
          life: 5000 
        })
      }
    },
  })
}

onMounted(async () => {
  await calendarEventStore.fetchAll()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Hide the incorrectly rendered toolbar content in p-editor-toolbar */
/* The functional Quill toolbar is in the ql-toolbar.ql-snow div, so hide the duplicate ql-formats */
:deep(.p-editor-toolbar > span.ql-formats) {
  display: none !important;
}

/* Style lists in event descriptions */
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

:deep(ul ul),
:deep(ol ol),
:deep(ul ol),
:deep(ol ul) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

/* Force cursor-not-allowed on disabled submit button */
:deep(button[type="submit"]:disabled),
:deep(button[type="submit"].p-disabled) {
  cursor: not-allowed !important;
}
</style>

