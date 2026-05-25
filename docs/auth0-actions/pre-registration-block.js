/**
 * Auth0 Pre-User-Registration Action: Block Unauthorized Signups
 *
 * PURPOSE
 * Before Auth0 creates any new account (username/password OR Google OAuth),
 * this action checks whether the email is pre-authorized in the Kansas Beta
 * database. If not, the registration is denied with a clear message.
 *
 * This prevents:
 * - Strangers creating password accounts on the login page
 * - Google users with unregistered emails creating orphaned Auth0 accounts
 *
 * SETUP
 * 1. In Auth0 Dashboard → Actions → Library → Create Action
 * 2. Trigger: User Registration / Pre User Registration
 * 3. Paste this code
 * 4. Add the following Action Secrets:
 *    - BACKEND_API_URL → https://your-production-api.com
 *                        (for local dev: cannot reach localhost; skip or use ngrok)
 *    - PRE_REG_SECRET  → (must match PRE_REG_SECRET in your backend .env)
 * 5. Add npm dependency: axios (latest)
 * 6. Deploy and add to the Pre User Registration flow
 *
 * FAIL-OPEN POLICY
 * If the backend is unreachable (outage, cold start), registration is allowed
 * through. The API-level UserLookupGuard still enforces authorization on every
 * actual API call, so there is no security risk from a missed pre-reg check.
 */

const axios = require('axios');

exports.onExecutePreUserRegistration = async (event, api) => {
  const email = event.user.email;

  if (!email) {
    api.access.deny('A valid email address is required to register.');
    return;
  }

  const backendUrl = event.secrets.BACKEND_API_URL;
  const preRegSecret = event.secrets.PRE_REG_SECRET;

  if (!backendUrl || !preRegSecret) {
    // Secrets not configured — fail open (e.g. during local development)
    console.warn('Pre-registration: BACKEND_API_URL or PRE_REG_SECRET not set, skipping check');
    return;
  }

  try {
    const response = await axios.get(`${backendUrl}/users/check-email`, {
      params: { email },
      headers: { 'x-pre-reg-secret': preRegSecret },
      timeout: 5000,
    });

    if (!response.data?.authorized) {
      api.access.deny(
        'This email is not registered with Kansas Beta. ' +
        'Contact your chapter administrator to be added before creating an account.'
      );
    }
  } catch (err) {
    // Backend unreachable — fail open, rely on API-level guard
    console.warn('Pre-registration check failed (backend unreachable), allowing signup:', err.message);
  }
};
