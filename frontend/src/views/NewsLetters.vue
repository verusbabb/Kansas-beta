<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-black via-gray-900 to-black text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Chapter Newsletters</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Stay updated with Alpha Nu Chapter news and events
        </p>
        <div class="w-32 h-1 bg-green-600 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-12">
      <!-- Newsletter List -->
      <div v-if="newsletters.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card 
          v-for="newsletter in newsletters" 
          :key="newsletter.id"
          class="cursor-pointer hover:shadow-lg transition-shadow"
          @click="openNewsletter(newsletter)"
        >
          <template #header>
            <div class="bg-green-600 text-white p-4 text-center">
              <i class="pi pi-file-pdf text-4xl mb-2"></i>
              <div class="text-sm font-semibold">{{ newsletter.month }} {{ newsletter.year }}</div>
            </div>
          </template>
          <template #title>
            {{ newsletter.title }}
          </template>
          <template #subtitle>
            Published {{ formatDate(newsletter.publishedDate) }}
          </template>
          <template #content>
            <p class="text-surface-700 line-clamp-3">{{ newsletter.summary }}</p>
          </template>
          <template #footer>
            <Button 
              label="Read More" 
              icon="pi pi-arrow-right" 
              text
              class="w-full"
            />
          </template>
        </Card>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
        <h3 class="text-2xl font-bold text-surface-700 mb-2">No Newsletters Yet</h3>
        <p class="text-surface-600">Check back soon for chapter updates and news.</p>
      </div>

      <!-- Newsletter Modal -->
      <Dialog 
        v-model:visible="selectedNewsletter" 
        :header="selectedNewsletter?.title"
        :style="{ width: '90vw', maxWidth: '800px' }"
        :modal="true"
      >
        <div v-if="selectedNewsletter" class="newsletter-content">
          <div class="mb-4 text-surface-600">
            <i class="pi pi-calendar mr-2"></i>
            {{ formatDate(selectedNewsletter.publishedDate) }}
          </div>
          <div class="mb-6">
            <h3 class="text-xl font-bold mb-3">Summary</h3>
            <p class="text-surface-700">{{ selectedNewsletter.summary }}</p>
          </div>
          <div v-if="selectedNewsletter.pdfUrl" class="text-center">
            <Button 
              label="Download PDF" 
              icon="pi pi-download"
              @click="downloadNewsletter(selectedNewsletter)"
              class="bg-green-600 hover:bg-green-700"
            />
          </div>
        </div>
      </Dialog>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import Card from 'primevue/card'
  import Button from 'primevue/button'
  import Dialog from 'primevue/dialog'
  import { useNewsletterStore } from '@/stores/newsletter'

  const newsletterStore = useNewsletterStore()
  const newsletters = ref([])
  const selectedNewsletter = ref(null)

  onMounted(async () => {
    // Load newsletters from store (will connect to backend later)
    await newsletterStore.fetchNewsletters()
    newsletters.value = newsletterStore.newsletters
  })

  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const openNewsletter = (newsletter) => {
    selectedNewsletter.value = newsletter
  }

  const downloadNewsletter = (newsletter) => {
    if (newsletter.pdfUrl) {
      window.open(newsletter.pdfUrl, '_blank')
    }
  }
</script>

<style scoped>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>

