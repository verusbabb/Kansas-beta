<template>
  <div v-if="isLoading" class="loading-text">
    Loading profile...
  </div>
  <div 
    v-else-if="isAuthenticated && user" 
    class="profile-container"
  >
    <Avatar 
      :image="user.picture" 
      :label="userInitials" 
      shape="circle" 
      size="large"
      class="profile-avatar"
    />
    <div class="profile-info">
      <div class="profile-name">
        {{ user.name }}
      </div>
      <div class="profile-email">
        {{ user.email }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import Avatar from 'primevue/avatar'

const auth0 = useAuth0()
const { user, isAuthenticated, isLoading } = auth0

const userInitials = computed(() => {
  if (!user.value?.name) return ''
  const names = user.value.name.split(' ')
  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
  }
  return user.value.name.substring(0, 2).toUpperCase()
})
</script>

<style scoped>
.profile-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.profile-avatar {
  width: 110px;
  height: 110px;
  border: 3px solid #6F8FAF;
}

.profile-info {
  text-align: center;
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: #6F8FAF;
  margin-bottom: 0.5rem;
}

.profile-email {
  font-size: 1rem;
  color: #9ca3af;
}
</style>

