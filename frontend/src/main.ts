import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Material from '@primevue/themes/material'
import Ripple from 'primevue/ripple'
import Tooltip from 'primevue/tooltip'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import 'primeicons/primeicons.css'
import { createAuth0 } from '@auth0/auth0-vue'
import { env } from './config/env'

import App from './App.vue'
import router from './router'

import './assets/main.css'

// Validate Auth0 configuration (only if both are provided)
if (env.auth0Domain && env.auth0ClientId) {
  // Validate domain format (warning only, not blocking)
  if (!env.auth0Domain.includes('.auth0.com') && 
      !env.auth0Domain.includes('.us.auth0.com') && 
      !env.auth0Domain.includes('.eu.auth0.com') && 
      !env.auth0Domain.includes('.au.auth0.com')) {
    console.warn('Auth0 domain format might be incorrect. Expected format: your-domain.auth0.com')
  }
}

const pinia = createPinia()
const app = createApp(App)

// Configure Auth0 only if credentials are provided
if (env.auth0Domain && env.auth0ClientId) {
  const auth0Config: any = {
    domain: env.auth0Domain,
    clientId: env.auth0ClientId,
    authorizationParams: {
      redirect_uri: window.location.origin,
    },
    cacheLocation: 'localstorage',
  }

  // Only add audience if it's configured (required for access tokens)
  if (env.auth0Audience) {
    auth0Config.authorizationParams.audience = env.auth0Audience
    console.log('Auth0 configured with audience:', env.auth0Audience)
  } else {
    console.warn('⚠️ VITE_AUTH0_AUDIENCE not set. Access tokens may not work correctly.')
    console.warn('Set VITE_AUTH0_AUDIENCE to your API identifier (e.g., https://kansas-beta-api)')
  }

  app.use(createAuth0(auth0Config))
} else {
  console.warn('Auth0 credentials not configured. Authentication features will be disabled.')
  console.warn('Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in your .env file to enable Auth0.')
}

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Material,
    options: {
      darkModeSelector: 'false',
    },
  },
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('ripple', Ripple)
app.directive('tooltip', Tooltip)

app.mount('#app')
