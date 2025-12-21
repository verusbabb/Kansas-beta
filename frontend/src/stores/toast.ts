import { defineStore } from 'pinia'
import { useToast } from 'primevue/usetoast'

interface ToastState {
  toast: ReturnType<typeof useToast> | null
}

export const useToastStore = defineStore('toast', {
  state: (): ToastState => ({
    toast: null,
  }),

  actions: {
    /**
     * Initialize toast instance
     * Call this in App.vue or main.ts after PrimeVue is mounted
     */
    init(toastInstance: ReturnType<typeof useToast>) {
      this.toast = toastInstance
    },

    /**
     * Show success message
     */
    showSuccess(message: string, summary = 'Success') {
      this.toast?.add({
        severity: 'success',
        summary,
        detail: message,
        life: 3000,
      })
    },

    /**
     * Show error message
     */
    showError(message: string, summary = 'Error') {
      this.toast?.add({
        severity: 'error',
        summary,
        detail: message,
        life: 5000,
      })
    },

    /**
     * Show info message
     */
    showInfo(message: string, summary = 'Info') {
      this.toast?.add({
        severity: 'info',
        summary,
        detail: message,
        life: 3000,
      })
    },

    /**
     * Show warning message
     */
    showWarning(message: string, summary = 'Warning') {
      this.toast?.add({
        severity: 'warn',
        summary,
        detail: message,
        life: 4000,
      })
    },

    /**
     * Show loading message
     * Returns the toast instance so it can be removed/replaced
     */
    showLoading(message: string, summary = 'Loading', group = 'default') {
      return this.toast?.add({
        severity: 'warn', // Use 'warn' for better visibility
        summary,
        detail: message,
        life: 0, // Don't auto-close
        group,
        closable: false, // Don't allow manual close during loading
      })
    },

    /**
     * Remove a specific toast by its instance
     */
    removeToast(toast: any) {
      if (toast) {
        this.toast?.remove(toast)
      }
    },
  },
})

