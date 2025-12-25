import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { User } from '../../database/entities/user.entity';
import { JwtPayload } from '../strategies/jwt.strategy';
import { AppConfig } from '../../config/configuration';

/**
 * User Lookup Guard
 * After JWT validation, this guard:
 * 1. Extracts auth0Id (sub) and optional email from JWT payload
 * 2. Looks up user in database by auth0Id (if linked) or email
 * 3. If email not in token, fetches from Auth0 userinfo endpoint
 * 4. Links Auth0 account if auth0_id is NULL (first login)
 * 5. Replaces request.user with User entity
 * 
 * Must be used after JwtAuthGuard and before RolesGuard
 */
@Injectable()
export class UserLookupGuard implements CanActivate {
  private readonly logger = new Logger(UserLookupGuard.name);

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    private configService: ConfigService<AppConfig>,
    private httpService: HttpService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // JWT payload should be attached by JwtStrategy (as request.user)
    const jwtPayload = request.user as JwtPayload | undefined;

    if (!jwtPayload || !jwtPayload.sub) {
      throw new ForbiddenException('Invalid token: missing subject');
    }

    const auth0Id = jwtPayload.sub;
    let email = jwtPayload.email;

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

      // Strategy 2: If email is in token, look up by email (for first-time login)
      if (email) {
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
          }

          request.user = user;
          return true;
        }
      }

      // Strategy 3: Email not in token and user not found - fetch email from Auth0 userinfo
      if (!email) {
        email = await this.fetchEmailFromAuth0(auth0Id, request.headers.authorization);
        
        if (email) {
          // Try lookup by email again
          user = await this.userModel.findOne({
            where: { email },
          });

          if (user) {
            // Security check
            if (user.auth0Id && user.auth0Id !== auth0Id) {
              throw new ForbiddenException('Account email is already linked to a different Auth0 account.');
            }

            // Link Auth0 account
            if (!user.auth0Id && auth0Id) {
              user.auth0Id = auth0Id;
              await user.save();
            }

            request.user = user;
            return true;
          }
        }
      }

      // User not found in database
      throw new ForbiddenException('Account not authorized. Please contact an administrator.');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error in user lookup', error);
      throw new ForbiddenException('Error authenticating user');
    }
  }

  /**
   * Fetch user email from Auth0 userinfo endpoint
   * Uses NestJS HttpService for better integration and error handling
   */
  private async fetchEmailFromAuth0(auth0Id: string, authorizationHeader?: string): Promise<string | null> {
    try {
      const config = this.configService.get<AppConfig>('config', { infer: true })!;
      const auth0Domain = config.auth0?.domain;

      if (!auth0Domain || !authorizationHeader) {
        return null;
      }

      const url = `https://${auth0Domain}/userinfo`;
      
      // HttpService returns an Observable, convert to Promise using firstValueFrom
      const response = await firstValueFrom(
        this.httpService.get<{ email?: string }>(url, {
          headers: {
            Authorization: authorizationHeader,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data?.email || null;
    } catch (error) {
      // Silently fail - user lookup will continue with other strategies
      return null;
    }
  }
}

