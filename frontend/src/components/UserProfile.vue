<template>
  <div v-if="authStore.loading" class="loading-container">
    <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem; color: #6F8FAF;"></i>
  </div>
  <div 
    v-else-if="authStore.isAuthenticated && authStore.user" 
    class="profile-container"
  >
    <Menu ref="menu" :model="menuItems" :popup="true" />
    <Avatar 
      :label="userInitials" 
      shape="circle" 
      size="large"
      class="profile-avatar"
      @click="toggleMenu"
      style="cursor: pointer;"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAuth0 } from '@auth0/auth0-vue'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'

const authStore = useAuthStore()
const auth0 = useAuth0()
const menu = ref()

const userInitials = computed(() => {
  if (!authStore.user) return ''
  const firstName = authStore.user.firstName || ''
  const lastName = authStore.user.lastName || ''
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  return (firstName || lastName || 'U').substring(0, 2).toUpperCase()
})

const fullName = computed(() => {
  if (!authStore.user) return ''
  return `${authStore.user.firstName} ${authStore.user.lastName}`
})

const userRole = computed(() => {
  if (!authStore.user) return ''
  return authStore.user.role.charAt(0).toUpperCase() + authStore.user.role.slice(1)
})

const handleLogout = () => {
  // Clear user profile before logout
  authStore.clearUser()
  
  auth0.logout({
    logoutParams: {
      returnTo: window.location.origin
    }
  })
}

const menuItems = computed(() => [
  {
    label: fullName.value,
    disabled: true,
    class: 'menu-header',
  },
  {
    label: `Role: ${userRole.value}`,
    disabled: true,
    class: 'menu-role',
  },
  {
    separator: true,
  },
  {
    label: 'Log Out',
    icon: 'pi pi-sign-out',
    command: handleLogout,
  },
])

const toggleMenu = (event) => {
  menu.value.toggle(event)
}
</script>

<style scoped>
.profile-container {
  display: flex;
  align-items: center;
  position: relative;
}

.profile-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border: 2px solid #6F8FAF;
  background-color: #6F8FAF;
  color: white;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.profile-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(111, 143, 175, 0.3);
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}
</style>

<style>
/* Global styles for the menu items */
.p-menu .menu-header {
  font-weight: 600;
  color: #6F8FAF;
  font-size: 0.95rem;
  padding: 0.75rem 1rem;
}

.p-menu .menu-role {
  color: #6b7280;
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  text-transform: capitalize;
}
</style>

