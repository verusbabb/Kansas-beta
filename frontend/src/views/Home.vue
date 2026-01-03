<template>
  <div class="relative min-h-screen">
    <!-- Hero Section with Background Image -->
    <div class="hero-container relative">
      <div 
        v-for="(imageUrl, index) in heroImageUrls" 
        :key="index"
        :class="[
          'hero-background-image',
          index === currentImageIndex ? 'opacity-100' : 'opacity-0'
        ]"
        :style="{ backgroundImage: `url(${imageUrl})` }"
      ></div>
      <div class="hero-overlay"></div>
      <div class="hero-content relative z-10 flex flex-col items-center justify-center text-center text-white px-6 py-20 lg:py-32">
        <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
          Beta Theta Pi
        </h1>
        <h2 class="text-2xl md:text-4xl lg:text-5xl font-semibold mb-4 text-gray-300">
          Alpha Nu Chapter
        </h2>
        <p class="text-lg md:text-xl lg:text-2xl mb-8 max-w-3xl">
          University of Kansas
        </p>
        <div class="flex flex-wrap gap-4 justify-center">
          <Button 
            label="Learn About Rush" 
            icon="pi pi-users" 
            @click="$router.push('/rush')"
            size="large"
            class="bg-gray-400 hover:bg-gray-500 border-gray-400"
          />
          <Button 
            label="Contact Us" 
            icon="pi pi-envelope" 
            @click="$router.push('/contact')"
            size="large"
            outlined
            class="border-white text-white hover:bg-white hover:text-[#6F8FAF]"
          />
        </div>
      </div>
    </div>

    <!-- About Section -->
    <div class="bg-surface-0 py-16 px-6 md:px-12 lg:px-20">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-surface-900 mb-4">
            Building Better Men
          </h2>
          <div class="w-24 h-1 bg-gray-400 mx-auto mb-6"></div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card class="text-center">
            <template #content>
              <div class="flex flex-col items-center">
                <i class="pi pi-users text-5xl text-[#6F8FAF] mb-4"></i>
                <h3 class="text-xl font-bold mb-3">Brotherhood</h3>
                <p class="text-surface-700">
                  Forging lifelong bonds of friendship and mutual support among our members.
                </p>
              </div>
            </template>
          </Card>

          <Card class="text-center">
            <template #content>
              <div class="flex flex-col items-center">
                <i class="pi pi-graduation-cap text-5xl text-[#6F8FAF] mb-4"></i>
                <h3 class="text-xl font-bold mb-3">Scholarship</h3>
                <p class="text-surface-700">
                  Committed to academic excellence and intellectual growth.
                </p>
              </div>
            </template>
          </Card>

          <Card class="text-center">
            <template #content>
              <div class="flex flex-col items-center">
                <i class="pi pi-heart text-5xl text-[#6F8FAF] mb-4"></i>
                <h3 class="text-xl font-bold mb-3">Service</h3>
                <p class="text-surface-700">
                  Giving back to our community and making a positive impact.
                </p>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>

    <!-- Quick Links Section -->
    <div class="bg-surface-50 py-16 px-6 md:px-12 lg:px-20">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-surface-900 mb-4">
            Explore Our Chapter
          </h2>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card class="cursor-pointer hover:shadow-lg transition-shadow" @click="$router.push('/rush')">
            <template #content>
              <div class="text-center">
                <i class="pi pi-users text-4xl text-[#6F8FAF] mb-3"></i>
                <h3 class="text-lg font-bold mb-2">Rush</h3>
                <p class="text-sm text-surface-600">Join our brotherhood</p>
              </div>
      </template>
          </Card>

          <Card class="cursor-pointer hover:shadow-lg transition-shadow" @click="$router.push('/newsletters')">
            <template #content>
        <div class="text-center">
                <i class="pi pi-book text-4xl text-[#6F8FAF] mb-3"></i>
                <h3 class="text-lg font-bold mb-2">Newsletters</h3>
                <p class="text-sm text-surface-600">Stay updated</p>
            </div>
            </template>
          </Card>

          <Card class="cursor-pointer hover:shadow-lg transition-shadow" @click="$router.push('/members')">
            <template #content>
              <div class="text-center">
                <i class="pi pi-id-card text-4xl text-[#6F8FAF] mb-3"></i>
                <h3 class="text-lg font-bold mb-2">People</h3>
                <p class="text-sm text-surface-600">Members, Alumni, Advisors & Leadership Teams</p>
            </div>
            </template>
          </Card>

          <Card class="cursor-pointer hover:shadow-lg transition-shadow" @click="$router.push('/contact')">
            <template #content>
              <div class="text-center">
                <i class="pi pi-envelope text-4xl text-[#6F8FAF] mb-3"></i>
                <h3 class="text-lg font-bold mb-2">Contact</h3>
                <p class="text-sm text-surface-600">Get in touch</p>
          </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  import Button from "primevue/button";
  import Card from "primevue/card";
  import { useHeroImageStore } from '@/stores/heroImage';

  const heroImageStore = useHeroImageStore();

  // Hero image URLs (signed URLs from GCS)
  const heroImageUrls = ref<string[]>([]);
  const imageUrlCache = ref<Record<string, string>>({});

  // Current image index - start with random image
  const currentImageIndex = ref(0);
  
  let rotationInterval: any = null;

  // Function to get next random image (different from current)
  const getNextRandomImage = () => {
    if (heroImageUrls.value.length <= 1) return 0;
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * heroImageUrls.value.length);
    } while (nextIndex === currentImageIndex.value && heroImageUrls.value.length > 1);
    return nextIndex;
  };

  // Rotate to next random image
  const rotateImage = () => {
    if (heroImageUrls.value.length > 0) {
      currentImageIndex.value = getNextRandomImage();
    }
  };

  // Load signed URLs for carousel images
  const loadCarouselImageUrls = async () => {
    try {
      await heroImageStore.fetchCarouselImages();
      
      // Load signed URLs for all carousel images
      const urls: string[] = [];
      for (const image of heroImageStore.carouselImages) {
        try {
          const url = await heroImageStore.getSignedUrl(image.id);
          urls.push(url);
          imageUrlCache.value[image.id] = url;
        } catch (error) {
          console.error(`Error loading image URL for ${image.id}:`, error);
        }
      }
      
      heroImageUrls.value = urls;
      
      // Set initial random index if we have images
      if (urls.length > 0) {
        currentImageIndex.value = Math.floor(Math.random() * urls.length);
      }
    } catch (error) {
      console.error('Error loading carousel images:', error);
      // Fallback to empty array
      heroImageUrls.value = [];
    }
  };

  onMounted(async () => {
    await loadCarouselImageUrls();
    
    // Rotate images every 5 seconds if we have images
    if (heroImageUrls.value.length > 1) {
      rotationInterval = setInterval(rotateImage, 5000);
    }
  });

  onUnmounted(() => {
    if (rotationInterval) {
      clearInterval(rotationInterval);
    }
  });
</script>

<style scoped>
  .hero-container {
    min-height: 70vh;
    position: relative;
    overflow: hidden;
  }

  .hero-background-image {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-size: cover;
    background-position: center;
    transition: opacity 1.5s ease-in-out;
    z-index: 0;
  }

  .hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.2) 0%,
      rgba(0, 0, 0, 0.1) 50%,
      rgba(0, 0, 0, 0.2) 100%
    );
  }

  .hero-content {
    min-height: 70vh;
  }

  @media (max-width: 768px) {
    .hero-container {
      min-height: 60vh;
    }
    .hero-content {
      min-height: 60vh;
    }
  }
</style>

