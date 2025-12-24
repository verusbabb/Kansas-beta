<template>
  <Button 
    label="Log In" 
    icon="pi pi-sign-in"
    @click="handleLogin" 
    :loading="isLoading"
    severity="secondary"
    size="small"
    class="auth-button"
  />
</template>

<script setup>
import { useAuth0 } from '@auth0/auth0-vue'
import Button from 'primevue/button'

const auth0 = useAuth0()
const { loginWithRedirect, isLoading } = auth0

const handleLogin = () => {
  loginWithRedirect()
}
</script>

<style scoped>
.auth-button {
  font-size: 0.875rem;
}
</style>

