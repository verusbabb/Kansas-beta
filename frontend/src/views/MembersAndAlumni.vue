<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">People</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Members, Alumni, Advisors, and Leadership Teams
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-12">
      <!-- Tabs for Active Members and Alumni -->
      <TabView>
        <TabPanel header="Active Members">
          <div class="mt-6">
            <!-- Search and Filter -->
            <div class="mb-6 flex flex-col md:flex-row gap-4 items-center">
              <span class="p-input-icon-left flex-1">
                <i class="pi pi-search" />
                <InputText 
                  v-model="activeSearch" 
                  placeholder="Search members..." 
                  class="w-full"
                />
              </span>
              <div class="w-full md:w-48">
                <Select 
                  v-model="activeYearFilter" 
                  :options="yearOptions" 
                  placeholder="Filter by Year"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Members Grid -->
            <div v-if="filteredActiveMembers.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card 
                v-for="member in filteredActiveMembers" 
                :key="member.id"
                class="text-center"
              >
                <template #content>
                  <div class="flex flex-col items-center">
                    <Avatar 
                      :image="member.image" 
                      :label="member.initials"
                      shape="circle" 
                      size="large"
                      class="mb-4"
                    />
                    <h3 class="text-xl font-bold mb-1">{{ member.name }}</h3>
                    <p class="text-surface-600 mb-2">{{ member.position || 'Brother' }}</p>
                    <p class="text-sm text-surface-500">Class of {{ member.graduationYear }}</p>
                    <div v-if="member.major" class="text-sm text-surface-600 mt-2">
                      <i class="pi pi-book mr-1"></i>{{ member.major }}
                    </div>
                  </div>
                </template>
              </Card>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-16">
              <i class="pi pi-users text-6xl text-surface-400 mb-4"></i>
              <h3 class="text-2xl font-bold text-surface-700 mb-2">No Members Found</h3>
              <p class="text-surface-600">Try adjusting your search or filters.</p>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Alumni">
          <div class="mt-6">
            <!-- Search and Filter -->
            <div class="mb-6 flex flex-col md:flex-row gap-4 items-center">
              <span class="p-input-icon-left flex-1">
                <i class="pi pi-search" />
                <InputText 
                  v-model="alumniSearch" 
                  placeholder="Search alumni..." 
                  class="w-full"
                />
              </span>
              <div class="w-full md:w-48">
                <Select 
                  v-model="alumniYearFilter" 
                  :options="yearOptions" 
                  placeholder="Filter by Graduation Year"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Alumni Grid -->
            <div v-if="filteredAlumni.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card 
                v-for="alumnus in filteredAlumni" 
                :key="alumnus.id"
                class="text-center"
              >
                <template #content>
                  <div class="flex flex-col items-center">
                    <Avatar 
                      :image="alumnus.image" 
                      :label="alumnus.initials"
                      shape="circle" 
                      size="large"
                      class="mb-4"
                    />
                    <h3 class="text-lg font-bold mb-1">{{ alumnus.name }}</h3>
                    <p class="text-sm text-surface-600 mb-2">Class of {{ alumnus.graduationYear }}</p>
                    <div v-if="alumnus.profession" class="text-sm text-surface-500">
                      <i class="pi pi-briefcase mr-1"></i>{{ alumnus.profession }}
                    </div>
                  </div>
                </template>
              </Card>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-16">
              <i class="pi pi-users text-6xl text-surface-400 mb-4"></i>
              <h3 class="text-2xl font-bold text-surface-700 mb-2">No Alumni Found</h3>
              <p class="text-surface-600">Try adjusting your search or filters.</p>
            </div>
          </div>
        </TabPanel>
      </TabView>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import Card from 'primevue/card'
  import TabView from 'primevue/tabview'
  import TabPanel from 'primevue/tabpanel'
  import InputText from 'primevue/inputtext'
  import Select from 'primevue/select'
  import Avatar from 'primevue/avatar'
  import { useMemberStore } from '@/stores/member'

  const memberStore = useMemberStore()
  const activeMembers = ref([])
  const alumni = ref([])
  const activeSearch = ref('')
  const alumniSearch = ref('')
  const activeYearFilter = ref(null)
  const alumniYearFilter = ref(null)

  const currentYear = new Date().getFullYear()
  const yearOptions = ref(
    Array.from({ length: 20 }, (_, i) => currentYear - i)
      .map(year => ({ label: year.toString(), value: year }))
  )

  onMounted(async () => {
    // Load members from store (will connect to backend later)
    await memberStore.fetchMembers()
    activeMembers.value = memberStore.activeMembers
    alumni.value = memberStore.alumni
  })

  const filteredActiveMembers = computed(() => {
    let filtered = [...activeMembers.value]

    if (activeSearch.value) {
      const search = activeSearch.value.toLowerCase()
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(search) ||
        m.major?.toLowerCase().includes(search) ||
        m.position?.toLowerCase().includes(search)
      )
    }

    if (activeYearFilter.value) {
      filtered = filtered.filter(m => m.graduationYear === activeYearFilter.value)
    }

    return filtered
  })

  const filteredAlumni = computed(() => {
    let filtered = [...alumni.value]

    if (alumniSearch.value) {
      const search = alumniSearch.value.toLowerCase()
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(search) ||
        a.profession?.toLowerCase().includes(search)
      )
    }

    if (alumniYearFilter.value) {
      filtered = filtered.filter(a => a.graduationYear === alumniYearFilter.value)
    }

    return filtered
  })
</script>

<style scoped>
  :deep(.p-tabview-nav) {
    background: transparent;
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

