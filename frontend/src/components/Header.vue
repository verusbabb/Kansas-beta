<template>
  <div>
    <Toast />

    <div class="card">
      <Menubar :model="items" class="header-menubar">
        <template #start>
          <div class="text-2xl font-bold mr-8">
            Verus | <span class="text-indigo-500">Ware</span>
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
              <a :href="href" @click="navigate" class="flex items-center">
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
        <template #end>
          <Button
            label="DB Connection Check"
            icon="pi pi-heart"
            @click="handleHealthCheck"
            :loading="isCheckingHealth"
            :disabled="isCheckingHealth"
            text
            severity="secondary"
            class="db-check-button"
          />
        </template>
      </Menubar>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";
  import {
    Badge,
    Button,
    Menubar,
    Toast,
  } from "primevue";
  import { useHealthStore } from "@/stores/health";

  const healthStore = useHealthStore();
  const isCheckingHealth = ref(false);

  const handleHealthCheck = async () => {
    console.log('Health Check clicked');
    isCheckingHealth.value = true;
    try {
      await healthStore.checkHealthWithToast();
    } finally {
      isCheckingHealth.value = false;
    }
  };

  const items = ref([
    {
      label: "Home",
      icon: "pi pi-home",
      routerLink: "/",
    },
    {
      label: "Things",
      icon: "pi pi-pencil",
      routerLink: "/blog",
    },
    {
      label: "Projects",
      icon: "pi pi-graduation-cap",
      badge: 3,
      items: [
        {
          label: "Coming Soon",
          icon: "pi pi-check",
        },
        {
          label: "Coming Soon",
          icon: "pi pi-check",
        },
        {
          label: "Coming Soon",
          icon: "pi pi-check",
        },
      ],
    },
    {
      label: "Profile",
      icon: "pi pi-user",
      routerLink: "/",
    },
  ]);
</script>

<style scoped>
  /* Add padding inside the Menubar */
  .header-menubar :deep(.p-menubar) {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  /* Design customization: Green checkmark icons in submenu */
  :deep(.p-submenu-list .pi) {
    color: #10b981;
  }

  /* Functional: Hide DB Connection Check button label on mobile */
  .db-check-button :deep(.p-button-label) {
    display: none;
  }

  @media (min-width: 1024px) {
    .db-check-button :deep(.p-button-label) {
      display: inline-block;
    }
  }

  /* Design customization: Replace all icons with green checkmarks on mobile */
  @media (max-width: 1023px) {
    /* Add margin to mobile overlay container (handles both main menu and submenus) */
    :deep(.p-menubar-mobile) {
      margin-left: 1rem;
      margin-right: 1rem;
    }

    :deep(.p-menubar-mobile-active .p-menubar-root-list > li > a .pi:not(.pi-angle-down)) {
      color: #10b981;
      margin-right: 0.5rem;
    }

    :deep(.p-menubar-mobile-active .p-menubar-root-list > li > a .pi.pi-home::before),
    :deep(.p-menubar-mobile-active .p-menubar-root-list > li > a .pi.pi-pencil::before),
    :deep(.p-menubar-mobile-active .p-menubar-root-list > li > a .pi.pi-graduation-cap::before),
    :deep(.p-menubar-mobile-active .p-menubar-root-list > li > a .pi.pi-user::before) {
      content: "\e90b";
    }

    :deep(.p-menubar-mobile-active .p-submenu-list > li > a .pi) {
      margin-right: 0.5rem;
      color: #10b981;
    }
  }
</style>

