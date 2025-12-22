import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Rush from '../views/Rush.vue'
import NewsLetters from '../views/NewsLetters.vue'
import Events from '../views/Events.vue'
import MembersAndAlumni from '../views/MembersAndAlumni.vue'
import Donate from '../views/Donate.vue'
import ContactUs from '../views/ContactUs.vue'
import Admin from '../views/Admin.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Home },
    { path: '/rush', component: Rush },
    { path: '/newsletters', component: NewsLetters },
    { path: '/events', component: Events },
    { path: '/members', component: MembersAndAlumni },
    { path: '/donate', component: Donate },
    { path: '/contact', component: ContactUs },
    { path: '/admin', component: Admin },
  ],
})

export default router
