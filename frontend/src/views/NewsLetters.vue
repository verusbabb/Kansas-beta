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

      <!-- Loading State -->
      <div v-if="newsletterStore.loading" class="text-center py-16">
        <i class="pi pi-spin pi-spinner text-6xl text-[#6F8FAF] mb-4"></i>
        <p class="text-lg text-surface-600">Loading newsletters...</p>
      </div>

      <!-- Newsletter List -->
      <div v-else-if="sortedNewsletters.length > 0" class="space-y-4">
        <Card 
          v-for="newsletter in sortedNewsletters" 
          :key="newsletter.id"
          class="hover:shadow-md transition-shadow"
        >
          <template #content>
            <div class="flex flex-col md:flex-row gap-4">
              <!-- Newsletter Icon/Thumbnail -->
              <div class="flex-shrink-0">
                <div class="newsletter-icon-card">
                  <!-- Blue Header Section (matching newsletter header) -->
                  <div class="newsletter-icon-header">
                    <div class="header-content">
                      <img 
                        src="/crest.webp" 
                        alt="Beta Theta Pi Crest" 
                        class="crest-mini"
                        @error="$event.target.style.display = 'none'"
                      />
                      <div class="header-text">ALPHA NU</div>
                    </div>
                  </div>
                  
                  <!-- White Body Section -->
                  <div class="newsletter-icon-body">
                    <!-- Red Banner (matching newsletter banner) -->
                    <div class="red-banner">{{ newsletter.season.toUpperCase() }}</div>
                    
                    <!-- Year Display -->
                    <div class="year-display">{{ newsletter.year }}</div>
                  </div>
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

  const openNewsletter = async (newsletter) => {
    try {
      // Fetch signed URL from backend
      const signedUrl = await newsletterStore.getSignedUrl(newsletter.id)
      // Open signed URL in new tab
      window.open(signedUrl, '_blank')
    } catch (error) {
      console.error('Error opening newsletter:', error)
      // You could show a toast error here if desired
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

  /* Newsletter Icon Card - Document-like appearance */
  .newsletter-icon-card {
    min-width: 120px;
    max-width: 140px;
    background: white;
    border-radius: 6px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .newsletter-icon-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15), 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  /* Blue Header Section (matching newsletter header gradient) */
  .newsletter-icon-header {
    background: linear-gradient(to bottom, #5A7A9F, #6F8FAF);
    padding: 8px 6px;
    text-align: center;
    position: relative;
  }

  .header-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }

  .crest-mini {
    width: 24px;
    height: 24px;
    object-fit: contain;
    filter: brightness(0) invert(1); /* Make crest white to stand out on blue */
  }

  .header-text {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.5px;
    color: white;
    text-transform: uppercase;
  }

  /* White Body Section */
  .newsletter-icon-body {
    padding: 8px 6px;
    text-align: center;
    background: white;
  }

  /* Red Banner (matching newsletter red banner) */
  .red-banner {
    background: #DC2626;
    color: white;
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.5px;
    padding: 3px 5px;
    margin-bottom: 6px;
    border-radius: 2px;
    text-transform: uppercase;
  }

  /* Year Display */
  .year-display {
    font-size: 18px;
    font-weight: bold;
    color: #1f2937;
    font-family: 'Georgia', 'Times New Roman', serif;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .newsletter-icon-card {
      min-width: 100px;
      max-width: 120px;
    }

    .header-text {
      font-size: 9px;
    }

    .year-display {
      font-size: 16px;
    }

    .red-banner {
      font-size: 7px;
      padding: 2px 4px;
    }
  }
</style>

