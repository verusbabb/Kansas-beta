<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Support Beta Theta Pi</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Help support the Alpha Nu Chapter at the University of Kansas
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-12">
      <!-- Why Donate Section -->
      <div class="mb-12">
        <h2 class="text-3xl font-bold text-surface-900 mb-6 text-center">Why Donate?</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <template #content>
              <div class="text-center">
                <i class="pi pi-graduation-cap text-5xl text-[#6F8FAF] mb-4"></i>
                <h3 class="text-xl font-bold mb-3">Scholarship Support</h3>
                <p class="text-surface-700">
                  Help provide scholarships and academic support for our members.
                </p>
              </div>
            </template>
          </Card>

          <Card>
            <template #content>
              <div class="text-center">
                <i class="pi pi-home text-5xl text-[#6F8FAF] mb-4"></i>
                <h3 class="text-xl font-bold mb-3">Chapter House</h3>
                <p class="text-surface-700">
                  Support maintenance and improvements to our chapter house.
                </p>
              </div>
            </template>
          </Card>

          <Card>
            <template #content>
              <div class="text-center">
                <i class="pi pi-users text-5xl text-[#6F8FAF] mb-4"></i>
                <h3 class="text-xl font-bold mb-3">Brotherhood</h3>
                <p class="text-surface-700">
                  Fund events and activities that strengthen our brotherhood.
                </p>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Donation Options -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Online Donation -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-credit-card text-[#6F8FAF]"></i>
              <span>Online Donation</span>
            </div>
          </template>
          <template #content>
            <div class="flex flex-col gap-4">
              <p class="text-surface-700">
                Make a secure online donation to support the Alpha Nu Chapter.
              </p>
              <div class="flex flex-col gap-3">
                <InputNumber
                  v-model="donationAmount"
                  mode="currency"
                  currency="USD"
                  locale="en-US"
                  placeholder="Enter amount"
                  class="w-full"
                />
                <Button
                  label="Donate Now"
                  icon="pi pi-heart"
                  class="w-full bg-gray-500 hover:bg-gray-600"
                  @click="handleDonate"
                />
              </div>
              <p class="text-sm text-surface-600">
                You will be redirected to our secure payment processor.
              </p>
            </div>
          </template>
        </Card>

        <!-- Other Ways to Give -->
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle text-[#6F8FAF]"></i>
              <span>Other Ways to Give</span>
            </div>
          </template>
          <template #content>
            <div class="flex flex-col gap-4">
              <div>
                <h3 class="font-bold mb-2">Mail a Check</h3>
                <p class="text-surface-700 mb-2">
                  Send a check payable to:
                </p>
                <p class="text-surface-900 font-semibold">
                  Beta Theta Pi - Alpha Nu Chapter<br>
                  University of Kansas<br>
                  Lawrence, KS 66045
                </p>
              </div>

              <div>
                <h3 class="font-bold mb-2">Contact Us</h3>
                <p class="text-surface-700 mb-2">
                  For questions about donations or to discuss other giving options:
                </p>
                <a href="mailto:donations@betathetapi-ku.org" class="text-[#6F8FAF] hover:underline">
                  donations@betathetapi-ku.org
                </a>
              </div>

              <div>
                <h3 class="font-bold mb-2">Matching Gifts</h3>
                <p class="text-surface-700">
                  Many employers offer matching gift programs. Check with your employer to see if they match charitable donations.
                </p>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Thank You Message -->
      <div class="mt-12 bg-gray-50 rounded-lg p-8 text-center">
        <i class="pi pi-heart text-5xl text-[#6F8FAF] mb-4"></i>
        <h2 class="text-2xl font-bold text-surface-900 mb-4">Thank You for Your Support</h2>
        <p class="text-surface-700 max-w-2xl mx-auto">
          Your generosity helps us continue to build better men and strengthen our chapter. 
          Every contribution makes a difference in the lives of our members and the future of Alpha Nu.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import Card from 'primevue/card'
  import Button from 'primevue/button'
  import InputNumber from 'primevue/inputnumber'

  const donationAmount = ref(null)

  const handleDonate = () => {
    if (donationAmount.value && donationAmount.value > 0) {
      // TODO: Integrate with payment processor
      console.log('Donation amount:', donationAmount.value)
      alert(`Thank you for your donation of $${donationAmount.value.toFixed(2)}! Payment processing will be implemented soon.`)
    } else {
      alert('Please enter a donation amount.')
    }
  }
</script>

<style scoped>
  /* Additional styling if needed */
</style>

