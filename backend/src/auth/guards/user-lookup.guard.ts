import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../../database/entities/user.entity';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * User Lookup Guard
 * After JWT validation, this guard:
 * 1. Extracts auth0Id (sub) and email from JWT payload (custom claim)
 * 2. Looks up user in database by auth0Id (if linked) or email
 * 3. Links Auth0 account if auth0_id is NULL (first login)
 * 4. Replaces request.user with User entity
 * 
 * Must be used after JwtAuthGuard and before RolesGuard
 * 
 * Email is obtained from custom claim 'https://kansas-beta-api/email' added by Auth0 Action.
 * Falls back to standard 'email' claim if custom claim not present.
 */
@Injectable()
export class UserLookupGuard implements CanActivate {
  private readonly logger = new Logger(UserLookupGuard.name);

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // JWT payload should be attached by JwtStrategy (as request.user)
    const jwtPayload = request.user as JwtPayload | undefined;

    if (!jwtPayload || !jwtPayload.sub) {
      throw new ForbiddenException('Invalid token: missing subject');
    }

    const auth0Id = jwtPayload.sub;
    
    // Get email from custom claim (added by Auth0 Action) or fall back to standard claim
    const email = jwtPayload['https://kansas-beta-api/email'] || jwtPayload.email;

    if (!email) {
      // Email should always be present via custom claim from Auth0 Action
      // If missing, it's a configuration issue
      this.logger.error('Email not found in token', {
        auth0Id,
        hasCustomClaim: !!jwtPayload['https://kansas-beta-api/email'],
        hasStandardClaim: !!jwtPayload.email,
      });
      throw new ForbiddenException(
        'Invalid token: missing email claim. Please ensure Auth0 Action is configured correctly.',
      );
    }

    try {
      // Strategy 1: Look up by auth0Id first (for users who have already linked)
      let user = await this.userModel.findOne({
        where: { auth0Id },
      });

      if (user) {
        // User found by auth0Id - they're already linked
        request.user = user;
        return true;
      }

      // Strategy 2: Look up by email (for first-time login or pre-created users)
      user = await this.userModel.findOne({
        where: { email },
      });

      if (user) {
        // Security check: If auth0_id exists and doesn't match, prevent account hijacking
        if (user.auth0Id && user.auth0Id !== auth0Id) {
          throw new ForbiddenException('Account email is already linked to a different Auth0 account.');
        }

        // First-time login: Link Auth0 account to database user
        if (!user.auth0Id && auth0Id) {
          user.auth0Id = auth0Id;
          await user.save();
          this.logger.log('Linked Auth0 account to user', { email, auth0Id });
        }

        request.user = user;
        return true;
      }

      // User not found in database
      this.logger.warn('User not found in database', {
        auth0Id,
        email,
      });
      throw new ForbiddenException(
        'Account not authorized. Please contact an administrator. Your account may need to be created in the system first.',
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error in user lookup', {
        error: error instanceof Error ? error.message : String(error),
        auth0Id,
        email,
      });
      throw new ForbiddenException('Error authenticating user. Please try again or contact support.');
    }
  }
}

