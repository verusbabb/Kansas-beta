<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-[#5A7A9F] via-[#6F8FAF] to-[#5A7A9F] text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Get in touch with the Alpha Nu Chapter
        </p>
        <div class="w-32 h-1 bg-gray-400 mx-auto"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-6 py-12">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Contact Form -->
        <Card>
          <template #title>
            Send Us a Message
          </template>
          <template #content>
            <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <label for="name" class="font-semibold">Name *</label>
                <InputText 
                  id="name"
                  v-model="form.name" 
                  placeholder="Your name"
                  :class="{ 'p-invalid': errors.name }"
                  required
                />
                <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
              </div>

              <div class="flex flex-col gap-2">
                <label for="email" class="font-semibold">Email *</label>
                <InputText 
                  id="email"
                  v-model="form.email" 
                  type="email"
                  placeholder="your.email@example.com"
                  :class="{ 'p-invalid': errors.email }"
                  required
                />
                <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
              </div>

              <div class="flex flex-col gap-2">
                <label for="subject" class="font-semibold">Subject *</label>
                <Select
                  id="subject"
                  v-model="form.subject"
                  :options="subjectOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select a subject"
                  :class="{ 'p-invalid': errors.subject }"
                />
                <small v-if="errors.subject" class="p-error">{{ errors.subject }}</small>
              </div>

              <div v-if="recipientEmail" class="flex flex-col gap-2">
                <label class="font-semibold text-surface-600">To</label>
                <div class="flex items-center gap-2 px-3 py-2 bg-surface-100 border border-surface-200 rounded-md text-surface-700 text-sm">
                  <i class="pi pi-envelope text-[#6F8FAF]"></i>
                  <span>{{ recipientEmail }}</span>
                </div>
                <small class="text-surface-500 text-xs">Your message will be addressed to this chapter mailbox.</small>
              </div>

              <div class="flex flex-col gap-2">
                <label for="message" class="font-semibold">Message *</label>
                <Textarea 
                  id="message"
                  v-model="form.message" 
                  rows="5"
                  placeholder="Your message..."
                  :class="{ 'p-invalid': errors.message }"
                  required
                />
                <small v-if="errors.message" class="p-error">{{ errors.message }}</small>
              </div>

              <Button
                type="submit"
                label="Open in Email App"
                icon="pi pi-send"
                class="bg-gray-500 hover:bg-gray-600"
              />
              <small class="text-surface-500 text-xs -mt-2">
                Clicking "Open in Email App" will open your default mail app with the message pre-filled.
              </small>
            </form>
          </template>
        </Card>

        <!-- Contact Information -->
        <div class="flex flex-col gap-6">
          <Card>
            <template #title>
              Chapter Information
            </template>
            <template #content>
              <div class="flex flex-col gap-4">
                <div class="flex items-start gap-3">
                  <i class="pi pi-map-marker text-2xl text-[#6F8FAF] mt-1"></i>
                  <div>
                    <h3 class="font-bold mb-1">Address</h3>
                    <p class="text-surface-700">
                      Beta Theta Pi - Alpha Nu Chapter<br>
                      1425 Tennessee Street<br>
                      Lawrence, KS 66044
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <i class="pi pi-instagram text-2xl text-[#6F8FAF]"></i>
                  <Button
                    label="Instagram"
                    text
                    class="!p-0 text-[#6F8FAF] hover:underline"
                    @click="openSocial('instagram')"
                  />
                  <i class="pi pi-facebook text-2xl text-[#6F8FAF] ml-4"></i>
                  <Button
                    label="Facebook"
                    text
                    class="!p-0 text-[#6F8FAF] hover:underline"
                    @click="openSocial('facebook')"
                  />
                  <i class="pi pi-twitter text-2xl text-[#6F8FAF] ml-4"></i>
                  <Button
                    label="X"
                    text
                    class="!p-0 text-[#6F8FAF] hover:underline"
                    @click="openSocial('twitter')"
                  />
                </div>
              </div>
            </template>
          </Card>

          <Card>
            <template #title>
              Leadership Contacts
            </template>
            <template #content>
              <div class="flex flex-col gap-4">
                <div v-for="leader in leadershipContacts" :key="leader.role" class="flex items-start gap-3">
                  <i :class="leader.icon" class="text-xl text-[#6F8FAF] mt-1"></i>
                  <div>
                    <h3 class="font-bold">{{ leader.role }}</h3>
                    <a :href="`mailto:${leader.email}`" class="text-[#6F8FAF] hover:underline text-sm">
                      {{ leader.email }}
                    </a>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import Card from 'primevue/card'
  import InputText from 'primevue/inputtext'
  import Select from 'primevue/select'
  import Textarea from 'primevue/textarea'
  import Button from 'primevue/button'

  const form = ref({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const errors = ref({})

  const subjectOptions = [
    { label: 'General Inquiry', value: 'general' },
    { label: 'Rush Information', value: 'rush' },
    { label: 'External / Alumni Relations', value: 'alumni' },
    { label: 'Event Information', value: 'events' },
    { label: 'Other', value: 'other' }
  ]

  /** Maps subject value → chapter role mailbox */
  const SUBJECT_EMAIL_MAP = {
    general: 'president@kansasbeta.org',
    rush:    'recruitment@kansasbeta.org',
    alumni:  'vp-external@kansasbeta.org',
    events:  'vp-external@kansasbeta.org',
    other:   'president@kansasbeta.org',
  }

  const recipientEmail = computed(() =>
    form.value.subject ? (SUBJECT_EMAIL_MAP[form.value.subject] ?? 'president@kansasbeta.org') : ''
  )

  const subjectLabel = computed(() =>
    subjectOptions.find((o) => o.value === form.value.subject)?.label ?? ''
  )

  const leadershipContacts = ref([
    {
      role: 'Chapter President',
      email: 'president@kansasbeta.org',
      icon: 'pi pi-user'
    },
    {
      role: 'Rush Chair',
      email: 'recruitment@kansasbeta.org',
      icon: 'pi pi-users'
    },
    {
      role: 'VP External / Alumni Relations',
      email: 'vp-external@kansasbeta.org',
      icon: 'pi pi-id-card'
    }
  ])

  const validateForm = () => {
    errors.value = {}

    if (!form.value.name.trim()) {
      errors.value.name = 'Name is required'
    }

    if (!form.value.email.trim()) {
      errors.value.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
      errors.value.email = 'Please enter a valid email address'
    }

    if (!form.value.subject) {
      errors.value.subject = 'Please select a subject'
    }

    if (!form.value.message.trim()) {
      errors.value.message = 'Message is required'
    }

    return Object.keys(errors.value).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return

    const to      = encodeURIComponent(recipientEmail.value)
    const subject = encodeURIComponent(`[Alpha Nu] ${subjectLabel.value} — from ${form.value.name}`)
    const body    = encodeURIComponent(
      `Name: ${form.value.name}\nEmail: ${form.value.email}\n\n${form.value.message}`
    )

    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  const openSocial = () => {
    // Social media links not yet configured
  }
</script>

<style scoped>
  .p-error {
    color: #e24c4c;
    font-size: 0.875rem;
  }
</style>

