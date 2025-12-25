<template>
  <Button 
    label="Log Out" 
    icon="pi pi-sign-out"
    @click="handleLogout" 
    :loading="isLoading"
    severity="secondary"
    outlined
    size="small"
    class="auth-button"
  />
</template>

<script setup>
import { useAuth0 } from '@auth0/auth0-vue'
import { useAuthStore } from '@/stores/auth'
import Button from 'primevue/button'

const auth0 = useAuth0()
const authStore = useAuthStore()
const { logout, isLoading } = auth0

const handleLogout = () => {
  // Clear user profile before logout
  authStore.clearUser()
  
  logout({
    logoutParams: {
      returnTo: window.location.origin
    }
  })
}
</script>

<style scoped>
.auth-button {
  font-size: 0.875rem;
}
</style>

