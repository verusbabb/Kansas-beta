<template>
  <Card class="mb-6">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-search text-[#6F8FAF]"></i>
        <span>Member Search</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-6">
        <div class="text-surface-600">
          Search for members and alumni by name, year, major, or other criteria.
        </div>

        <!-- Search and Filter Section -->
        <div class="flex flex-col md:flex-row gap-4">
          <span class="p-input-icon-left flex-1">
            <i class="pi pi-search" />
            <InputText
              v-model="searchQuery"
              placeholder="Search by name, major, position..."
              class="w-full"
            />
          </span>
          <Select
            v-model="yearFilter"
            :options="yearOptions"
            placeholder="Filter by Year"
            class="w-full md:w-48"
          />
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            v-for="member in searchResults"
            :key="member.id"
            class="hover:shadow-lg transition-shadow"
          >
            <template #content>
              <div class="flex flex-col items-center text-center">
                <Avatar
                  :image="member.image"
                  :label="member.initials"
                  shape="circle"
                  size="large"
                  class="mb-4"
                />
                <h3 class="text-lg font-bold mb-1">{{ member.name }}</h3>
                <p v-if="member.position" class="text-surface-600 mb-2">{{ member.position }}</p>
                <p class="text-sm text-surface-500">Class of {{ member.graduationYear }}</p>
                <div v-if="member.major" class="text-sm text-surface-600 mt-2">
                  <i class="pi pi-book mr-1"></i>{{ member.major }}
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Empty State -->
        <div v-else-if="searchQuery || yearFilter" class="text-center py-16">
          <i class="pi pi-search text-6xl text-surface-400 mb-4"></i>
          <h3 class="text-2xl font-bold text-surface-700 mb-2">No Results Found</h3>
          <p class="text-surface-600">Try adjusting your search criteria.</p>
        </div>

        <!-- Initial State -->
        <div v-else class="text-center py-16">
          <i class="pi pi-search text-6xl text-surface-400 mb-4"></i>
          <h3 class="text-2xl font-bold text-surface-700 mb-2">Search Members</h3>
          <p class="text-surface-600">Enter a search term or select a filter to find members.</p>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Avatar from 'primevue/avatar'
import { useMemberStore } from '@/stores/member'

const memberStore = useMemberStore()

const searchQuery = ref('')
const yearFilter = ref(null)

const currentYear = new Date().getFullYear()
const yearOptions = ref(
  Array.from({ length: 20 }, (_, i) => currentYear - i)
    .map(year => ({ label: year.toString(), value: year }))
)

// Placeholder search results - will be replaced with actual search logic
const searchResults = computed(() => {
  // TODO: Implement actual search logic using memberStore
  return []
})
</script>

