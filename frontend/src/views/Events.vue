<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Chapter Calendar</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Upcoming calendar events and activities for Alpha Nu Chapter
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto mb-4"></div>
        <p class="text-sm md:text-base text-gray-200 font-medium">
          All event times are in Central Time (CT)
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-12">
      <!-- View Toggle -->
      <div class="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div class="flex gap-2">
          <Button
            icon="pi pi-calendar"
            label="Month"
            :class="{ 'bg-[#6F8FAF] text-white': view === 'month', 'bg-gray-300': view !== 'month' }"
            @click="view = 'month'"
            outlined
          />
          <Button
            icon="pi pi-calendar-week"
            label="Week"
            :class="{ 'bg-[#6F8FAF] text-white': view === 'week', 'bg-gray-300': view !== 'week' }"
            @click="view = 'week'"
            outlined
          />
          <Button
            icon="pi pi-list"
            label="List"
            :class="{ 'bg-[#6F8FAF] text-white': view === 'list', 'bg-gray-300': view !== 'list' }"
            @click="view = 'list'"
            outlined
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="calendarEventStore.loading" class="text-center py-16">
        <i class="pi pi-spin pi-spinner text-4xl text-[#6F8FAF]"></i>
        <p class="mt-4 text-surface-600">Loading calendar events...</p>
      </div>

      <!-- Month View -->
      <Card v-else-if="view === 'month'" class="calendar-month">
        <template #content>
          <!-- Calendar Header with Navigation -->
          <div class="flex items-center justify-between mb-6">
            <Button
              icon="pi pi-chevron-left"
              @click="previousMonth"
              outlined
              class="text-[#6F8FAF] border-[#6F8FAF]"
            />
            <h2 class="text-2xl font-bold text-surface-900">{{ currentMonthYear }}</h2>
            <Button
              icon="pi pi-chevron-right"
              @click="nextMonth"
              outlined
              class="text-[#6F8FAF] border-[#6F8FAF]"
            />
          </div>

          <!-- Days of Week Header -->
          <div class="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            <div
              v-for="day in daysOfWeek"
              :key="day"
              class="text-center font-semibold text-sm md:text-base text-surface-700 py-2"
            >
              {{ day }}
            </div>
          </div>

          <!-- Calendar Grid -->
          <div class="grid grid-cols-7 gap-1 md:gap-2">
            <!-- Empty cells for days before month starts -->
            <div
              v-for="n in startOffset"
              :key="`empty-${n}`"
              class="aspect-square"
            ></div>

            <!-- Calendar days -->
            <div
              v-for="day in daysInMonth"
              :key="day"
              @click="selectDate(day)"
              :class="[
                'aspect-square border rounded-lg p-1 md:p-2 cursor-pointer transition-colors',
                'hover:bg-gray-100',
                isToday(day) && 'border-[#6F8FAF] border-2',
                hasEvents(day) && 'bg-blue-50',
                selectedDate === day && 'bg-[#6F8FAF] bg-opacity-20',
              ]"
            >
              <div class="flex flex-col h-full">
                <div
                  :class="[
                    'text-sm md:text-base font-medium mb-1',
                    isToday(day) && 'text-[#6F8FAF] font-bold',
                    selectedDate === day && 'text-[#6F8FAF] font-bold',
                  ]"
                >
                  {{ day }}
                </div>
                <!-- Event names -->
                <div v-if="getEventsForDay(day).length > 0" class="flex flex-col gap-0.5 mt-auto overflow-hidden">
                  <div
                    v-for="(event, idx) in getEventsForDay(day).slice(0, 2)"
                    :key="event.id"
                    :class="[
                      'text-xs truncate px-1 py-0.5 rounded',
                      'bg-[#6F8FAF] text-white',
                      'hover:bg-[#5A7A9F] cursor-pointer'
                    ]"
                    :title="event.name"
                    @click.stop="showEventDetails(event)"
                  >
                    {{ event.name }}
                  </div>
                  <div
                    v-if="getEventsForDay(day).length > 2"
                    class="text-xs text-[#6F8FAF] font-semibold px-1"
                  >
                    +{{ getEventsForDay(day).length - 2 }} more
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Week View -->
      <div v-else-if="view === 'week'">
        <!-- Week Navigation -->
        <div class="flex items-center justify-between mb-6">
          <Button
            icon="pi pi-chevron-left"
            @click="previousWeek"
            outlined
            class="text-[#6F8FAF] border-[#6F8FAF]"
          />
          <h2 class="text-2xl font-bold text-surface-900">{{ weekRange }}</h2>
          <Button
            icon="pi pi-chevron-right"
            @click="nextWeek"
            outlined
            class="text-[#6F8FAF] border-[#6F8FAF]"
          />
        </div>
        
        <div class="overflow-x-auto">
          <div class="flex gap-2 min-w-max pb-4">
          <Card
            v-for="day in weekDays"
            :key="day.date"
            class="w-64 md:w-80 flex-shrink-0"
          >
            <template #title>
              <div class="flex flex-col">
                <span class="text-sm text-surface-500">{{ day.dayName }}</span>
                <span class="text-lg font-bold">{{ day.dayNumber }}</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-2">
                <div
                  v-for="event in day.events"
                  :key="event.id"
                  @click="showEventDetails(event)"
                  class="p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors border-l-4 border-[#6F8FAF]"
                >
                  <div class="font-semibold text-sm text-surface-900">{{ event.name }}</div>
                  <div v-if="!event.allDay && event.startTime" class="text-xs text-surface-600 mt-1">
                    <i class="pi pi-clock mr-1"></i>
                    {{ formatTime(event.startTime) }}
                    <span v-if="event.endTime"> - {{ formatTime(event.endTime) }}</span>
                    <span class="text-surface-500"> (CT)</span>
                  </div>
                </div>
                <div v-if="day.events.length === 0" class="text-center py-4 text-surface-400 text-sm">
                  No events
                </div>
              </div>
            </template>
          </Card>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else-if="view === 'list'" class="flex flex-col gap-4">
        <Card
          v-for="event in sortedEvents"
          :key="event.id"
          class="cursor-pointer hover:shadow-lg transition-shadow"
          @click="showEventDetails(event)"
        >
          <template #content>
            <div class="flex flex-col md:flex-row gap-4">
              <div class="flex-shrink-0">
                <div class="w-16 h-16 bg-gradient-to-br from-[#5A7A9F] to-[#6F8FAF] rounded-lg flex items-center justify-center text-white">
                  <i class="pi pi-calendar text-2xl"></i>
                </div>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold mb-2 text-surface-900">{{ event.name }}</h3>
                <p class="text-surface-700 mb-2">
                  <i class="pi pi-calendar mr-2"></i>
                  {{ formatDateRange(event) }}
                  <span v-if="!event.allDay && event.startTime" class="ml-2">
                    <i class="pi pi-clock mr-1"></i>
                    {{ formatTimeRange(event) }} <span class="text-surface-500 text-sm">(CT)</span>
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

        <div v-if="sortedEvents.length === 0" class="text-center py-16">
          <i class="pi pi-calendar-times text-6xl text-surface-400 mb-4"></i>
          <h3 class="text-2xl font-bold text-surface-700 mb-2">No Calendar Events Found</h3>
          <p class="text-surface-600">Try adjusting your search or filters for calendar events.</p>
        </div>
      </div>

      <!-- Event Details Dialog -->
      <Dialog
        v-model:visible="showEventDialog"
        :header="selectedEvent?.name"
        :modal="true"
        :style="{ width: '90vw', maxWidth: '600px' }"
      >
        <div v-if="selectedEvent" class="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
                <p class="text-surface-700 mb-2">
                  <i class="pi pi-calendar mr-2"></i>
                  {{ formatDateRange(selectedEvent) }}
                </p>
                <p v-if="!selectedEvent.allDay && selectedEvent.startTime" class="text-surface-700 mb-2">
                  <i class="pi pi-clock mr-2"></i>
                  {{ formatTimeRange(selectedEvent) }} <span class="text-surface-500 text-sm">(CT)</span>
                </p>
            <p v-if="selectedEvent.allDay" class="text-surface-500 text-sm">
              All Day Event
            </p>
          </div>
          <div v-if="selectedEvent.description" class="text-surface-700" v-html="selectedEvent.description"></div>
        </div>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useCalendarEventStore } from '@/stores/calendarEvent'

const calendarEventStore = useCalendarEventStore()

const view = ref<'month' | 'week' | 'list'>('list')
const currentDate = ref(new Date())
// Initialize currentWeekStart to the start of the current week (Sunday)
const getCurrentWeekStart = () => {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0) // Reset time to avoid timezone issues
  return weekStart
}
const currentWeekStart = ref(getCurrentWeekStart())
const selectedDate = ref<number | null>(null)
const selectedEvent = ref(null)
const showEventDialog = ref(false)

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  return new Date(year, month + 1, 0).getDate()
})

const startOffset = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  return firstDay
})

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value)
    date.setDate(currentWeekStart.value.getDate() + i)
    const dateString = date.toISOString().split('T')[0]
    
    days.push({
      date: dateString,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      events: getEventsForDate(dateString),
    })
  }
  return days
})

const weekRange = computed(() => {
  const start = new Date(currentWeekStart.value)
  const end = new Date(currentWeekStart.value)
  end.setDate(start.getDate() + 6)
  
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  
  return `${startStr} - ${endStr}`
})

const sortedEvents = computed(() => {
  return [...calendarEventStore.upcomingEvents].sort((a, b) => {
    const dateA = new Date(a.startDate)
    const dateB = new Date(b.startDate)
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime()
    }
    const timeA = a.startTime || '00:00'
    const timeB = b.startTime || '00:00'
    return timeA.localeCompare(timeB)
  })
})

const isToday = (day) => {
  const today = new Date()
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  return (
    today.getDate() === day &&
    today.getMonth() === month &&
    today.getFullYear() === year
  )
}

const hasEvents = (day) => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return getEventsForDate(dateString).length > 0
}

const getEventsForDay = (day) => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return getEventsForDate(dateString)
}

const getEventsForDate = (dateString) => {
  // Compare date strings directly (YYYY-MM-DD) to avoid timezone issues
  return calendarEventStore.upcomingEvents.filter((event) => {
    // event.startDate and event.endDate are already in YYYY-MM-DD format
    return dateString >= event.startDate && dateString <= event.endDate
  })
}

const selectDate = (day) => {
  selectedDate.value = day
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const events = getEventsForDate(dateString)
  
  if (events.length > 0) {
    if (events.length === 1) {
      showEventDetails(events[0])
    } else {
      // Show first event, or could show a list
      showEventDetails(events[0])
    }
  }
}

const previousMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentDate.value = newDate
  selectedDate.value = null
}

const nextMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  currentDate.value = newDate
  selectedDate.value = null
}

const previousWeek = () => {
  const newWeekStart = new Date(currentWeekStart.value)
  newWeekStart.setDate(newWeekStart.getDate() - 7)
  currentWeekStart.value = newWeekStart
}

const nextWeek = () => {
  const newWeekStart = new Date(currentWeekStart.value)
  newWeekStart.setDate(newWeekStart.getDate() + 7)
  currentWeekStart.value = newWeekStart
}

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

const showEventDetails = (event) => {
  selectedEvent.value = event
  showEventDialog.value = true
}

onMounted(async () => {
  await calendarEventStore.fetchUpcoming()
})
</script>

<style scoped>
.calendar-month {
  @apply w-full;
}

/* Mobile: Smaller calendar cells */
@media (max-width: 768px) {
  .calendar-month {
    font-size: 0.875rem;
  }
  
  .grid-cols-7 {
    gap: 0.25rem;
  }
}

/* Desktop: More spacious */
@media (min-width: 768px) {
  .calendar-month {
    font-size: 1rem;
  }
  
  .grid-cols-7 {
    gap: 0.5rem;
  }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
</style>
