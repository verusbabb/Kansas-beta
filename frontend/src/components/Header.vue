<template>
  <div>
    <Toast />

    <div>
      <Menubar :model="items" breakpoint="960px">
        <template #start>
          <div class="flex items-center gap-3">
            <span class="font-semibold">Beta Theta Pi</span>
            <span class="opacity-60">|</span>
            <span class="opacity-60">Alpha Nu</span>
            <img src="/crest.webp" alt="Beta Theta Pi Crest" class="h-10 w-auto" />
          </div>
        </template>
        <template #end>
          <div v-if="isAuth0Configured" class="flex items-center gap-3">
            <UserProfile v-if="isAuthenticated && authStore.user" />
            <LoginButton v-else />
          </div>
        </template>

        <!-- Keep this slot only to support Vue Router, otherwise use PrimeVue defaults. -->
        <template #item="{ item, props, hasSubmenu }">
          <router-link v-if="item.route" :to="item.route" custom v-slot="{ href, navigate }">
            <a v-ripple :href="href" v-bind="props.action" @click="navigate">
              <span :class="item.icon"></span>
              <span>{{ item.label }}</span>
              <Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
              <span v-if="hasSubmenu" class="pi pi-angle-down ml-2" />
            </a>
          </router-link>
          <a v-else v-ripple v-bind="props.action" @click="item.command?.()">
            <span :class="item.icon"></span>
            <span>{{ item.label }}</span>
            <Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
            <span v-if="hasSubmenu" class="pi pi-angle-down ml-2" />
          </a>
        </template>
      </Menubar>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref, onMounted, onUnmounted } from "vue";
  import { env } from '@/config/env';
  import { useAuth0 } from '@auth0/auth0-vue';
  import { useRouter } from 'vue-router';
  import Badge from 'primevue/badge';
  import Menubar from 'primevue/menubar';
  import Toast from 'primevue/toast';
  import LoginButton from './LoginButton.vue';
  import UserProfile from './UserProfile.vue';
  import { useAuthStore } from '@/stores/auth';

  const router = useRouter();

  // Check if Auth0 is configured
  const isAuth0Configured = env.auth0Domain && env.auth0ClientId;
  
  // Use Auth0 composable (plugin must be registered in main.ts)
  // If plugin isn't registered (env vars not set), this will cause an error
  // but buttons won't show anyway due to isAuth0Configured check
  let auth0;
  let isAuthenticated = computed(() => false);
  
  try {
    auth0 = useAuth0();
    isAuthenticated = computed(() => isAuth0Configured && (auth0?.isAuthenticated.value ?? false));
  } catch (error) {
    // Auth0 plugin not registered - this is expected if env vars aren't set
    // Buttons won't show due to isAuth0Configured check above
    console.debug('Auth0 not available (this is normal if VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID are not set)');
  }

  // Get auth store for user info
  const authStore = useAuthStore();

  // Track window width so we can collapse overflow items at mid-range widths
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
  const onResize = () => { windowWidth.value = window.innerWidth }
  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))

  // Menu items - computed to reactively include/exclude items based on role + screen width
  const items = computed(() => {
    const canAsk = authStore.canAccessAdminPanel
    const useFlat   = windowWidth.value >= 1650
    const useMedium = windowWidth.value >= 1200

    // Helper: create a submenu item that navigates via router.push (avoids slot routing issues)
    const cmd = (label, icon, path) => ({ label, icon, command: () => router.push(path) })

    // More items for medium layout (1200–1649): collapse Donate, Contact, Resources, Admin
    const mediumMoreItems = [
      cmd("Donate",    "pi pi-heart",        "/donate"),
      cmd("Contact",   "pi pi-envelope",     "/contact"),
      ...(canAsk ? [{ separator: true }] : []),
      ...(canAsk ? [cmd("Resources", "pi pi-folder-open", "/resources")] : []),
      ...(canAsk ? [cmd("Admin",     "pi pi-cog",         "/admin")]     : []),
    ]

    // More items for compact layout (960–1199): collapse everything except core 4
    const compactMoreItems = [
      cmd("News",    "pi pi-book",  "/newsletters"),
      cmd("History", "pi pi-clock", "/history"),
      { separator: true },
      cmd("Donate",  "pi pi-heart",    "/donate"),
      cmd("Contact", "pi pi-envelope", "/contact"),
      ...(canAsk ? [{ separator: true }] : []),
      ...(canAsk ? [cmd("Woogle",    "pi pi-sparkles",    "/ask")]       : []),
      ...(canAsk ? [cmd("Resources", "pi pi-folder-open", "/resources")] : []),
      ...(canAsk ? [cmd("Admin",     "pi pi-cog",         "/admin")]     : []),
    ]

    const flatItems = [
      { label: "Home",     icon: "pi pi-home",      route: "/" },
      { label: "Rush",     icon: "pi pi-users",     route: "/rush" },
      { label: "Calendar", icon: "pi pi-calendar",  route: "/events" },
      { label: "People",   icon: "pi pi-id-card",   route: "/members" },
      ...(canAsk ? [{ label: "Woogle",    icon: "pi pi-sparkles",    route: "/ask" }] : []),
      ...(canAsk ? [{ label: "Resources", icon: "pi pi-folder-open", route: "/resources" }] : []),
      { label: "News",     icon: "pi pi-book",      route: "/newsletters" },
      { label: "History",  icon: "pi pi-clock",     route: "/history" },
      { label: "Donate",   icon: "pi pi-heart",     route: "/donate" },
      { label: "Contact",  icon: "pi pi-envelope",  route: "/contact" },
    ]

    const mediumItems = [
      { label: "Home",     icon: "pi pi-home",     route: "/" },
      { label: "Rush",     icon: "pi pi-users",    route: "/rush" },
      { label: "Calendar", icon: "pi pi-calendar", route: "/events" },
      { label: "People",   icon: "pi pi-id-card",  route: "/members" },
      ...(canAsk ? [{ label: "Woogle", icon: "pi pi-sparkles", route: "/ask" }] : []),
      { label: "News",    icon: "pi pi-book",  route: "/newsletters" },
      { label: "History", icon: "pi pi-clock", route: "/history" },
      { label: "More", icon: "pi pi-ellipsis-h", items: mediumMoreItems },
    ]

    const compactItems = [
      { label: "Home",     icon: "pi pi-home",     route: "/" },
      { label: "Rush",     icon: "pi pi-users",    route: "/rush" },
      { label: "Calendar", icon: "pi pi-calendar", route: "/events" },
      { label: "People",   icon: "pi pi-id-card",  route: "/members" },
      { label: "More", icon: "pi pi-ellipsis-h", items: compactMoreItems },
    ]

    const baseItems = useFlat ? flatItems : useMedium ? mediumItems : compactItems

    // Admin appended at top level only in flat layout — other layouts inject it via More
    if (useFlat && authStore.canAccessAdminPanel) {
      baseItems.push({ label: "Admin", icon: "pi pi-cog", route: "/admin" })
    }

    return baseItems;
  });
</script>

