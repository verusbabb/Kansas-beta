<template>
  <div class="bg-surface-0 min-h-screen">
    <ConfirmDialog />
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <div class="text-4xl md:text-5xl font-bold mb-4">Admin Panel</div>
        <div class="text-xl md:text-2xl text-gray-300 mb-6">
          Manage site content and configuration
        </div>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content with Side Navigation -->
    <div class="max-w-[90rem] mx-auto px-6 py-8">
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Side Navigation -->
        <div class="w-full lg:w-64 flex-shrink-0">
          <Card class="sticky top-4">
            <template #content>
              <nav class="flex flex-col gap-2">
                <template v-for="item in navItems" :key="item.id">
                  <!-- Regular menu item -->
                  <Button
                    v-if="!item.items"
                    @click="setActiveSection(item.id)"
                    :class="[
                      'w-full justify-start !p-3',
                      activeSection === item.id
                        ? 'bg-gray-200 text-[#6F8FAF] font-semibold'
                        : 'hover:bg-gray-100 text-surface-700'
                    ]"
                    text
                    :severity="activeSection === item.id ? 'secondary' : undefined"
                  >
                    <div class="flex items-center gap-3 w-full">
                      <i :class="[item.icon, 'text-lg flex-shrink-0']"></i>
                      <span class="text-left flex-1 leading-tight">{{ item.label }}</span>
                    </div>
                  </Button>

                  <!-- Settings dropdown menu -->
                  <div v-else class="flex flex-col">
                    <Button
                      @click="toggleSettingsMenu"
                      :class="[
                        'w-full justify-start !p-3',
                        isSettingsActive
                          ? 'bg-gray-200 text-[#6F8FAF] font-semibold'
                          : 'hover:bg-gray-100 text-surface-700'
                      ]"
                      text
                      :severity="isSettingsActive ? 'secondary' : undefined"
                    >
                      <div class="flex items-center gap-3 w-full">
                        <i :class="[item.icon, 'text-lg flex-shrink-0']"></i>
                        <span class="text-left flex-1 leading-tight">{{ item.label }}</span>
                        <i 
                          :class="[
                            'pi text-sm flex-shrink-0 transition-transform duration-200',
                            settingsMenuOpen ? 'pi-angle-up' : 'pi-angle-down'
                          ]"
                        ></i>
                      </div>
                    </Button>
                    <!-- Submenu items -->
                    <div
                      v-show="settingsMenuOpen"
                      class="flex flex-col gap-1 pl-4 mt-1 overflow-hidden transition-all duration-200"
                    >
                      <Button
                        v-for="subItem in item.items"
                        :key="subItem.id"
                        @click="setActiveSection(subItem.id)"
                        :class="[
                          'w-full justify-start !p-3',
                          activeSection === subItem.id
                            ? 'bg-gray-200 text-[#6F8FAF] font-semibold'
                            : 'hover:bg-gray-100 text-surface-700'
                        ]"
                        text
                        :severity="activeSection === subItem.id ? 'secondary' : undefined"
                      >
                        <div class="flex items-center gap-3 w-full">
                          <i :class="[subItem.icon, 'text-lg flex-shrink-0']"></i>
                          <span class="text-left flex-1 leading-tight">{{ subItem.label }}</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </template>
              </nav>
            </template>
          </Card>
        </div>

        <!-- Main Content Area -->
        <div class="flex-1">
          <!-- Newsletter Section -->
          <AdminNewsletters v-if="activeSection === 'newsletter'" />

          <!-- Member Section: add new people + full directory management -->
          <div v-if="activeSection === 'member'" class="flex flex-col gap-8">
            <AdminAddPerson />
            <MemberSearch variant="admin" />
          </div>

          <AdminExecTeam v-if="activeSection === 'exec-team'" />

          <!-- Users Section -->
          <AdminUsers v-if="activeSection === 'users'" />

          <!-- Calendar Events Section -->
          <div v-if="activeSection === 'alumni'">
            <AdminCalendarEvents />
          </div>

          <!-- Rush Events Section -->
          <Card v-if="activeSection === 'rush'" class="mb-6">
            <template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar text-[#6F8FAF]"></i>
                <span>Manage Rush Events</span>
              </div>
            </template>
            <template #content>
              <div class="flex flex-col gap-4">
                <div class="text-surface-600">
                  Add, edit, or remove rush events from the rush page.
                </div>
                <div class="text-center py-8 text-surface-500">
                  Rush events management coming soon...
                </div>
              </div>
            </template>
          </Card>

          <!-- Health Check Section -->
          <AdminHealthCheck v-if="activeSection === 'health'" />

          <!-- Settings Sub-sections -->
          <AdminHomePageImages v-if="activeSection === 'settings-home-images'" />

          <!-- Overview Section -->
          <AdminOverview v-if="activeSection === 'overview'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import { useRoute, useRouter } from 'vue-router'
import AdminNewsletters from '@/components/AdminNewsletters.vue'
import AdminUsers from '@/components/AdminUsers.vue'
import AdminCalendarEvents from '@/components/AdminCalendarEvents.vue'
import AdminHealthCheck from '@/components/AdminHealthCheck.vue'
import AdminOverview from '@/components/AdminOverview.vue'
import AdminExecTeam from '@/components/AdminExecTeam.vue'
import AdminHomePageImages from '@/components/AdminHomePageImages.vue'
import AdminAddPerson from '@/components/AdminAddPerson.vue'
import MemberSearch from '@/components/MemberSearch.vue'

const route = useRoute()
const router = useRouter()

// Initialize activeSection from URL query parameter or default to 'overview'
const validSectionIds = [
  'overview',
  'newsletter',
  'users',
  'member',
  'exec-team',
  'alumni',
  'rush',
  'health',
  'settings',
  'settings-home-images',
]
const sectionFromQuery = route.query.section
const normalizedSection =
  sectionFromQuery && typeof sectionFromQuery === 'string'
    ? sectionFromQuery === 'settings-exec-team'
      ? 'exec-team'
      : sectionFromQuery
    : null
const initialSection =
  normalizedSection && validSectionIds.includes(normalizedSection) ? normalizedSection : 'overview'
const activeSection = ref(initialSection)

// Settings menu state
const settingsMenuOpen = ref(false)

// Check if any settings sub-section is active
const isSettingsActive = computed(() => {
  return activeSection.value.startsWith('settings')
})

// Watch activeSection to open settings menu if a settings sub-section is active
watch(activeSection, (newSection) => {
  if (newSection.startsWith('settings')) {
    settingsMenuOpen.value = true
  }
}, { immediate: true })

// Function to toggle settings menu
const toggleSettingsMenu = () => {
  settingsMenuOpen.value = !settingsMenuOpen.value
}

// Function to set active section and update URL
const setActiveSection = (section: string) => {
  activeSection.value = section
  router.push({ query: { ...route.query, section } })
  
  // Open settings menu if selecting a settings sub-section
  if (section.startsWith('settings')) {
    settingsMenuOpen.value = true
  }
}

const navItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'pi pi-home'
  },
  {
    id: 'newsletter',
    label: 'Add Newsletter',
    icon: 'pi pi-book'
  },
  {
    id: 'users',
    label: 'Add/Manage Site Admins',
    icon: 'pi pi-users'
  },
  {
    id: 'member',
    label: 'Add/Manage Members and Parents',
    icon: 'pi pi-user-plus'
  },
  {
    id: 'exec-team',
    label: 'Add/Manage Exec Team',
    icon: 'pi pi-briefcase'
  },
  {
    id: 'alumni',
    label: 'Add/Manage Calendar',
    icon: 'pi pi-id-card'
  },
  {
    id: 'rush',
    label: 'Manage Rush Events',
    icon: 'pi pi-calendar'
  },
  {
    id: 'health',
    label: 'Check Database Connection',
    icon: 'pi pi-database'
  },
  {
    id: 'settings',
    label: 'Site Settings',
    icon: 'pi pi-cog',
    items: [
      {
        id: 'settings-home-images',
        label: 'Home Page Images',
        icon: 'pi pi-image'
      }
    ]
  }
]
</script>
