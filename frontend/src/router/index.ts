import { createRouter, createWebHistory } from 'vue-router'
import { useAuth0 } from '@auth0/auth0-vue'
import { useAuthStore } from '@/stores/auth'
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
    { 
      path: '/admin', 
      component: Admin,
      meta: { requiresAuth: true, requiredRole: ['admin', 'editor'] }
    },
  ],
})

// Route guard for protected routes
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiredRole = to.meta.requiredRole as string[] | undefined

  // If route doesn't require auth, allow access
  if (!requiresAuth) {
    next()
    return
  }

  // Check if Auth0 is configured
  let auth0: ReturnType<typeof useAuth0> | null = null
  try {
    auth0 = useAuth0()
  } catch (error) {
    // Auth0 not configured
    console.warn('Auth0 not configured - redirecting to home')
    next('/')
    return
  }

  // Check if user is authenticated
  if (!auth0 || !auth0.isAuthenticated.value) {
    // Redirect to login
    await auth0.loginWithRedirect({
      appState: { targetUrl: to.fullPath },
    })
    return
  }

  // If role is required, check user role
  if (requiredRole && requiredRole.length > 0) {
    const authStore = useAuthStore()
    
    // Fetch user profile if not already loaded
    if (!authStore.user) {
      await authStore.fetchUserProfile()
    }

    // Check if user has required role
    if (!authStore.user || !requiredRole.includes(authStore.user.role)) {
      // User doesn't have required role - redirect to home
      next('/')
      return
    }
  }

  next()
})

export default router
