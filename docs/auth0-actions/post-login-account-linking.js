/**
 * Auth0 Post-Login Action: Account Linking
 *
 * PURPOSE
 * When a user logs in, this action checks whether another Auth0 user exists
 * with the same email address. If so, it merges the two identities so that
 * the JWT `sub` is always the primary (database connection) user_id, regardless
 * of whether the user logs in with username/password or Google.
 *
 * This solves the case where a user was provisioned via username/password
 * (auth0|xxxx) and later logs in with Google (google-oauth2|yyyy) using the
 * same email address. After linking, the JWT sub is always auth0|xxxx.
 *
 * SETUP
 * 1. In Auth0 Dashboard → Actions → Library → Create Action
 * 2. Trigger: Login / Post Login
 * 3. Paste this code
 * 4. Add the following Action Secrets:
 *    - AUTH0_DOMAIN      → dev-3428khbg.us.auth0.com
 *    - AUTH0_MGMT_CLIENT_ID     → (your M2M app client ID)
 *    - AUTH0_MGMT_CLIENT_SECRET → (your M2M app client secret)
 * 5. Add npm dependency: auth0 (latest)
 * 6. Deploy and add to the Login flow
 *
 * NOTE: This action must run AFTER the existing "Add Email to Token" action.
 */

const { ManagementClient } = require('auth0');

exports.onExecutePostLogin = async (event, api) => {
  // Only run if the user has an email
  if (!event.user.email) return;

  const mgmt = new ManagementClient({
    domain: event.secrets.AUTH0_DOMAIN,
    clientId: event.secrets.AUTH0_MGMT_CLIENT_ID,
    clientSecret: event.secrets.AUTH0_MGMT_CLIENT_SECRET,
  });

  let usersWithEmail;
  try {
    const result = await mgmt.usersByEmail.getByEmail({ email: event.user.email });
    usersWithEmail = result.data;
  } catch (err) {
    console.error('Account linking: failed to fetch users by email', err.message);
    return; // Fail open — do not block login
  }

  // Nothing to link if only one identity exists
  if (!usersWithEmail || usersWithEmail.length <= 1) return;

  // Primary identity: prefer the database connection (provisioned by admin)
  const primary =
    usersWithEmail.find((u) => u.user_id && u.user_id.startsWith('auth0|')) ??
    usersWithEmail[0];

  for (const secondary of usersWithEmail) {
    if (secondary.user_id === primary.user_id) continue;

    const parts = secondary.user_id.split('|');
    const provider = parts[0];
    const userId = parts.slice(1).join('|'); // Handle IDs that contain '|'

    try {
      await mgmt.users.link(
        { id: primary.user_id },
        { provider, user_id: userId }
      );
      console.log(`Linked ${secondary.user_id} → ${primary.user_id}`);
    } catch (err) {
      // Ignore "already linked" errors; log others
      if (!err.message?.includes('already linked')) {
        console.error(`Account linking failed for ${secondary.user_id}:`, err.message);
      }
    }
  }
};
