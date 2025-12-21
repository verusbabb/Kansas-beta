<template>
  <div>
    <Toast />

    <div>
      <Menubar :model="items" class="header-menubar">
        <template #start>
          <div class="flex items-center gap-3 header-branding">
            <div class="text-2xl font-bold flex items-center gap-2">
              <span class="brand-text">Beta Theta Pi</span>
              <span class="mx-2 brand-pipe">|</span>
              <span class="brand-alpha">Alpha Nu</span>
              <img src="/crest.webp" alt="Beta Theta Pi Crest" class="crest-image" />
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
  import { ref } from "vue";
  import {
    Badge,
    Menubar,
    Toast,
  } from "primevue";

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
      label: "Members and Alumni",
      icon: "pi pi-id-card",
      routerLink: "/members",
    },
    {
      label: "Contact Us",
      icon: "pi pi-envelope",
      routerLink: "/contact",
    },
  ]);
</script>

<style scoped>
  /* Add padding inside the Menubar */
  .header-menubar :deep(.p-menubar) {
    padding-left: 1rem;
    padding-right: 1rem;
    background: #000000 !important;
    background-color: #000000 !important;
    border: none !important;
    border-bottom: 2px solid #22c55e !important;
    display: flex !important;
    justify-content: space-between !important;
  }

  .header-menubar :deep(.p-menubar-root) {
    background: #000000 !important;
    background-color: #000000 !important;
  }

  .header-menubar :deep(.p-menubar-start) {
    background: transparent !important;
  }

  /* Right justify navigation and add spacing */
  .header-menubar :deep(.p-menubar-root-list) {
    display: flex !important;
    justify-content: flex-end !important;
    gap: 1.5rem !important;
    margin-left: auto !important;
  }

  .header-menubar :deep(.p-menubar-root-list > li) {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  /* Beta Theta Pi colors - black and green on white background */
  .header-branding {
    color: #000000 !important;
  }

  .header-menubar :deep(.p-menubar-start) {
    color: #000000 !important;
  }

  .brand-text {
    color: #000000 !important;
  }

  .brand-pipe {
    color: #22c55e !important;
  }

  .brand-alpha {
    color: #22c55e !important;
  }

  .crest-image {
    height: 2.5rem;
    width: auto;
    margin-left: 0.5rem;
    object-fit: contain;
  }

  /* Navigation links - black text on white background */
  .header-menubar :deep(.p-menubar-root-list > li > a) {
    color: #000000 !important;
  }

  .header-menubar :deep(.p-menubar-root-list > li > a:hover) {
    background-color: rgba(34, 197, 94, 0.15) !important;
    color: #000000 !important;
  }

  .header-menubar :deep(.p-menubar-root-list > li > a .pi) {
    color: #000000 !important;
  }

  .active-link {
    background-color: rgba(34, 197, 94, 0.2) !important;
    border-bottom: none !important;
    font-weight: 600 !important;
    color: #000000 !important;
  }

  .active-link .pi {
    color: #000000 !important;
  }


  /* Mobile menu styling */
  @media (max-width: 1023px) {
    :deep(.p-menubar-mobile) {
      margin-left: 1rem;
      margin-right: 1rem;
    }
  }
</style>

