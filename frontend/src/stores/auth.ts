import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import apiClient from '@/services/api'
import { setTokenGetter } from '@/services/api'
import type { UserResponseDto } from '@/types/user'

/**
 * Auth store
 * Manages authentication state and user profile
 */
export const useAuthStore = defineStore('auth', () => {
  // Auth0 state
  let auth0: ReturnType<typeof useAuth0> | null = null
  
  try {
    auth0 = useAuth0()
  } catch (error) {
    // Auth0 not configured - this is expected if env vars aren't set
    console.debug('Auth0 not available (this is normal if VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID are not set)')
  }

  // User profile from backend (includes role)
  const user = ref<UserResponseDto | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const isAuthenticated = computed(() => {
    return auth0?.isAuthenticated.value ?? false
  })

  const userRole = computed(() => {
    return user.value?.role ?? null
  })

  const isAdmin = computed(() => {
    return userRole.value === 'admin'
  })

  const isEditor = computed(() => {
    return userRole.value === 'editor' || userRole.value === 'admin'
  })

  const isViewer = computed(() => {
    return userRole.value === 'viewer' || userRole.value === 'editor' || userRole.value === 'admin'
  })

  /**
   * Fetch current user profile from backend
   * This should be called after successful authentication
   * Token is automatically added by API client interceptor
   */
  async function fetchUserProfile() {
    if (!auth0 || !isAuthenticated.value) {
      user.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      // Fetch user profile from backend
      // Token is automatically added by API client interceptor
      const response = await apiClient.get<UserResponseDto>('/users/me')

      user.value = response.data
      console.log('User profile fetched:', user.value)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user profile'
      user.value = null
      console.error('Failed to fetch user profile:', err)
      
      // If 401/403 from /users/me, user exists in Auth0 but not in our database
      // Clear Auth0 session so they can try logging in again after being created
      if (err.response?.status === 401 || err.response?.status === 403) {
        const isUsersMeEndpoint = err.config?.url?.includes('/users/me') || err.response?.config?.url?.includes('/users/me')
        
        if (isUsersMeEndpoint && auth0) {
          console.warn('User not found in database - clearing Auth0 session to allow fresh login after user creation')
          
          // Clear user profile before logout
          clearUser()
          
          // Delay logout to give user time to see the error toast message
          // The toast has a 5 second lifetime, so 3 seconds is enough to read it
          setTimeout(() => {
            // Logout from Auth0 to clear session, allowing user to login again after being created
            auth0.logout({
              logoutParams: {
                returnTo: window.location.origin
              }
            })
          }, 3000) // 3 second delay
        } else if (!isUsersMeEndpoint) {
          console.warn('User not authorized - may need to be created in database first')
        }
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear user profile (on logout)
   */
  function clearUser() {
    user.value = null
    error.value = null
  }

  /**
   * Get access token for API calls
   * Ensures we get a fresh access token with the correct audience
   */
  async function getAccessToken(): Promise<string | null> {
    if (!auth0 || !isAuthenticated.value) {
      console.debug('Cannot get access token: Auth0 not available or not authenticated')
      return null
    }

    try {
      // Get environment config to pass audience
      const { env } = await import('@/config/env')
      
      // Request access token with explicit audience to ensure we get the right token
      // Always pass audience to prevent getting a cached token without audience
      const options: any = {}
      
      if (env.auth0Audience) {
        options.authorizationParams = {
          audience: env.auth0Audience, // Ensure we request token for the API
        }
      }
      
      const tokenResult = await auth0.getAccessTokenSilently(options)
      
      // Ensure we have a string token (getAccessTokenSilently can return string or object)
      const token = typeof tokenResult === 'string' ? tokenResult : tokenResult?.access_token || null
      
      // Debug: Log token info (first/last chars only for security)
      if (token) {
        console.debug('Access token retrieved', {
          length: token.length,
          preview: `${token.substring(0, 20)}...${token.substring(token.length - 20)}`,
        })
        
        // Decode token to check audience (for debugging only)
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]))
            console.debug('Token payload (for debugging)', {
              aud: payload.aud,
              iss: payload.iss,
              sub: payload.sub,
              email: payload.email,
              exp: payload.exp,
              iat: payload.iat,
              tokenType: Array.isArray(payload.aud) ? 'access token (multiple audiences)' : 
                        payload.aud === env.auth0Audience ? 'access token (correct audience)' : 
                        'unknown token type',
            })
            
            // Verify it's an access token with correct audience
            const tokenAudience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
            if (!tokenAudience.includes(env.auth0Audience || '')) {
              console.warn('⚠️ Token does not have expected audience!', {
                expected: env.auth0Audience,
                received: payload.aud,
              })
            }
          } else {
            console.warn('⚠️ Token does not appear to be a JWT (not 3 parts)')
          }
        } catch (e) {
          console.warn('⚠️ Could not decode token - may not be a valid JWT', e)
        }
      } else {
        console.warn('getAccessTokenSilently returned null or empty token')
      }
      
      return token as string | null
    } catch (err: any) {
      console.error('Failed to get access token:', {
        error: err.message || err,
        errorName: err.name,
        errorCode: err.error,
        errorDescription: err.error_description,
      })
      return null
    }
  }

  // Register token getter with API client if Auth0 is available
  if (auth0) {
    setTokenGetter(getAccessToken)

    // Watch for authentication changes and fetch user profile
    // Use a computed to watch auth0.isAuthenticated
    const isAuthComputed = computed(() => auth0?.isAuthenticated.value ?? false)
    
    watch(
      isAuthComputed,
      async (isAuth) => {
        if (isAuth) {
          // User just logged in - fetch profile
          await fetchUserProfile()
        } else {
          // User logged out - clear profile
          clearUser()
        }
      },
      { immediate: true }
    )
  }

  return {
    // State
    user,
    loading,
    error,
    // Computed
    isAuthenticated,
    userRole,
    isAdmin,
    isEditor,
    isViewer,
    // Actions
    fetchUserProfile,
    clearUser,
    getAccessToken,
  }
})

