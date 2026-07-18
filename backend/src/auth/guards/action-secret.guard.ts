import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common'

/**
 * Guards endpoints called by Auth0 Post-Login Actions (not from browsers).
 * Validates the x-action-secret header against AUTH0_ACTION_SECRET env var.
 * Use instead of JwtAuthGuard for action-to-backend calls.
 */
@Injectable()
export class ActionSecretGuard implements CanActivate {
  private readonly logger = new Logger(ActionSecretGuard.name)

  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.AUTH0_ACTION_SECRET
    if (!secret) {
      this.logger.error('AUTH0_ACTION_SECRET is not configured')
      throw new ForbiddenException('Action secret not configured')
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>()
    const provided = request.headers['x-action-secret']

    if (!provided || provided !== secret) {
      this.logger.warn('Invalid or missing x-action-secret header')
      throw new ForbiddenException('Invalid action secret')
    }

    return true
  }
}
