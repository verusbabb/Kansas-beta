<template>
  <div class="flex lg:flex-row flex-col gap-4 lg:gap-0 bg-surface-0 dark:bg-surface-900 relative overflow-hidden min-h-screen lg:min-h-0">
    <div class="flex-1 flex items-center justify-center relative z-10">
      <div class="p-6 pt-8 lg:p-12 relative w-full">
        <!-- Mobile profile image - centered at top -->
        <div class="lg:hidden flex justify-center mb-6">
          <img
            src="/steve_2.jpeg"
            alt="profile"
            class="profile-image-mobile"
          />
        </div>
        <h1
          class="text-3xl lg:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4 lg:leading-normal text-center lg:text-left"
        >
          Hi, I'm Steve <br /><span class="text-blue-500 dark:text-blue-400"
            >Let me introduce you to my work</span
          >
        </h1>
        <p
          class="text-surface-700 dark:text-surface-200 leading-normal mb-8 text-center lg:text-left"
        >
          Actually, there is nothing to introduce you to yet.  It is all coming soon.
        </p>
        <div class="flex items-center justify-center lg:justify-start gap-6">
          <Button label="Contact Me" type="button" @click="showContactModal = true" />
        </div>
      </div>
    </div>
    <!-- Desktop image container -->
    <div class="hidden lg:flex flex-[0.75] pt-8 lg:pt-0 overflow-hidden relative lg:-ml-16 min-h-0">
      <!-- Wide, soft gradient overlay for seamless blend -->
      <div class="absolute left-0 top-0 bottom-0 w-64 lg:w-96 bg-gradient-to-r from-surface-0 via-surface-0/60 via-surface-0/20 to-transparent dark:from-surface-900 dark:via-surface-900/60 dark:via-surface-900/20 dark:to-transparent z-20 pointer-events-none"></div>
      <img
        src="/steve_2.jpeg"
        alt="hero-1"
        class="hero-image"
      />
    </div>

    <!-- Contact Modal -->
    <Dialog
      v-model:visible="showContactModal"
      modal
      :style="{ width: '25rem' }"
      :breakpoints="{ '960px': '75vw', '641px': '90vw' }"
    >
      <template #header>
        <h3 class="text-xl font-semibold">Contact Me</h3>
      </template>
      <div class="flex flex-col items-center gap-4">
        <img
          src="/steve_2.jpeg"
          alt="Steve"
          class="w-32 h-32 rounded-full object-cover border-4 border-surface-200 dark:border-surface-700"
        />
        <div class="text-center">
          <h4 class="text-2xl font-bold mb-4">Steve Babb</h4>
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-envelope text-primary"></i>
              <a href="mailto:stevebabbmail@gmail.com" class="text-primary hover:underline">
                stevebabbmail@gmail.com
              </a>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-linkedin text-primary"></i>
              <a href="https://www.linkedin.com/in/steve-babb/" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                linkedin.com/in/steve-babb
              </a>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>
<script setup>
  import { ref } from "vue";
  import Button from "primevue/button";
  import Dialog from "primevue/dialog";

  const showContactModal = ref(false);
</script>
<style scoped>
  /* Mobile profile image - centered hero image */
  .profile-image-mobile {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    object-fit: cover;
    object-position: center 20%;
  }

  /* Desktop hero image */
  .hero-image {
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: right;
    clip-path: polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
</style>

