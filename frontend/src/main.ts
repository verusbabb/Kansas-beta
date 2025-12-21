import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Material from '@primevue/themes/material'
import Ripple from 'primevue/ripple'
import ToastService from 'primevue/toastservice'
import 'primeicons/primeicons.css'

import App from './App.vue'
import router from './router'

import './assets/main.css'

const pinia = createPinia()
const app = createApp(App)

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
app.directive('ripple', Ripple)

app.mount('#app')
