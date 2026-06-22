<template>
  <div class="relative min-h-screen">
    <!-- Hero Section with Background Image -->
    <div class="hero-container relative">
      <!-- Loading/placeholder background - always show until images are ready -->
      <div 
        v-if="isLoadingImages || loadedImages.length === 0"
        class="absolute inset-0 bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] z-0"
        :class="{ 'flex items-center justify-center': isLoadingImages && heroImageUrls.length === 0 }"
      >
        <div v-if="isLoadingImages && heroImageUrls.length === 0" class="text-white text-center">
          <i class="pi pi-spin pi-spinner text-4xl mb-2"></i>
          <div class="text-sm">Loading images...</div>
        </div>
      </div>
      
      <!-- Error state (only show if we tried and failed) -->
      <div 
        v-else-if="imageLoadError && heroImageUrls.length === 0"
        class="absolute inset-0 bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] z-0"
      ></div>
      
      <!-- Hero images - only show when actually loaded -->
      <div 
        v-for="(imageUrl, index) in loadedImages" 
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
        <div class="scroll-indicator" @click="scrollPastHero">
          <span class="scroll-indicator-label">Explore</span>
          <div class="scroll-indicator-chevron">
            <i class="pi pi-angle-down"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Our Seven Values Section -->
    <div class="bg-slate-50 py-20 px-6 md:px-12 lg:px-20">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-4xl md:text-5xl font-bold text-surface-900 mb-5">Our Seven Values</h2>
          <div class="w-16 h-1 bg-[#6F8FAF] mx-auto rounded-full"></div>
          <p class="mt-6 text-surface-500 text-base italic max-w-xl mx-auto">
            Dive deeper into each value through the newsletter edition that brings it to life.
          </p>
        </div>

        <div class="flex flex-wrap justify-center gap-4 md:gap-5">
          <div
            v-for="value in sevenValues"
            :key="value.number"
            class="seven-value-card"
          >
            <span class="seven-value-number">{{ value.number }}</span>
            <h3 class="seven-value-title">{{ value.title }}</h3>
            <button
              v-if="'newsletter' in value"
              class="seven-value-newsletter-link"
              @click="openValueNewsletter(value.newsletter.season, value.newsletter.year)"
            >
              <i class="pi pi-file-pdf text-xs"></i>
              Featured in {{ value.newsletter.season.charAt(0).toUpperCase() + value.newsletter.season.slice(1) }} {{ value.newsletter.year }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rush CTA Banner -->
    <div class="rush-cta-banner">
      <div class="rush-cta-inner max-w-6xl mx-auto">
        <div class="rush-cta-text">
          <h2 class="rush-cta-heading">Interested in Joining Beta?</h2>
          <p class="rush-cta-sub">
            Rush season is your chance to meet the brothers, experience chapter life firsthand, and find out if Alpha Nu is the right fit for you.
          </p>
        </div>
        <Button
          label="Learn About Rush"
          icon="pi pi-arrow-right"
          iconPos="right"
          size="large"
          class="rush-cta-btn"
          @click="$router.push('/rush')"
        />
      </div>
    </div>

    <!-- Upcoming Events Strip -->
    <div class="bg-white py-16 px-6 md:px-12 lg:px-20">
      <div class="max-w-6xl mx-auto">
        <div class="section-header-row">
          <div>
            <h2 class="section-title">What's Coming Up</h2>
            <div class="section-rule"></div>
          </div>
          <button class="section-see-all" @click="$router.push('/events')">
            Full Calendar <i class="pi pi-arrow-right text-xs ml-1"></i>
          </button>
        </div>

        <div v-if="calendarStore.loading" class="flex justify-center py-12">
          <i class="pi pi-spin pi-spinner text-2xl text-[#6F8FAF]"></i>
        </div>
        <div v-else-if="nextEvents.length === 0" class="empty-state-msg">
          <i class="pi pi-calendar text-3xl text-slate-300 mb-3 block"></i>
          <p>No upcoming events scheduled. Check back soon.</p>
        </div>
        <div v-else class="events-grid">
          <button
            v-for="ev in nextEvents"
            :key="ev.id"
            type="button"
            class="event-card text-left"
            @click="$router.push({ path: '/events', query: { event: ev.id } })"
          >
            <div class="event-date-badge">
              <span class="event-month">{{ eventMonth(ev.startDate) }}</span>
              <span class="event-day">{{ eventDay(ev.startDate) }}</span>
              <span class="event-dow">{{ eventDow(ev.startDate) }}</span>
            </div>
            <div class="event-info">
              <h3 class="event-name">{{ ev.name }}</h3>
              <p v-if="!ev.allDay && ev.startTime" class="event-time">
                <i class="pi pi-clock text-xs mr-1"></i>{{ formatEventTime(ev.startTime) }}
              </p>
              <p v-else-if="ev.allDay" class="event-time">All Day</p>
              <span v-if="isMultiDay(ev)" class="event-multiday-badge">Multi-day</span>
              <p v-if="ev.description" class="event-desc">{{ plainText(ev.description) }}</p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Latest Newsletter Feature -->
    <div class="bg-slate-50 py-16 px-6 md:px-12 lg:px-20">
      <div class="max-w-6xl mx-auto">
        <div class="section-header-row">
          <div>
            <h2 class="section-title">From the Chapter</h2>
            <div class="section-rule"></div>
          </div>
          <button class="section-see-all" @click="$router.push('/newsletters')">
            All Newsletters <i class="pi pi-arrow-right text-xs ml-1"></i>
          </button>
        </div>

        <div v-if="newsletterStore.loading" class="flex justify-center py-12">
          <i class="pi pi-spin pi-spinner text-2xl text-[#6F8FAF]"></i>
        </div>
        <div v-else-if="latestNewsletter" class="newsletter-feature-card">
          <div class="newsletter-feature-icon-wrap">
            <i class="pi pi-file-pdf newsletter-feature-icon"></i>
          </div>
          <div class="newsletter-feature-body">
            <span class="newsletter-feature-label">Latest Issue</span>
            <h3 class="newsletter-feature-title">
              {{ capitalize(latestNewsletter.season) }} {{ latestNewsletter.year }} Newsletter
            </h3>
            <p class="newsletter-feature-desc">
              Stay connected with the latest news, chapter highlights, alumni spotlights, and more from the Alpha Nu brotherhood.
            </p>
            <Button
              label="Read Now"
              icon="pi pi-external-link"
              iconPos="right"
              size="small"
              class="newsletter-feature-btn"
              @click="openLatestNewsletter"
            />
          </div>
        </div>
        <div v-else class="empty-state-msg">
          <i class="pi pi-book text-3xl text-slate-300 mb-3 block"></i>
          <p>No newsletters available yet.</p>
        </div>
      </div>
    </div>

    <!-- Chapter at a Glance -->
    <div class="chapter-glance-section">
      <div class="max-w-5xl mx-auto px-6">
        <h2 class="chapter-glance-heading">Alpha Nu at a Glance</h2>
        <div class="chapter-glance-grid">
          <div v-for="stat in chapterStats" :key="stat.label" class="chapter-glance-stat">
            <i :class="['pi', stat.icon, 'chapter-glance-icon']"></i>
            <div class="chapter-glance-value">{{ stat.value }}</div>
            <div class="chapter-glance-label">{{ stat.label }}</div>
          </div>
        </div>

        <div class="chapter-truisms">
          <div v-for="truism in chapterTruisms" :key="truism.text" class="chapter-truism-item">
            <span v-if="truism.svg" class="chapter-truism-svg-icon" v-html="truism.svg"></span>
            <i v-else :class="['pi', truism.icon, 'chapter-truism-icon']"></i>
            <span class="chapter-truism-text">{{ truism.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useCalendarEventStore, type CalendarEvent } from '@/stores/calendarEvent';

  // newsletter: { season, year } ties the value to a specific newsletter issue.
  // Leave newsletter undefined for values not yet linked.
  const sevenValues = [
    { number: 1, title: 'Cultivation of the Intellect', newsletter: { season: 'fall', year: 2021 } },
    { number: 2, title: 'Creating a Strong Pledge Class Bond', newsletter: { season: 'spring', year: 2022 } },
    { number: 3, title: 'Becoming Gentlemen', newsletter: { season: 'spring', year: 2024 } },
    { number: 4, title: 'Time Management Skills', newsletter: { season: 'spring', year: 2023 } },
    { number: 5, title: 'Respect for the Hutt', newsletter: { season: 'fall', year: 2022 } },
    { number: 6, title: 'Accountability', newsletter: { season: 'fall', year: 2023 } },
    { number: 7, title: 'Soundness of Body and Mind', newsletter: { season: 'spring', year: 2025 } },
  ] as const;
  import Button from "primevue/button";
  import { useHeroImageStore } from '@/stores/heroImage';
  import { useNewsletterStore } from '@/stores/newsletter';

  const heroImageStore = useHeroImageStore();
  const newsletterStore = useNewsletterStore();
  const calendarStore = useCalendarEventStore();

  // ---------- Upcoming Events ----------
  const nextEvents = computed(() => calendarStore.upcomingEvents.slice(0, 3));

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function eventMonth(dateStr: string): string {
    return MONTHS[new Date(dateStr + 'T00:00:00').getMonth()];
  }
  function eventDay(dateStr: string): number {
    return new Date(dateStr + 'T00:00:00').getDate();
  }
  function eventDow(dateStr: string): string {
    return DAYS[new Date(dateStr + 'T00:00:00').getDay()];
  }
  function formatEventTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  function plainText(html: string): string {
    return html
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function isMultiDay(ev: CalendarEvent): boolean {
    return ev.startDate !== ev.endDate;
  }

  // ---------- Latest Newsletter ----------
  const latestNewsletter = computed(() => newsletterStore.sortedNewsletters[0] ?? null);

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const openLatestNewsletter = async () => {
    if (!latestNewsletter.value) return;
    const url = await newsletterStore.getSignedUrl(latestNewsletter.value.id);
    window.open(url, '_blank');
  };

  // ---------- Chapter at a Glance ----------
  const theaterMasksSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 34" width="42" height="28" aria-hidden="true">',
    '<ellipse cx="16" cy="17" rx="13" ry="14" fill="#7aa3c8" opacity="0.55"/>',
    '<ellipse cx="11" cy="14" rx="1.8" ry="2.2" fill="white" opacity="0.9"/>',
    '<ellipse cx="21" cy="14" rx="1.8" ry="2.2" fill="white" opacity="0.9"/>',
    '<path d="M9 23 Q16 18 23 23" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>',
    '<ellipse cx="11" cy="18" rx="1" ry="1.4" fill="white" opacity="0.5"/>',
    '<ellipse cx="36" cy="17" rx="13" ry="14" fill="#7aa3c8"/>',
    '<ellipse cx="31" cy="14" rx="1.8" ry="2.2" fill="white" opacity="0.9"/>',
    '<ellipse cx="41" cy="14" rx="1.8" ry="2.2" fill="white" opacity="0.9"/>',
    '<path d="M29 20 Q36 27 43 20" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>',
    '</svg>',
  ].join('')

  const chapterTruisms = [
    { icon: 'pi-star',   svg: null, text: 'Campus Leaders and Student Body Presidents' },
    { icon: 'pi-trophy', svg: null, text: 'Perennial Intramural Champions' },
    { icon: '',          svg: theaterMasksSvg, text: 'Rock Chalk Revue Winners' },
  ];

  const chapterStats = [
    { value: 'Est. 1873', label: 'Alpha Nu Founded',          icon: 'pi-history'        },
    { value: '25',        label: 'Brothers Per Pledge Class', icon: 'pi-users'          },
    { value: '94 of 100', label: 'Semesters Atop KU IFC GPA Rankings', icon: 'pi-graduation-cap' },
    { value: '1,000+',   label: 'Active Alumni & a Network That Opens Doors', icon: 'pi-globe' },
    { value: 'Lawrence', label: 'Kansas — Home of the Jayhawks', icon: 'pi-map-marker' },
  ] as const;

  // Hero image URLs (signed URLs from GCS)
  const heroImageUrls = ref<string[]>([]);
  // Images that have actually been loaded/preloaded
  const loadedImages = ref<string[]>([]);
  const imageUrlCache = ref<Record<string, string>>({});
  const isLoadingImages = ref(true);
  const imageLoadError = ref(false);

  // Current image index - start with random image
  const currentImageIndex = ref(0);
  
  let rotationInterval: any = null;

  // Function to get next random image (different from current)
  const getNextRandomImage = () => {
    if (loadedImages.value.length <= 1) return 0;
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * loadedImages.value.length);
    } while (nextIndex === currentImageIndex.value && loadedImages.value.length > 1);
    return nextIndex;
  };

  // Rotate to next random image
  const rotateImage = () => {
    if (loadedImages.value.length > 0) {
      currentImageIndex.value = getNextRandomImage();
    }
  };

  // Preload an image and return a promise that resolves when it's loaded
  const preloadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = reject;
      img.src = url;
    });
  };

  // Preload all images before showing them
  const preloadImages = async (urls: string[]) => {
    if (urls.length === 0) return;
    
    try {
      // Preload at least the first image before showing anything
      await preloadImage(urls[0]);
      loadedImages.value = [urls[0]];
      
      // Preload remaining images in background
      const remainingUrls = urls.slice(1);
      const preloadPromises = remainingUrls.map(url => 
        preloadImage(url).catch(err => {
          console.error('Failed to preload image:', url, err);
          return null;
        })
      );
      
      const loaded = await Promise.all(preloadPromises);
      // Add successfully loaded images
      const successfulUrls = loaded.filter((url): url is string => url !== null);
      loadedImages.value = [urls[0], ...successfulUrls];
    } catch (error) {
      console.error('Error preloading first image:', error);
      // Fallback: show URLs anyway if preloading fails
      loadedImages.value = urls;
    }
  };

  // Load signed URLs for carousel images with retry logic
  const loadCarouselImageUrls = async (retryCount = 0) => {
    const maxRetries = 3;
    isLoadingImages.value = true;
    imageLoadError.value = false;

    try {
      await heroImageStore.fetchCarouselImages();
      
      if (heroImageStore.carouselImages.length === 0) {
        isLoadingImages.value = false;
        return;
      }
      
      // Load signed URLs for all carousel images in parallel
      const urlPromises = heroImageStore.carouselImages.map(async (image) => {
        try {
          const url = await heroImageStore.getSignedUrl(image.id);
          imageUrlCache.value[image.id] = url;
          return url;
        } catch (error) {
          console.error(`Error loading image URL for ${image.id}:`, error);
          return null;
        }
      });
      
      const urls = (await Promise.all(urlPromises)).filter((url): url is string => url !== null);
      
      if (urls.length === 0 && retryCount < maxRetries) {
        // Retry if we got images but failed to get URLs
        console.log(`Retrying image URL fetch (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return loadCarouselImageUrls(retryCount + 1);
      }
      
      heroImageUrls.value = urls;
      
      // Preload images before showing them
      if (urls.length > 0) {
        await preloadImages(urls);
        // Set initial random index after preloading
        if (loadedImages.value.length > 0) {
          currentImageIndex.value = Math.floor(Math.random() * loadedImages.value.length);
        }
      } else {
        imageLoadError.value = true;
      }
    } catch (error) {
      console.error('Error loading carousel images:', error);
      
      if (retryCount < maxRetries) {
        // Retry on error
        console.log(`Retrying carousel image fetch (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return loadCarouselImageUrls(retryCount + 1);
      } else {
        imageLoadError.value = true;
        heroImageUrls.value = [];
      }
    } finally {
      isLoadingImages.value = false;
    }
  };

  // Open the newsletter PDF that corresponds to a value card.
  const openValueNewsletter = async (season: string, year: number) => {
    if (newsletterStore.newsletters.length === 0) {
      await newsletterStore.fetchNewsletters()
    }
    const match = newsletterStore.newsletters.find(
      (n) => n.season === season && n.year === year,
    )
    if (!match) return
    const url = await newsletterStore.getSignedUrl(match.id)
    window.open(url, '_blank')
  }

  const scrollPastHero = () => {
    const hero = document.querySelector('.hero-container') as HTMLElement | null;
    if (hero) {
      window.scrollTo({ top: hero.offsetHeight, behavior: 'smooth' });
    }
  };

  onMounted(async () => {
    newsletterStore.fetchNewsletters()  // pre-load in background; not awaited
    calendarStore.fetchUpcoming()       // pre-load in background; not awaited
    await loadCarouselImageUrls();
    
    // Rotate images every 5 seconds if we have images
    if (loadedImages.value.length > 1) {
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

  /* Seven Values cards */
  .seven-value-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.875rem;
    background: linear-gradient(160deg, #ffffff 60%, #f0f5fa 100%);
    border: 1px solid #dce8f0;
    border-top: 4px solid transparent;
    border-image: linear-gradient(90deg, #6F8FAF, #5A7A9F) 1;
    border-radius: 1rem;
    /* border-image disables border-radius on the top — use outline trick instead */
    border-image: none;
    border-top: 4px solid #6F8FAF;
    border-radius: 1rem;
    padding: 1.75rem 1.25rem 1.5rem;
    width: calc(50% - 0.5rem);
    box-shadow: 0 2px 8px rgba(111, 143, 175, 0.1);
    transition: box-shadow 0.25s ease, transform 0.25s ease, background 0.25s ease, border-top-color 0.25s ease;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  /* Subtle shimmer stripe in the top corner */
  .seven-value-card::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 80px;
    height: 80px;
    background: radial-gradient(circle at top right, rgba(111, 143, 175, 0.08), transparent 70%);
    pointer-events: none;
  }

  .seven-value-card:hover {
    box-shadow: 0 10px 32px rgba(111, 143, 175, 0.22);
    transform: translateY(-4px);
    background: linear-gradient(160deg, #ffffff 40%, #e8f0f8 100%);
    border-top-color: #5A7A9F;
  }

  @media (min-width: 640px) {
    .seven-value-card {
      width: calc(33.333% - 0.875rem);
    }
  }

  @media (min-width: 1024px) {
    .seven-value-card {
      width: calc(25% - 1rem);
    }
  }

  .seven-value-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 9999px;
    background: linear-gradient(135deg, #7a9bbf, #4e6e8e);
    color: white;
    font-size: 1.2rem;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow:
      0 0 0 4px rgba(111, 143, 175, 0.15),
      0 3px 10px rgba(111, 143, 175, 0.35);
    transition: box-shadow 0.25s ease, transform 0.25s ease;
  }

  .seven-value-card:hover .seven-value-number {
    box-shadow:
      0 0 0 6px rgba(111, 143, 175, 0.2),
      0 4px 14px rgba(111, 143, 175, 0.45);
    transform: scale(1.08);
  }

  .seven-value-title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.4;
  }

  .seven-value-newsletter-link {
    margin-top: 0.5rem;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: #6F8FAF;
    font-weight: 600;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.15s ease;
  }

  .seven-value-newsletter-link:hover {
    color: #5A7A9F;
  }

  /* ─────────────── Scroll Indicator ─────────────── */
  .scroll-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    margin-top: 2rem;
    opacity: 0.75;
    transition: opacity 0.2s;
    user-select: none;
  }

  .scroll-indicator:hover {
    opacity: 1;
  }

  .scroll-indicator-label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.85);
  }

  .scroll-indicator-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1.5px solid rgba(255, 255, 255, 0.45);
    border-radius: 9999px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.1rem;
    animation: bounce-down 2s ease-in-out infinite;
  }

  @keyframes bounce-down {
    0%, 100% { transform: translateY(0);   opacity: 0.75; }
    50%       { transform: translateY(5px); opacity: 1;    }
  }

  /* ─────────────── Rush CTA Banner ─────────────── */
  .rush-cta-banner {
    background: linear-gradient(135deg, #2c4a66 0%, #3d5f7e 50%, #2c4a66 100%);
    padding: 4rem 1.5rem;
    position: relative;
    overflow: hidden;
  }

  .rush-cta-banner::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    pointer-events: none;
  }

  .rush-cta-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    flex-wrap: wrap;
    position: relative;
    z-index: 1;
  }

  .rush-cta-text {
    flex: 1;
    min-width: 240px;
  }

  .rush-cta-heading {
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 0.75rem;
    line-height: 1.2;
  }

  .rush-cta-sub {
    color: rgba(255,255,255,0.8);
    font-size: 1rem;
    line-height: 1.65;
    max-width: 560px;
  }

  .rush-cta-btn {
    background: #ffffff !important;
    color: #2c4a66 !important;
    border-color: #ffffff !important;
    font-weight: 700 !important;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.2s, transform 0.2s, box-shadow 0.2s !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25) !important;
  }

  .rush-cta-btn:hover {
    background: #e8f0f8 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
  }

  /* ─────────────── Shared section helpers ─────────────── */
  .section-header-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 2.5rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .section-title {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 800;
    color: #1e293b;
    line-height: 1.2;
  }

  .section-rule {
    width: 3rem;
    height: 4px;
    background: #6F8FAF;
    border-radius: 9999px;
    margin-top: 0.6rem;
  }

  .section-see-all {
    background: none;
    border: none;
    color: #6F8FAF;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    padding: 0;
    transition: color 0.15s;
  }
  .section-see-all:hover { color: #4d6e8a; }

  .empty-state-msg {
    text-align: center;
    padding: 3rem 1rem;
    color: #94a3b8;
    font-size: 0.95rem;
  }

  /* ─────────────── Upcoming Events Grid ─────────────── */
  .events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  .event-card {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    padding: 1.25rem 1.25rem 1.25rem 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
    cursor: pointer;
    font: inherit;
    width: 100%;
  }

  .event-card:hover {
    box-shadow: 0 8px 24px rgba(111, 143, 175, 0.18);
    transform: translateY(-2px);
    border-color: #b8cfe2;
  }

  .event-date-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(160deg, #7a9bbf, #4e6e8e);
    color: #ffffff;
    border-radius: 0.75rem;
    min-width: 3.5rem;
    padding: 0.5rem 0.5rem;
    text-align: center;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(111, 143, 175, 0.35);
  }

  .event-month {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.85;
  }

  .event-day {
    font-size: 1.75rem;
    font-weight: 800;
    line-height: 1;
    margin: 0.1rem 0;
  }

  .event-dow {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.8;
  }

  .event-info {
    flex: 1;
    min-width: 0;
  }

  .event-name {
    font-size: 1rem;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.35;
    margin-bottom: 0.3rem;
  }

  .event-time {
    font-size: 0.8rem;
    color: #64748b;
    display: flex;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .event-multiday-badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 600;
    color: #6F8FAF;
    background: #eef3f8;
    border-radius: 9999px;
    padding: 0.1rem 0.55rem;
    margin-bottom: 0.35rem;
  }

  .event-desc {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-top: 0.35rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* ─────────────── Latest Newsletter Feature ─────────────── */
  .newsletter-feature-card {
    display: flex;
    align-items: center;
    gap: 2.5rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-left: 6px solid #6F8FAF;
    border-radius: 1.25rem;
    padding: 2.5rem 2rem;
    box-shadow: 0 4px 16px rgba(111, 143, 175, 0.1);
    transition: box-shadow 0.2s, transform 0.2s;
    flex-wrap: wrap;
  }

  .newsletter-feature-card:hover {
    box-shadow: 0 10px 32px rgba(111, 143, 175, 0.2);
    transform: translateY(-2px);
  }

  .newsletter-feature-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 6rem;
    height: 6rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, #7a9bbf, #4e6e8e);
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(111, 143, 175, 0.35);
  }

  .newsletter-feature-icon {
    font-size: 2.5rem;
    color: #ffffff;
  }

  .newsletter-feature-body {
    flex: 1;
    min-width: 200px;
  }

  .newsletter-feature-label {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6F8FAF;
    background: #eef3f8;
    border-radius: 9999px;
    padding: 0.2rem 0.75rem;
    margin-bottom: 0.75rem;
  }

  .newsletter-feature-title {
    font-size: clamp(1.25rem, 2.5vw, 1.75rem);
    font-weight: 800;
    color: #1e293b;
    line-height: 1.25;
    margin-bottom: 0.75rem;
  }

  .newsletter-feature-desc {
    font-size: 0.925rem;
    color: #64748b;
    line-height: 1.65;
    max-width: 520px;
    margin-bottom: 0.5rem;
  }

  .newsletter-feature-btn {
    background: linear-gradient(135deg, #7a9bbf, #4e6e8e) !important;
    border-color: transparent !important;
    font-weight: 700 !important;
    color: #ffffff !important;
    transition: opacity 0.2s, transform 0.2s !important;
    box-shadow: 0 3px 10px rgba(111, 143, 175, 0.4) !important;
  }

  .newsletter-feature-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  /* ─────────────── Chapter at a Glance ─────────────── */
  .chapter-glance-section {
    background: linear-gradient(135deg, #1e3449 0%, #2c4a66 50%, #1e3449 100%);
    padding: 5rem 1.5rem;
    position: relative;
    overflow: hidden;
  }

  .chapter-glance-section::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -10%;
    width: 60%;
    height: 200%;
    background: radial-gradient(ellipse at center, rgba(111,143,175,0.12) 0%, transparent 60%);
    pointer-events: none;
  }

  .chapter-glance-heading {
    text-align: center;
    font-size: clamp(1.25rem, 3vw, 1.75rem);
    font-weight: 300;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    margin-bottom: 3.5rem;
    position: relative;
    z-index: 1;
  }

  .chapter-glance-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3rem 2rem;
    position: relative;
    z-index: 1;
  }

  @media (min-width: 640px) {
    .chapter-glance-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
  }

  @media (min-width: 1024px) {
    .chapter-glance-grid {
      grid-template-columns: repeat(5, 1fr);
      gap: 2rem;
    }
  }

  .chapter-glance-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
  }

  .chapter-glance-icon {
    font-size: 1.5rem;
    color: rgba(111, 143, 175, 0.7);
    margin-bottom: 0.25rem;
  }

  .chapter-glance-value {
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    font-weight: 800;
    color: #ffffff;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .chapter-glance-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: rgba(255,255,255,0.55);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1.4;
    max-width: 160px;
  }

  .chapter-truisms {
    margin-top: 3.5rem;
    padding-top: 2.5rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .chapter-truism-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.75rem;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 1rem;
    padding: 1.75rem 1.25rem;
    transition: background 0.2s, border-color 0.2s;
  }

  .chapter-truism-item:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(111,143,175,0.5);
  }

  .chapter-truism-icon {
    font-size: 1.75rem;
    color: #7aa3c8;
  }

  .chapter-truism-svg-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.75rem;
  }

  .chapter-truism-text {
    font-size: 1rem;
    font-weight: 600;
    color: rgba(255,255,255,0.88);
    line-height: 1.45;
  }
</style>

