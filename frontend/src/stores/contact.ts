import { defineStore } from 'pinia'
// import apiClient from '@/services/api'

export interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

export const useContactStore = defineStore('contact', {
  state: () => ({
    submitting: false,
    error: null as string | null,
  }),

  actions: {
    async submitContactForm(formData: ContactFormData) {
      this.submitting = true
      this.error = null
      try {
        // TODO: Connect to backend API
        // await apiClient.post('/contact', formData)
        
        // Simulate API call for now
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log('Contact form submitted:', formData)
      } catch (error) {
        this.error = 'Failed to submit contact form'
        console.error('Error submitting contact form:', error)
        throw error
      } finally {
        this.submitting = false
      }
    },
  },
})

