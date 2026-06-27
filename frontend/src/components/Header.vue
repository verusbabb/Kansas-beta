<template>
  <div>
    <Toast />

    <!-- Menu popup lives outside Menubar — uses its own reliable overlay mechanism -->
    <Menu ref="moreMenuRef" :model="moreMenuItems" popup />

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

        <template #item="{ item, props }">
          <!-- "More" trigger: no items array on the model item, so Menubar never creates a submenu.
               Instead we toggle a separate Menu popup component. -->
          <a
            v-if="item.isMore"
            v-ripple
            v-bind="props.action"
            href="#"
            @click.prevent="(e) => moreMenuRef.toggle(e)"
          >
            <span :class="item.icon"></span>
            <span>{{ item.label }}</span>
            <span class="pi pi-angle-down ml-1" style="font-size: 0.75rem" />
          </a>

          <!-- All other items: plain anchor with explicit router.push — no submenus involved -->
          <a
            v-else
            v-ripple
            v-bind="props.action"
            :href="item.route || '#'"
            @click.prevent="item.route ? router.push(item.route) : null"
          >
            <span :class="item.icon"></span>
            <span>{{ item.label }}</span>
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
  import Menu from 'primevue/menu';
  import Menubar from 'primevue/menubar';
  import Toast from 'primevue/toast';
  import LoginButton from './LoginButton.vue';
  import UserProfile from './UserProfile.vue';
  import { useAuthStore } from '@/stores/auth';

  const router = useRouter();

  // Check if Auth0 is configured
  const isAuth0Configured = env.auth0Domain && env.auth0ClientId;
  
  let auth0;
  let isAuthenticated = computed(() => false);
  
  try {
    auth0 = useAuth0();
    isAuthenticated = computed(() => isAuth0Configured && (auth0?.isAuthenticated.value ?? false));
  } catch (error) {
    console.debug('Auth0 not available (this is normal if VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID are not set)');
  }

  const authStore = useAuthStore();
  const moreMenuRef = ref(null);

  // Track window width for responsive breakpoints
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
  const onResize = () => { windowWidth.value = window.innerWidth }
  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))

  // Items for the Menu popup — uses command callbacks (reliable in Menu popup context)
  const moreMenuItems = computed(() => {
    const canAdmin = authStore.canAccessAdminPanel
    const canResources = authStore.canAccessResources
    const canWoogle = authStore.canUseWoogle
    const showRushCrm = authStore.isMember || authStore.isRushChair
    const useMedium = windowWidth.value >= 1200

    const go = (path) => () => router.push(path)

    if (useMedium) {
      // Medium layout (1200–1649): More contains Donate, Contact, and authed tools
      const extras = [
        ...(canResources ? [{ label: "Resources", icon: "pi pi-folder-open", command: go("/resources") }] : []),
        ...(showRushCrm ? [{ label: "Rush CRM", icon: "pi pi-id-card", command: go("/admin?section=rush-crm") }] : []),
        ...(canAdmin ? [{ label: "Admin", icon: "pi pi-cog", command: go("/admin") }] : []),
      ]
      return [
        { label: "Donate",    icon: "pi pi-heart",        command: go("/donate") },
        { label: "Contact",   icon: "pi pi-envelope",     command: go("/contact") },
        ...(extras.length ? [{ separator: true }] : []),
        ...extras,
      ]
    } else {
      // Compact layout (960–1199): More contains most items
      const extras = [
        ...(canWoogle ? [{ label: "Woogle", icon: "pi pi-sparkles", command: go("/ask") }] : []),
        ...(canResources ? [{ label: "Resources", icon: "pi pi-folder-open", command: go("/resources") }] : []),
        ...(showRushCrm ? [{ label: "Rush CRM", icon: "pi pi-id-card", command: go("/admin?section=rush-crm") }] : []),
        ...(canAdmin ? [{ label: "Admin", icon: "pi pi-cog", command: go("/admin") }] : []),
      ]
      return [
        { label: "News",    icon: "pi pi-book",      command: go("/newsletters") },
        { label: "History", icon: "pi pi-clock",     command: go("/history") },
        { separator: true },
        { label: "Donate",  icon: "pi pi-heart",     command: go("/donate") },
        { label: "Contact", icon: "pi pi-envelope",  command: go("/contact") },
        ...(extras.length ? [{ separator: true }] : []),
        ...extras,
      ]
    }
  })

  // Top-level nav items — all use route, no submenus (Menubar never sees a submenu)
  const items = computed(() => {
    const canAdmin = authStore.canAccessAdminPanel
    const canResources = authStore.canAccessResources
    const canWoogle = authStore.canUseWoogle
    const showRushCrm = authStore.isMember || authStore.isRushChair
    const useFlat   = windowWidth.value >= 1650
    const useMedium = windowWidth.value >= 1200

    const flatItems = [
      { label: "Home",     icon: "pi pi-home",      route: "/" },
      { label: "Rush",     icon: "pi pi-users",     route: "/rush" },
      { label: "Calendar", icon: "pi pi-calendar",  route: "/events" },
      { label: "People",   icon: "pi pi-id-card",   route: "/members" },
      ...(canWoogle ? [{ label: "Woogle",    icon: "pi pi-sparkles",    route: "/ask" }] : []),
      ...(canResources ? [{ label: "Resources", icon: "pi pi-folder-open", route: "/resources" }] : []),
      ...(showRushCrm ? [{ label: "Rush CRM", icon: "pi pi-id-card", route: "/admin?section=rush-crm" }] : []),
      { label: "News",     icon: "pi pi-book",      route: "/newsletters" },
      { label: "History",  icon: "pi pi-clock",     route: "/history" },
      { label: "Donate",   icon: "pi pi-heart",     route: "/donate" },
      { label: "Contact",  icon: "pi pi-envelope",  route: "/contact" },
      ...(canAdmin ? [{ label: "Admin", icon: "pi pi-cog", route: "/admin" }] : []),
    ]

    const mediumItems = [
      { label: "Home",     icon: "pi pi-home",     route: "/" },
      { label: "Rush",     icon: "pi pi-users",    route: "/rush" },
      { label: "Calendar", icon: "pi pi-calendar", route: "/events" },
      { label: "People",   icon: "pi pi-id-card",  route: "/members" },
      ...(canWoogle ? [{ label: "Woogle", icon: "pi pi-sparkles", route: "/ask" }] : []),
      { label: "News",    icon: "pi pi-book",  route: "/newsletters" },
      { label: "History", icon: "pi pi-clock", route: "/history" },
      { label: "More", icon: "pi pi-ellipsis-h", isMore: true },
    ]

    const compactItems = [
      { label: "Home",     icon: "pi pi-home",     route: "/" },
      { label: "Rush",     icon: "pi pi-users",    route: "/rush" },
      { label: "Calendar", icon: "pi pi-calendar", route: "/events" },
      { label: "People",   icon: "pi pi-id-card",  route: "/members" },
      { label: "More", icon: "pi pi-ellipsis-h", isMore: true },
    ]

    return useFlat ? flatItems : useMedium ? mediumItems : compactItems
  });
</script>

