<template>
  <div>
    <Toast />

    <div>
      <Menubar :model="items" breakpoint="1024px">
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
          <a v-else v-ripple v-bind="props.action">
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
  import { computed } from "vue";
  import { env } from '@/config/env';
  import { useAuth0 } from '@auth0/auth0-vue';
  import Badge from 'primevue/badge';
  import Menubar from 'primevue/menubar';
  import Toast from 'primevue/toast';
  import LoginButton from './LoginButton.vue';
  import UserProfile from './UserProfile.vue';
  import { useAuthStore } from '@/stores/auth';

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

  // Menu items - computed to reactively include/exclude Admin based on user role
  const items = computed(() => {
    const baseItems = [
      {
        label: "Home",
        icon: "pi pi-home",
        route: "/",
      },
      {
        label: "Rush",
        icon: "pi pi-users",
        route: "/rush",
      },
      {
        label: "NewsLetters",
        icon: "pi pi-book",
        route: "/newsletters",
      },
      {
        label: "Calendar",
        icon: "pi pi-calendar",
        route: "/events",
      },
      {
        label: "People",
        icon: "pi pi-id-card",
        route: "/members",
      },
      {
        label: "Donate",
        icon: "pi pi-heart",
        route: "/donate",
      },
      {
        label: "Contact Us",
        icon: "pi pi-envelope",
        route: "/contact",
      },
    ];

    // Admins and site editors (settings-only in /admin); viewers never see this link
    if (authStore.canAccessAdminPanel) {
      baseItems.push({
        label: "Admin",
        icon: "pi pi-cog",
        route: "/admin",
      });
    }

    return baseItems;
  });
</script>

