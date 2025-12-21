import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Rush from '../views/Rush.vue'
import NewsLetters from '../views/NewsLetters.vue'
import MembersAndAlumni from '../views/MembersAndAlumni.vue'
import ContactUs from '../views/ContactUs.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Home },
    { path: '/rush', component: Rush },
    { path: '/newsletters', component: NewsLetters },
    { path: '/members', component: MembersAndAlumni },
    { path: '/contact', component: ContactUs },
  ],
})

export default router
