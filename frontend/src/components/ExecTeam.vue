<template>
  <Card class="mb-6">
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-users text-[#6F8FAF]"></i>
        <span>Executive Team</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-6">
        <div class="text-surface-600">
          Meet the executive team members leading our chapter.
        </div>

        <!-- Exec Team Grid -->
        <div v-if="execTeamMembers.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Card
            v-for="member in execTeamMembers"
            :key="member.id"
            class="text-center hover:shadow-lg transition-shadow"
          >
            <template #content>
              <div class="flex flex-col items-center">
                <Avatar
                  :image="member.image"
                  :label="member.initials"
                  shape="circle"
                  size="xlarge"
                  class="mb-4"
                />
                <h3 class="text-lg font-bold mb-1">{{ member.name }}</h3>
                <p class="text-surface-600 font-medium mb-2">{{ member.title }}</p>
                <p v-if="member.position" class="text-sm text-surface-500">{{ member.position }}</p>
              </div>
            </template>
          </Card>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-16">
          <i class="pi pi-users text-6xl text-surface-400 mb-4"></i>
          <h3 class="text-2xl font-bold text-surface-700 mb-2">No Executive Team Members</h3>
          <p class="text-surface-600">Executive team information will be displayed here.</p>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import Avatar from 'primevue/avatar'

// Placeholder data - will be replaced with store/API data later
const execTeamMembers = ref<any[]>([])
</script>

