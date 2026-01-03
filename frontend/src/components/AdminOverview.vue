<template>
  <Card>
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-home text-[#6F8FAF]"></i>
        <span>Admin Overview</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col gap-4">
        <div class="text-lg text-surface-700 mb-4">
          Welcome to the Admin Panel. Use the side navigation to manage different aspects of the site.
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="font-bold mb-2 text-lg">Quick Stats</div>
            <div class="text-sm text-surface-600">Statistics coming soon...</div>
          </div>
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="font-bold mb-2 text-lg">Recent Activity</div>
            <div class="text-sm text-surface-600">Activity log coming soon...</div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card from 'primevue/card'
</script>

