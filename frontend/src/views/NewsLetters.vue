<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Chapter Newsletters</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Stay updated with Alpha Nu Chapter news and events
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-12">
      <!-- Intro Statement -->
      <div class="mb-8 text-center">
        <p class="text-lg text-surface-700 max-w-3xl mx-auto">
          Stay connected with the Alpha Nu Chapter through our quarterly newsletters. 
          Each edition features chapter updates, member highlights, upcoming events, and news from our brotherhood.
        </p>
      </div>

      <!-- Newsletter List -->
      <div v-if="sortedNewsletters.length > 0" class="space-y-4">
        <Card 
          v-for="newsletter in sortedNewsletters" 
          :key="newsletter.id"
          class="hover:shadow-md transition-shadow"
        >
          <template #content>
            <div class="flex flex-col md:flex-row gap-4">
              <!-- Newsletter Icon/Thumbnail -->
              <div class="flex-shrink-0">
                <div class="bg-gradient-to-br from-[#5A7A9F] to-[#6F8FAF] text-white p-6 rounded-lg text-center min-w-[120px]">
                  <i class="pi pi-file-pdf text-4xl mb-2 block"></i>
                  <div class="text-sm font-semibold capitalize">{{ newsletter.season }}</div>
                  <div class="text-lg font-bold">{{ newsletter.year }}</div>
                </div>
              </div>

              <!-- Newsletter Info -->
              <div class="flex-1 flex flex-col justify-between">
                <div>
                  <h3 class="text-xl font-bold text-surface-900 mb-2">
                    {{ formatNewsletterTitle(newsletter) }}
                  </h3>
                  <p class="text-surface-600 mb-4">
                    {{ formatNewsletterDescription(newsletter) }}
                  </p>
                </div>
                <div class="flex gap-2">
                  <Button
                    label="View Newsletter"
                    icon="pi pi-external-link"
                    @click="openNewsletter(newsletter)"
                    class="bg-[#6F8FAF] hover:bg-[#5A7A9F]"
                  />
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <i class="pi pi-inbox text-6xl text-surface-400 mb-4"></i>
        <h3 class="text-2xl font-bold text-surface-700 mb-2">No Newsletters Yet</h3>
        <p class="text-surface-600">Check back soon for chapter updates and news.</p>
      </div>

    </div>
  </div>
</template>

<script setup>
  import { onMounted, computed } from 'vue'
  import Card from 'primevue/card'
  import Button from 'primevue/button'
  import { useNewsletterStore } from '@/stores/newsletter'

  const newsletterStore = useNewsletterStore()

  // Use sorted newsletters from store getter
  const sortedNewsletters = computed(() => newsletterStore.sortedNewsletters)

  onMounted(async () => {
    // Load newsletters from store (will connect to backend later)
    await newsletterStore.fetchNewsletters()
  })

  const formatNewsletterTitle = (newsletter) => {
    const seasonCapitalized = newsletter.season.charAt(0).toUpperCase() + newsletter.season.slice(1)
    return `${seasonCapitalized} ${newsletter.year} Newsletter`
  }

  const formatNewsletterDescription = (newsletter) => {
    return `Read the ${newsletter.season} ${newsletter.year} newsletter to stay updated with chapter news, events, and member highlights.`
  }

  const openNewsletter = (newsletter) => {
    // Open newsletter link in new tab
    if (newsletter.link) {
      window.open(newsletter.link, '_blank')
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

