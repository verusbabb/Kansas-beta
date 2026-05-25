import { Injectable } from '@nestjs/common'
import { ManagementClient } from 'auth0'
import { PinoLogger } from 'nestjs-pino'
import { randomBytes } from 'crypto'

@Injectable()
export class Auth0ManagementService {
  private readonly client: ManagementClient | null = null
  private readonly dbConnection: string
  private readonly frontendUrl: string

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(Auth0ManagementService.name)

    const domain = process.env.AUTH0_DOMAIN
    const clientId = process.env.AUTH0_MGMT_CLIENT_ID
    const clientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET
    this.dbConnection = process.env.AUTH0_DB_CONNECTION || 'Username-Password-Authentication'
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

    if (domain && clientId && clientSecret) {
      this.client = new ManagementClient({ domain, clientId, clientSecret })
      this.logger.info('Auth0 Management client initialized')
    } else {
      this.logger.warn(
        'Auth0 Management client NOT initialized — missing AUTH0_MGMT_CLIENT_ID or AUTH0_MGMT_CLIENT_SECRET',
      )
    }
  }

  get isEnabled(): boolean {
    return this.client !== null
  }

  /**
   * Create a user in Auth0 database connection and send a password-set invite.
   * If the email already exists in Auth0, skips creation and sends a new invite ticket.
   * Returns the Auth0 user_id, or null on failure.
   */
  async provisionUser(email: string, firstName: string, lastName: string): Promise<string | null> {
    if (!this.client) return null
    try {
      // Check if user already exists in Auth0
      const existing = await this.client.usersByEmail.getByEmail({ email })
      if (existing.data.length > 0) {
        // Prefer the database connection user if multiple identities exist
        const dbUser = existing.data.find((u) => u.user_id?.startsWith('auth0|'))
        if (dbUser) {
          // Database connection user — send password reset email so they can set a password
          const auth0Id = dbUser.user_id!
          await this.sendPasswordResetEmail(email)
          this.logger.info('Sent password reset email to existing Auth0 database user', {
            email,
            auth0Id,
          })
          return auth0Id
        } else {
          // Social-only user (e.g. Google) — they already have a login method, no ticket needed
          const auth0Id = existing.data[0].user_id!
          this.logger.info('Existing Auth0 social user found, skipping password ticket', {
            email,
            auth0Id,
          })
          return auth0Id
        }
      }

      // Create new user in the database connection
      const created = await this.client.users.create({
        connection: this.dbConnection,
        email,
        email_verified: true, // Admin-created user — email is trusted, suppresses Auth0's automatic verification email
        name: `${firstName} ${lastName}`.trim(),
        // Temporary password — immediately replaced when user clicks the ticket
        password: this.generateTemporaryPassword(),
      })

      const auth0Id = created.data.user_id!
      await this.sendPasswordResetEmail(email)
      this.logger.info('Provisioned Auth0 user and sent password reset email', { email, auth0Id })
      return auth0Id
    } catch (error) {
      this.logger.warn('Auth0 provisionUser failed — user saved in DB without Auth0 link', {
        email,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Block a user in Auth0 (soft delete — revokes all sessions and future logins).
   */
  async blockUser(auth0Id: string): Promise<void> {
    if (!this.client) return
    try {
      await this.client.users.update({ id: auth0Id }, { blocked: true })
      this.logger.info('Blocked Auth0 user', { auth0Id })
    } catch (error) {
      this.logger.warn('Auth0 blockUser failed', {
        auth0Id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Unblock a user in Auth0 (restore — re-enables login).
   */
  async unblockUser(auth0Id: string): Promise<void> {
    if (!this.client) return
    try {
      await this.client.users.update({ id: auth0Id }, { blocked: false })
      this.logger.info('Unblocked Auth0 user', { auth0Id })
    } catch (error) {
      this.logger.warn('Auth0 unblockUser failed', {
        auth0Id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Update a user's email in Auth0.
   * @param emailVerified - true for admin-driven changes (trusted source), false for self-service (requires re-verification)
   */
  async updateEmail(auth0Id: string, newEmail: string, emailVerified: boolean): Promise<void> {
    if (!this.client) return
    try {
      await this.client.users.update(
        { id: auth0Id },
        {
          email: newEmail,
          email_verified: emailVerified,
          connection: this.dbConnection,
        },
      )
      this.logger.info('Updated Auth0 user email', { auth0Id, newEmail, emailVerified })
    } catch (error) {
      this.logger.warn('Auth0 updateEmail failed', {
        auth0Id,
        newEmail,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Send a password reset / invite email via Auth0's Authentication API.
   * Callable publicly so admins can resend the invite to an existing user.
   * Auth0 always returns 200 regardless of whether the email exists in the
   * database connection (prevents email enumeration), so this is safe to call
   * at any time without prior Auth0 existence checks.
   */
  async resendPasswordResetEmail(email: string): Promise<void> {
    return this.sendPasswordResetEmail(email)
  }

  /**
   * Send a password reset email via Auth0's Authentication API (dbconnections/change_password).
   * This is the same flow as "Forgot Password" — Auth0 sends the email automatically
   * using the configured email provider and "Change Password (Link)" template.
   *
   * Unlike the Management API tickets endpoint, this actually delivers the email.
   */
  private async sendPasswordResetEmail(email: string): Promise<void> {
    const domain = process.env.AUTH0_DOMAIN
    const clientId = process.env.AUTH0_CLIENT_ID
    if (!domain || !clientId) return

    const response = await fetch(`https://${domain}/dbconnections/change_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        email,
        connection: this.dbConnection,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`dbconnections/change_password failed: ${response.status} ${text}`)
    }
  }

  private generateTemporaryPassword(): string {
    // Must satisfy typical Auth0 password policy (upper, lower, digit, special)
    return `Kβ${randomBytes(12).toString('hex')}#1`
  }
}
