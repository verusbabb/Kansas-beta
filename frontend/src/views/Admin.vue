<template>
  <div class="bg-surface-0 min-h-screen">
    <ConfirmDialog />
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <div class="text-4xl md:text-5xl font-bold mb-4">Admin Panel</div>
        <div class="text-xl md:text-2xl text-gray-300 mb-6">
          {{
            authStore.isAdmin
              ? 'Manage site content and configuration'
              : 'Manage site content, Rush page, and related sections'
          }}
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
                      'w-full justify-start !p-3 border-l-4',
                      activeSection === item.id
                        ? '!text-[#6F8FAF] font-bold border-[#6F8FAF]'
                        : 'hover:bg-gray-100 !text-surface-800 font-medium border-transparent'
                    ]"
                    text
                    :severity="activeSection === item.id ? 'secondary' : undefined"
                  >
                    <div class="flex items-center gap-3 w-full">
                      <i :class="[item.icon, 'text-lg flex-shrink-0 text-[#6F8FAF]']"></i>
                      <span class="text-left flex-1 leading-tight">{{ item.label }}</span>
                    </div>
                  </Button>

                  <!-- Nav group with sub-items -->
                  <div v-else class="flex flex-col">
                    <Button
                      @click="toggleNavGroup(item.id)"
                      :class="[
                        'w-full justify-start !p-3 border-l-4',
                        navGroupIsHighlighted(item)
                          ? '!text-[#6F8FAF] font-bold border-[#6F8FAF]'
                          : 'hover:bg-gray-100 !text-surface-800 font-medium border-transparent'
                      ]"
                      text
                      :severity="navGroupIsHighlighted(item) ? 'secondary' : undefined"
                    >
                      <div class="flex items-center gap-3 w-full">
                        <i :class="[item.icon, 'text-lg flex-shrink-0 text-[#6F8FAF]']"></i>
                        <span class="text-left flex-1 leading-tight">{{ item.label }}</span>
                        <i 
                          :class="[
                            'pi text-sm flex-shrink-0 transition-transform duration-200',
                            navGroupIsOpen(item.id) ? 'pi-angle-up' : 'pi-angle-down'
                          ]"
                        ></i>
                      </div>
                    </Button>
                    <!-- Submenu items -->
                    <div
                      v-show="navGroupIsOpen(item.id)"
                      class="flex flex-col gap-1 pl-4 mt-1 overflow-hidden transition-all duration-200"
                    >
                      <Button
                        v-for="subItem in (item.items ?? [])"
                        :key="subItem.id"
                        @click="setActiveSection(subItem.id)"
                        :class="[
                          'w-full justify-start !p-3 border-l-4',
                          activeSection === subItem.id
                            ? '!text-[#6F8FAF] font-bold border-[#6F8FAF]'
                            : 'hover:bg-gray-100 !text-surface-800 font-medium border-transparent'
                        ]"
                        text
                        :severity="activeSection === subItem.id ? 'secondary' : undefined"
                      >
                        <div class="flex items-center gap-3 w-full">
                          <i :class="[subItem.icon, 'text-lg flex-shrink-0 text-[#6F8FAF]']"></i>
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
            <AdminMemberFamilyImport />
            <MemberSearch variant="admin" />
          </div>

          <!-- Pennington Upload Section -->
          <AdminBulkImportPeople v-if="activeSection === 'pennington'" />

          <AdminExecTeam v-if="activeSection === 'exec-team'" />

          <AdminHouseMom v-if="activeSection === 'house-mom'" />

          <!-- Users Section -->
          <AdminUsers v-if="activeSection === 'users'" />

          <!-- Calendar Events Section -->
          <div v-if="activeSection === 'alumni'">
            <AdminCalendarEvents />
          </div>

          <!-- Rush page widgets ("Why Rush?") -->
          <AdminRushWidgets v-if="activeSection === 'rush-widgets'" />

          <!-- Rush timeline events (public /rush timeline) -->
          <AdminRushEvents v-if="activeSection === 'rush'" />

          <!-- Rush photos gallery -->
          <AdminRushPhotos v-if="activeSection === 'rush-photos'" />

          <!-- Rush CRM — prospect pipeline -->
          <AdminRushCrm v-if="activeSection === 'rush-crm'" />

          <!-- Email Campaigns — audience selection + SendGrid sends -->
          <AdminEmailCampaigns v-if="activeSection === 'email-campaigns'" />

          <!-- History page images -->
          <AdminHistoryImages v-if="activeSection === 'history-images'" />

          <!-- Woogle Re-index Section -->
          <AdminWoogleIndex v-if="activeSection === 'woogle-index'" />

          <!-- Health Check Section -->
          <AdminHealthCheck v-if="activeSection === 'health'" />

          <!-- Manage Home Page: Home Page Images -->
          <AdminHomePageImages v-if="activeSection === 'settings-home-images'" />

          <!-- Overview Section -->
          <AdminOverview v-if="activeSection === 'overview'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  adminDiscardAllUnsaved,
  adminHasUnsavedChanges,
} from '@/utils/adminUnsavedRegistry'
import AdminNewsletters from '@/components/AdminNewsletters.vue'
import AdminCalendarEvents from '@/components/AdminCalendarEvents.vue'
import AdminUsers from '@/components/AdminUsers.vue'
import AdminRushEvents from '@/components/AdminRushEvents.vue'
import AdminRushWidgets from '@/components/AdminRushWidgets.vue'
import AdminRushPhotos from '@/components/AdminRushPhotos.vue'
import AdminHealthCheck from '@/components/AdminHealthCheck.vue'
import AdminWoogleIndex from '@/components/AdminWoogleIndex.vue'
import AdminOverview from '@/components/AdminOverview.vue'
import AdminExecTeam from '@/components/AdminExecTeam.vue'
import AdminHouseMom from '@/components/AdminHouseMom.vue'
import AdminHomePageImages from '@/components/AdminHomePageImages.vue'
import AdminHistoryImages from '@/components/AdminHistoryImages.vue'
import AdminAddPerson from '@/components/AdminAddPerson.vue'
import AdminBulkImportPeople from '@/components/AdminBulkImportPeople.vue'
import AdminMemberFamilyImport from '@/components/AdminMemberFamilyImport.vue'
import AdminRushCrm from '@/components/AdminRushCrm.vue'
import AdminEmailCampaigns from '@/components/AdminEmailCampaigns.vue'
import MemberSearch from '@/components/MemberSearch.vue'
import { useAuthStore } from '@/stores/auth'

interface NavItem {
  id: string
  label: string
  icon: string
  items?: readonly { id: string; label: string; icon: string }[]
}

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const authStore = useAuthStore()

/** Rush-only roles (member, rush_chair): the Admin panel shows just the Rush CRM. */
const isRushOnlyRole = computed(() => authStore.isMember || authStore.isRushChair)

const validSectionIds = [
  'overview',
  'newsletter',
  'users',
  'member',
  'exec-team',
  'house-mom',
  'alumni',
  'rush-widgets',
  'rush',
  'rush-photos',
  'health',
  'settings-home-images',
  'history-images',
  'woogle-index',
  'pennington',
  'rush-crm',
  'email-campaigns',
] as const

/** Editor-accessible content sections (home images, calendar, newsletters). */
const siteContentSectionIds = ['settings-home-images', 'alumni', 'newsletter'] as const

/** Rush page tooling — collapsible nav group. */
const rushPageSectionIds = ['rush-widgets', 'rush', 'rush-photos', 'rush-crm'] as const

/** History page tooling — collapsible nav group. */
const historyPageSectionIds = ['history-images'] as const

/** Top-level sections editors may manage alongside site content. */
const editorTopLevelSectionIds = ['exec-team', 'house-mom'] as const

type SiteContentSectionId = (typeof siteContentSectionIds)[number]
type RushPageSectionId = (typeof rushPageSectionIds)[number]
type HistoryPageSectionId = (typeof historyPageSectionIds)[number]

function isSiteContentSection(section: string): section is SiteContentSectionId {
  return siteContentSectionIds.includes(section as SiteContentSectionId)
}

function isRushPageSection(section: string): section is RushPageSectionId {
  return rushPageSectionIds.includes(section as RushPageSectionId)
}

function isHistoryPageSection(section: string): section is HistoryPageSectionId {
  return historyPageSectionIds.includes(section as HistoryPageSectionId)
}

/** Sections editors may open in /admin (home page, calendar, newsletters, rush, history, exec team, house mom). */
function isEditorAllowedSection(section: string): boolean {
  return (
    isSiteContentSection(section) ||
    isRushPageSection(section) ||
    isHistoryPageSection(section) ||
    editorTopLevelSectionIds.includes(section as (typeof editorTopLevelSectionIds)[number])
  )
}

function normalizedQuerySection(): string | undefined {
  const raw = route.query.section
  if (!raw || typeof raw !== 'string') return undefined
  return raw === 'settings-exec-team' ? 'exec-team' : raw
}

function clampSectionForRole(section: string): string {
  if (authStore.isAdmin) {
    return validSectionIds.includes(section as (typeof validSectionIds)[number]) ? section : 'overview'
  }
  if (isRushOnlyRole.value) {
    return 'rush-crm'
  }
  return isEditorAllowedSection(section) ? section : 'settings-home-images'
}

/** Default landing section per role. */
function defaultSectionForRole(): string {
  if (authStore.isAdmin) return 'overview'
  if (isRushOnlyRole.value) return 'rush-crm'
  return 'settings-home-images'
}

const activeSection = ref(defaultSectionForRole())

watch(
  () => [normalizedQuerySection(), authStore.user?.role] as const,
  () => {
    const urlSec = normalizedQuerySection()
    const base =
      urlSec && validSectionIds.includes(urlSec as (typeof validSectionIds)[number])
        ? urlSec
        : defaultSectionForRole()
    const next = clampSectionForRole(base)
    if (activeSection.value !== next) {
      activeSection.value = next
    }

    if (!authStore.isAdmin) {
      const q = route.query.section
      if (typeof q !== 'string' || q !== next) {
        router.replace({ query: { ...route.query, section: next } })
      }
      return
    }

    if (urlSec != null && !validSectionIds.includes(urlSec as (typeof validSectionIds)[number])) {
      router.replace({ query: { ...route.query, section: next } })
    } else if (route.query.section === 'settings-exec-team') {
      router.replace({ query: { ...route.query, section: 'exec-team' } })
    }
  },
  { immediate: true },
)

/** Expanded/collapsed state per nav group id (`home-page`, `rush-page`, …). */
const navGroupExpanded = ref<Record<string, boolean>>({})

function navGroupIsOpen(groupId: string): boolean {
  return navGroupExpanded.value[groupId] ?? false
}

function toggleNavGroup(groupId: string) {
  navGroupExpanded.value = {
    ...navGroupExpanded.value,
    [groupId]: !navGroupIsOpen(groupId),
  }
}

function navGroupIsHighlighted(item: NavItem): boolean {
  return item.items?.some((sub) => sub.id === activeSection.value) ?? false
}

function expandNavGroupsForSection(section: string) {
  const next = { ...navGroupExpanded.value }
  if (section === 'settings-home-images') next['home-page'] = true
  if (isRushPageSection(section)) next['rush-page'] = true
  if (isHistoryPageSection(section)) next['history-page'] = true
  navGroupExpanded.value = next
}

watch(
  activeSection,
  (newSection) => {
    expandNavGroupsForSection(newSection)
  },
  { immediate: true },
)

function confirmLeaveUnsavedEdits(): Promise<boolean> {
  if (!adminHasUnsavedChanges()) return Promise.resolve(true)
  return new Promise((resolve) => {
    confirm.require({
      message:
        'You have unsaved changes. If you leave this page or section, those edits will be lost.',
      header: 'Unsaved changes',
      icon: 'pi pi-exclamation-triangle',
      rejectClass: 'p-button-secondary p-button-outlined',
      rejectLabel: 'Stay',
      acceptLabel: 'Leave without saving',
      acceptClass: 'p-button-danger',
      accept: () => {
        adminDiscardAllUnsaved()
        resolve(true)
      },
      reject: () => resolve(false),
    })
  })
}

function warnBeforeUnload(e: BeforeUnloadEvent) {
  if (adminHasUnsavedChanges()) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// Function to set active section and update URL
const setActiveSection = (section: string) => {
  if (section === activeSection.value) return
  void (async () => {
    const ok = await confirmLeaveUnsavedEdits()
    if (!ok) return
    activeSection.value = section
    router.push({ query: { ...route.query, section } })

    expandNavGroupsForSection(section)
  })()
}

onBeforeRouteLeave(async () => {
  return confirmLeaveUnsavedEdits()
})

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', warnBeforeUnload)
})

const manageHomePageNav = {
  id: 'home-page',
  label: 'Manage Home Page',
  icon: 'pi pi-home',
  items: [
    {
      id: 'settings-home-images',
      label: 'Home Page Images',
      icon: 'pi pi-image',
    },
  ],
} as const

const manageHistoryPageNav = {
  id: 'history-page',
  label: 'Manage History Page',
  icon: 'pi pi-building',
  items: [
    {
      id: 'history-images',
      label: 'History Images',
      icon: 'pi pi-images',
    },
  ],
} as const

const manageCalendarEventsNavItem = {
  id: 'alumni',
  label: 'Manage Calendar Events',
  icon: 'pi pi-calendar',
} as const

const manageNewslettersNavItem = {
  id: 'newsletter',
  label: 'Manage NewsLetters',
  icon: 'pi pi-book',
} as const

const manageExecTeamNavItem = {
  id: 'exec-team',
  label: 'Add/Manage Exec Team',
  icon: 'pi pi-briefcase',
} as const

const manageHouseMomNavItem = {
  id: 'house-mom',
  label: 'Edit House Mom',
  icon: 'pi pi-heart',
} as const

/** Standalone Rush CRM entry for rush-only roles (member, rush_chair). */
const rushCrmNavItem = {
  id: 'rush-crm',
  label: 'Rush CRM',
  icon: 'pi pi-users',
} as const

const manageRushPageNav = {
  id: 'rush-page',
  label: 'Manage Rush',
  icon: 'pi pi-flag',
  items: [
    {
      id: 'rush-widgets',
      label: 'Rush Widget Content',
      icon: 'pi pi-th-large',
    },
    {
      id: 'rush',
      label: 'Rush Events',
      icon: 'pi pi-star',
    },
    {
      id: 'rush-photos',
      label: 'Rush Photos',
      icon: 'pi pi-images',
    },
    {
      id: 'rush-crm',
      label: 'Rush CRM',
      icon: 'pi pi-users',
    },
  ],
} as const

/** Order mirrors public Header nav (Home → Rush → NewsLetters → Calendar → People), then admin-only tools, health last. */
const fullNavItems: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'pi pi-chart-bar',
  },
  { ...manageHomePageNav },
  { ...manageRushPageNav },
  { ...manageNewslettersNavItem },
  { ...manageCalendarEventsNavItem },
  { ...manageHistoryPageNav },
  {
    id: 'member',
    label: 'Add/Manage Members and Parents',
    icon: 'pi pi-user-plus',
  },
  {
    id: 'users',
    label: 'Add/Manage User Roles',
    icon: 'pi pi-users',
  },
  { ...manageExecTeamNavItem },
  { ...manageHouseMomNavItem },
  {
    id: 'email-campaigns',
    label: 'Email Campaigns',
    icon: 'pi pi-envelope',
  },
  {
    id: 'pennington',
    label: 'Pennington Upload',
    icon: 'pi pi-upload',
  },
  {
    id: 'woogle-index',
    label: 'Woogle: Re-index Content',
    icon: 'pi pi-sync',
  },
  {
    id: 'health',
    label: 'Check Database Connection',
    icon: 'pi pi-database',
  },
]

const editorNavItems: NavItem[] = [
  { ...manageHomePageNav },
  { ...manageRushPageNav },
  { ...manageNewslettersNavItem },
  { ...manageCalendarEventsNavItem },
  { ...manageHistoryPageNav },
  { ...manageExecTeamNavItem },
  { ...manageHouseMomNavItem },
]

/** Rush-only roles (member, rush_chair) see only the Rush CRM. */
const rushOnlyNavItems: NavItem[] = [{ ...rushCrmNavItem }]

const navItems = computed(() => {
  if (authStore.isAdmin) return fullNavItems
  if (authStore.canAccessAdminPanel) return editorNavItems
  return rushOnlyNavItems
})
</script>
