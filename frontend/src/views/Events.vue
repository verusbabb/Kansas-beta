<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Chapter Events</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Upcoming events and activities for Alpha Nu Chapter
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-12">
      <!-- Filter and View Toggle -->
      <div class="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div class="flex flex-col md:flex-row gap-4 items-center flex-1">
          <span class="p-input-icon-left flex-1 max-w-md">
            <i class="pi pi-search" />
            <InputText 
              v-model="searchQuery" 
              placeholder="Search events..." 
              class="w-full"
            />
          </span>
          <div class="w-full md:w-48">
            <Select 
              v-model="selectedCategory" 
              :options="categoryOptions" 
              placeholder="All Categories"
              class="w-full"
            />
          </div>
        </div>
        <div class="flex gap-2">
          <Button
            icon="pi pi-list"
            :class="{ 'bg-gray-500': viewMode === 'list', 'bg-gray-300': viewMode !== 'list' }"
            @click="viewMode = 'list'"
            outlined
          />
          <Button
            icon="pi pi-th-large"
            :class="{ 'bg-gray-500': viewMode === 'grid', 'bg-gray-300': viewMode !== 'grid' }"
            @click="viewMode = 'grid'"
            outlined
          />
        </div>
      </div>

      <!-- Events List -->
      <div v-if="filteredEvents.length > 0">
        <!-- List View -->
        <div v-if="viewMode === 'list'" class="flex flex-col gap-4">
          <Card 
            v-for="event in filteredEvents" 
            :key="event.id"
            class="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <template #content>
              <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-shrink-0">
                  <div class="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                    <i :class="event.icon" class="text-4xl text-[#6F8FAF]"></i>
                  </div>
                </div>
                <div class="flex-1">
                  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <h3 class="text-xl font-bold text-surface-900">{{ event.title }}</h3>
                    <Badge :value="event.category" :severity="getCategorySeverity(event.category)" />
                  </div>
                  <p class="text-surface-700 mb-3">{{ event.description }}</p>
                  <div class="flex flex-wrap gap-4 text-sm text-surface-600">
                    <span class="flex items-center gap-1">
                      <i class="pi pi-calendar"></i>
                      {{ formatDate(event.date) }}
                    </span>
                    <span v-if="event.time" class="flex items-center gap-1">
                      <i class="pi pi-clock"></i>
                      {{ event.time }}
                    </span>
                    <span v-if="event.location" class="flex items-center gap-1">
                      <i class="pi pi-map-marker"></i>
                      {{ event.location }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Grid View -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            v-for="event in filteredEvents" 
            :key="event.id"
            class="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <template #header>
              <div class="bg-gray-200 h-32 flex items-center justify-center">
                <i :class="event.icon" class="text-5xl text-[#6F8FAF]"></i>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-2 mb-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-bold text-surface-900">{{ event.title }}</h3>
                  <Badge :value="event.category" :severity="getCategorySeverity(event.category)" />
                </div>
                <p class="text-sm text-surface-700 line-clamp-2">{{ event.description }}</p>
              </div>
              <div class="flex flex-col gap-2 text-sm text-surface-600">
                <span class="flex items-center gap-1">
                  <i class="pi pi-calendar"></i>
                  {{ formatDate(event.date) }}
                </span>
                <span v-if="event.time" class="flex items-center gap-1">
                  <i class="pi pi-clock"></i>
                  {{ event.time }}
                </span>
                <span v-if="event.location" class="flex items-center gap-1">
                  <i class="pi pi-map-marker"></i>
                  {{ event.location }}
                </span>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <i class="pi pi-calendar-times text-6xl text-surface-400 mb-4"></i>
        <h3 class="text-2xl font-bold text-surface-700 mb-2">No Events Found</h3>
        <p class="text-surface-600">Try adjusting your search or filters.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import Card from 'primevue/card'
  import InputText from 'primevue/inputtext'
  import Select from 'primevue/select'
  import Button from 'primevue/button'
  import Badge from 'primevue/badge'
  import { useEventStore } from '@/stores/event'

  const eventStore = useEventStore()
  const events = ref([])
  const searchQuery = ref('')
  const selectedCategory = ref(null)
  const viewMode = ref('grid')

  const categoryOptions = [
    { label: 'All Categories', value: null },
    { label: 'Social', value: 'Social' },
    { label: 'Service', value: 'Service' },
    { label: 'Academic', value: 'Academic' },
    { label: 'Rush', value: 'Rush' },
    { label: 'Alumni', value: 'Alumni' },
    { label: 'Other', value: 'Other' }
  ]

  onMounted(async () => {
    await eventStore.fetchEvents()
    events.value = eventStore.events
  })

  const filteredEvents = computed(() => {
    let filtered = [...events.value]

    if (searchQuery.value) {
      const search = searchQuery.value.toLowerCase()
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(search) ||
        e.description?.toLowerCase().includes(search) ||
        e.location?.toLowerCase().includes(search)
      )
    }

    if (selectedCategory.value) {
      filtered = filtered.filter(e => e.category === selectedCategory.value)
    }

    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date))
  })

  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getCategorySeverity = (category) => {
    const severityMap = {
      'Social': 'info',
      'Service': 'success',
      'Academic': 'warning',
      'Rush': 'help',
      'Alumni': 'secondary',
      'Other': null
    }
    return severityMap[category] || null
  }
</script>

<style scoped>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Ensure search input and select dropdown have matching heights and alignment */
  :deep(.p-inputtext) {
    height: 2.5rem;
    box-sizing: border-box;
  }

  :deep(.p-select) {
    height: 2.5rem;
    box-sizing: border-box;
  }

  :deep(.p-select .p-select-label) {
    height: 2.5rem;
    line-height: 2.5rem;
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    box-sizing: border-box;
  }

  /* Ensure the Select input wrapper aligns properly */
  :deep(.p-select .p-select-trigger) {
    height: 2.5rem;
    display: flex;
    align-items: center;
    box-sizing: border-box;
  }

  /* Ensure both input and select are aligned at the same baseline */
  :deep(.p-input-icon-left) {
    display: flex;
    align-items: center;
  }

  /* Add spacing between search icon and input */
  :deep(.p-input-icon-left .pi) {
    margin-right: 0.75rem;
  }

  :deep(.p-input-icon-left .p-inputtext) {
    padding-left: 0.5rem;
  }

  /* Center the placeholder text in Select */
  :deep(.p-select .p-select-label.p-placeholder) {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
</style>

