<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <div class="text-4xl md:text-5xl font-bold mb-4">People</div>
        <div class="text-xl md:text-2xl text-gray-300 mb-6">
          Members, Alumni, Advisors, and Leadership Teams
        </div>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content with Side Navigation -->
    <div class="max-w-7xl mx-auto px-6 py-8">
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Side Navigation -->
        <div class="w-full lg:w-64 flex-shrink-0">
          <Card class="sticky top-4">
            <template #content>
              <nav class="flex flex-col gap-2">
                <Button
                  v-for="item in navItems"
                  :key="item.id"
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
              </nav>
            </template>
          </Card>
        </div>

        <!-- Main Content Area -->
        <div class="flex-1">
          <!-- Exec Team Section -->
          <ExecTeam v-if="activeSection === 'exec-team'" />

          <!-- Member Search Section -->
          <MemberSearch v-if="activeSection === 'member-search'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import { useRoute, useRouter } from 'vue-router'
import ExecTeam from '@/components/ExecTeam.vue'
import MemberSearch from '@/components/MemberSearch.vue'

const route = useRoute()
const router = useRouter()

// Initialize activeSection from URL query parameter or default to 'exec-team'
const validSectionIds = ['exec-team', 'member-search']
const sectionFromQuery = route.query.section
const initialSection = (sectionFromQuery && typeof sectionFromQuery === 'string' && validSectionIds.includes(sectionFromQuery))
  ? sectionFromQuery
  : 'exec-team'
const activeSection = ref(initialSection)

// Function to set active section and update URL
const setActiveSection = (section: string) => {
  activeSection.value = section
  router.push({ query: { ...route.query, section } })
}

const navItems = [
  {
    id: 'exec-team',
    label: 'Exec Team',
    icon: 'pi pi-users'
  },
  {
    id: 'member-search',
    label: 'Member Search',
    icon: 'pi pi-search'
  }
]
</script>
