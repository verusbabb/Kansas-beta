<template>
  <div class="bg-surface-0 min-h-screen">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-black via-gray-900 to-black text-white py-16 px-6">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-6">
          Get in touch with the Alpha Nu Chapter
        </p>
        <div class="w-32 h-1 bg-green-600 mx-auto"></div>
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
                  placeholder="Select a subject"
                  :class="{ 'p-invalid': errors.subject }"
                  required
                />
                <small v-if="errors.subject" class="p-error">{{ errors.subject }}</small>
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
                label="Send Message" 
                icon="pi pi-send"
                :loading="isSubmitting"
                :disabled="isSubmitting"
                class="bg-green-600 hover:bg-green-700"
              />
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
                  <i class="pi pi-map-marker text-2xl text-green-600 mt-1"></i>
                  <div>
                    <h3 class="font-bold mb-1">Address</h3>
                    <p class="text-surface-700">
                      Beta Theta Pi - Alpha Nu Chapter<br>
                      University of Kansas<br>
                      Lawrence, KS 66045
                    </p>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <i class="pi pi-envelope text-2xl text-green-600 mt-1"></i>
                  <div>
                    <h3 class="font-bold mb-1">Email</h3>
                    <a href="mailto:contact@betathetapi-ku.org" class="text-green-600 hover:underline">
                      contact@betathetapi-ku.org
                    </a>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <i class="pi pi-phone text-2xl text-green-600 mt-1"></i>
                  <div>
                    <h3 class="font-bold mb-1">Phone</h3>
                    <p class="text-surface-700">(785) XXX-XXXX</p>
                  </div>
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
                  <i :class="leader.icon" class="text-xl text-green-600 mt-1"></i>
                  <div>
                    <h3 class="font-bold">{{ leader.role }}</h3>
                    <p class="text-surface-700">{{ leader.name }}</p>
                    <a v-if="leader.email" :href="`mailto:${leader.email}`" class="text-green-600 hover:underline text-sm">
                      {{ leader.email }}
                    </a>
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <Card>
            <template #title>
              Social Media
            </template>
            <template #content>
              <div class="flex gap-4">
                <Button 
                  icon="pi pi-instagram" 
                  rounded
                  outlined
                  aria-label="Instagram"
                  @click="openSocial('instagram')"
                />
                <Button 
                  icon="pi pi-facebook" 
                  rounded
                  outlined
                  aria-label="Facebook"
                  @click="openSocial('facebook')"
                />
                <Button 
                  icon="pi pi-twitter" 
                  rounded
                  outlined
                  aria-label="Twitter"
                  @click="openSocial('twitter')"
                />
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import Card from 'primevue/card'
  import InputText from 'primevue/inputtext'
  import Select from 'primevue/select'
  import Textarea from 'primevue/textarea'
  import Button from 'primevue/button'
  import { useToastStore } from '@/stores/toast'
  import { useContactStore } from '@/stores/contact'

  const contactStore = useContactStore()
  const toastStore = useToastStore()

  const form = ref({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const errors = ref({})
  const isSubmitting = ref(false)

  const subjectOptions = [
    { label: 'General Inquiry', value: 'general' },
    { label: 'Rush Information', value: 'rush' },
    { label: 'Alumni Relations', value: 'alumni' },
    { label: 'Event Information', value: 'events' },
    { label: 'Other', value: 'other' }
  ]

  const leadershipContacts = ref([
    {
      role: 'Chapter President',
      name: 'TBD',
      email: 'president@betathetapi-ku.org',
      icon: 'pi pi-user'
    },
    {
      role: 'Rush Chair',
      name: 'TBD',
      email: 'rush@betathetapi-ku.org',
      icon: 'pi pi-users'
    },
    {
      role: 'Alumni Relations',
      name: 'TBD',
      email: 'alumni@betathetapi-ku.org',
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
      errors.value.subject = 'Subject is required'
    }

    if (!form.value.message.trim()) {
      errors.value.message = 'Message is required'
    }

    return Object.keys(errors.value).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    isSubmitting.value = true
    try {
      await contactStore.submitContactForm(form.value)
      toastStore.showSuccess('Message sent successfully! We\'ll get back to you soon.', 'Contact Form')
      
      // Reset form
      form.value = {
        name: '',
        email: '',
        subject: '',
        message: ''
      }
    } catch (error) {
      toastStore.showError('Failed to send message. Please try again.', 'Contact Form')
      console.error('Contact form error:', error)
    } finally {
      isSubmitting.value = false
    }
  }

  const openSocial = (platform) => {
    // Placeholder - will be updated with actual social media links
    const links = {
      instagram: 'https://instagram.com/betathetapi_ku',
      facebook: 'https://facebook.com/betathetapi.ku',
      twitter: 'https://twitter.com/betathetapi_ku'
    }
    window.open(links[platform], '_blank')
  }
</script>

<style scoped>
  .p-error {
    color: #e24c4c;
    font-size: 0.875rem;
  }
</style>

