import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../../database/entities/user.entity';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * User Lookup Interceptor
 * After JWT validation, this interceptor:
 * 1. Extracts email from JWT payload (attached by JwtStrategy)
 * 2. Looks up user in database by email
 * 3. Links Auth0 account if auth0_id is NULL (first login)
 * 4. Replaces request.user with User entity
 * 
 * Must be used after JwtAuthGuard
 */
@Injectable()
export class UserLookupInterceptor implements NestInterceptor {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // JWT payload should be attached by JwtStrategy (as request.user)
    const jwtPayload = request.user as JwtPayload | undefined;

    if (!jwtPayload || !jwtPayload.email) {
      throw new ForbiddenException('Invalid token: email not found');
    }

    const email = jwtPayload.email;
    const auth0Id = jwtPayload.sub;

    try {
      // Look up user by email
      const user = await this.userModel.findOne({
        where: { email },
      });

      if (!user) {
        throw new ForbiddenException('Account not authorized. Please contact an administrator.');
      }

      // Security check: If auth0_id exists and doesn't match, prevent account hijacking
      if (user.auth0Id && user.auth0Id !== auth0Id) {
        throw new ForbiddenException('Account email is already linked to a different Auth0 account.');
      }

      // First-time login: Link Auth0 account to database user
      if (!user.auth0Id && auth0Id) {
        user.auth0Id = auth0Id;
        await user.save();
      }

      // Replace request.user with User entity (includes role)
      request.user = user;

      return next.handle();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Error authenticating user');
    }
  }
}

