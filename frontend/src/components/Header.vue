<template>
  <div>
    <Toast />

    <div>
      <Menubar :model="items" class="header-menubar" :autoDisplay="false" :mobileBreakpoint="1024">
        <template #start>
          <div class="header-top-row">
            <div class="flex items-center gap-3 header-branding">
              <div class="header-text-container font-bold flex items-center gap-2">
                <span class="brand-text">Beta Theta Pi</span>
                <span class="mx-1 md:mx-2 brand-pipe">|</span>
                <span class="brand-alpha">Alpha Nu</span>
                <img src="/crest.webp" alt="Beta Theta Pi Crest" class="crest-image" />
              </div>
            </div>
            <div v-if="isAuth0Configured" class="auth-buttons flex items-center gap-3">
              <UserProfile v-if="isAuthenticated && authStore.user" />
              <LoginButton v-else />
            </div>
          </div>
        </template>
        <template #item="{ item, props, hasSubmenu, root }">
          <!-- Only customize root level items, let PrimeVue handle submenu items -->
          <template v-if="root">
            <router-link
              v-if="item.routerLink"
              :to="item.routerLink"
              custom
              v-slot="{ href, navigate, isActive }"
            >
              <a :href="href" @click="navigate" class="flex items-center" :class="{ 'active-link': isActive }">
                <span :class="item.icon"></span>
                <span class="ml-2">{{ item.label }}</span>
                <Badge
                  v-if="item.badge"
                  class="ml-auto"
                  :value="item.badge"
                />
                <i
                  v-if="hasSubmenu"
                  class="pi pi-angle-down ml-2"
                ></i>
              </a>
            </router-link>
            <a 
              v-else 
              v-ripple 
              class="flex items-center" 
              v-bind="props.action"
            >
              <span :class="item.icon"></span>
              <span class="ml-2">{{ item.label }}</span>
              <Badge
                v-if="item.badge"
                class="ml-2"
                :value="item.badge"
              />
              <i
                v-if="hasSubmenu"
                class="pi pi-angle-down ml-2"
              ></i>
            </a>
          </template>
          <!-- Let PrimeVue handle submenu items with default template -->
          <template v-else>
            <a v-ripple v-bind="props.action">
              <span :class="item.icon"></span>
              <span>{{ item.label }}</span>
            </a>
          </template>
        </template>
      </Menubar>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from "vue";
  import { env } from '@/config/env';
  import { useAuth0 } from '@auth0/auth0-vue';
  import {
    Badge,
    Menubar,
    Toast,
  } from "primevue";
  import LoginButton from './LoginButton.vue';
  import LogoutButton from './LogoutButton.vue';
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

  const items = ref([
    {
      label: "Home",
      icon: "pi pi-home",
      routerLink: "/",
    },
    {
      label: "Rush",
      icon: "pi pi-users",
      routerLink: "/rush",
    },
    {
      label: "NewsLetters",
      icon: "pi pi-book",
      routerLink: "/newsletters",
    },
    {
      label: "Events",
      icon: "pi pi-calendar",
      routerLink: "/events",
    },
        {
      label: "People",
      icon: "pi pi-id-card",
      routerLink: "/members",
        },
        {
      label: "Donate",
      icon: "pi pi-heart",
      routerLink: "/donate",
        },
        {
      label: "Contact Us",
      icon: "pi pi-envelope",
      routerLink: "/contact",
    },
    {
      label: "Admin",
      icon: "pi pi-cog",
      routerLink: "/admin",
    },
  ]);
</script>

<style scoped>
  /* Ensure header container is always visible */
  .header-menubar {
    display: block !important;
    visibility: visible !important;
  }

  /* Add padding inside the Menubar */
  .header-menubar :deep(.p-menubar) {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    background: #ffffff !important;
    background-color: #ffffff !important;
    border: none !important;
    border-bottom: 2px solid #9ca3af !important;
    display: flex !important;
    flex-direction: column !important;
    visibility: visible !important;
  }
  
  /* Container for start and navigation */
  .header-menubar :deep(.p-menubar-start-container),
  .header-menubar :deep(.p-menubar-root-list-container) {
    width: 100%;
  }
  
  .header-menubar :deep(.p-menubar-root) {
    background: #ffffff !important;
    background-color: #ffffff !important;
    width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
  }

  .header-menubar :deep(.p-menubar-start) {
    background: transparent !important;
    width: 100% !important;
    margin-bottom: 0.75rem !important;
  }
  
  /* Header top row - contains branding and auth buttons */
  .header-top-row {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
  }

  /* Right justify navigation and add spacing - only on desktop */
  @media (min-width: 1024px) {
    .header-menubar :deep(.p-menubar-root-list) {
      display: flex !important;
      justify-content: flex-end !important;
      gap: 1.5rem !important;
      width: 100% !important;
      padding-top: 0.5rem !important;
    }

    .header-menubar :deep(.p-menubar-root-list > li) {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    
  }

  /* Beta Theta Pi colors - denim blue and gray */
  .header-branding {
    color: #6F8FAF !important;
  }

  .header-menubar :deep(.p-menubar-start) {
    color: #6F8FAF !important;
  }

  /* Auth buttons container */
  .auth-buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }

  .brand-text {
    color: #6F8FAF !important;
  }

  .brand-pipe {
    color: #9ca3af !important;
  }

  .brand-alpha {
    color: #9ca3af !important;
  }

  .crest-image {
    height: 2.5rem;
    width: auto;
    margin-left: 0.5rem;
    object-fit: contain;
  }

  /* Navigation links - denim blue text on white background */
  .header-menubar :deep(.p-menubar-root-list > li > a) {
    color: #6F8FAF !important;
  }

  .header-menubar :deep(.p-menubar-root-list > li > a:hover) {
    background-color: rgba(156, 163, 175, 0.2) !important;
    color: #6F8FAF !important;
  }

  .header-menubar :deep(.p-menubar-root-list > li > a .pi) {
    color: #6F8FAF !important;
    }

  .active-link {
    background-color: rgba(156, 163, 175, 0.3) !important;
    border-bottom: none !important;
    border-radius: 0.5rem !important;
    padding: 0.5rem 1rem !important;
    font-weight: 600 !important;
    color: #6F8FAF !important;
  }

  .active-link .pi {
    color: #6F8FAF !important;
  }


  /* Header text container - responsive sizing */
  .header-text-container {
    font-size: 1rem; /* Base mobile size */
    line-height: 1.2;
  }

  @media (min-width: 640px) {
    .header-text-container {
      font-size: 1.25rem; /* sm */
    }
  }

  @media (min-width: 768px) {
    .header-text-container {
      font-size: 1.5rem; /* md - text-2xl equivalent */
    }
  }

  /* Mobile menu styling */
  @media (max-width: 1023px) {
    /* Make header text smaller on mobile to prevent wrapping */
    .header-text-container {
      font-size: 0.875rem !important; /* text-sm */
      white-space: nowrap;
    }

    .brand-text,
    .brand-alpha {
      white-space: nowrap;
    }

    /* Smaller crest on mobile */
    .crest-image {
      height: 1.75rem !important;
      margin-left: 0.25rem !important;
    }

    /* Let PrimeVue handle hiding the desktop menu - don't override */
    /* Only style the mobile menu when it's visible */
    .header-menubar :deep(.p-menubar-mobile) {
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      right: 0 !important;
      background: white !important;
      z-index: 1000 !important;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
      margin: 0 !important;
      padding: 1rem !important;
      width: 100% !important;
    }

    /* Style mobile menu items when visible */
    .header-menubar :deep(.p-menubar-mobile .p-menubar-root-list) {
      flex-direction: column !important;
      gap: 0.5rem !important;
    }

    .header-menubar :deep(.p-menubar-mobile .p-menubar-root-list > li > a) {
      padding: 0.75rem 1rem !important;
      display: flex !important;
      align-items: center !important;
      width: 100% !important;
    }

    /* Auth buttons on mobile - hide from end slot and show in mobile menu if needed */
    .auth-buttons {
      margin-left: 0.5rem;
    }
  }

  /* Desktop - ensure menu shows and mobile menu is hidden */
  @media (min-width: 1024px) {
    :deep(.p-menubar-button) {
      display: none !important;
    }

    :deep(.p-menubar-mobile) {
      display: none !important;
    }
  }
</style>

