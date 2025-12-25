import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Auth Guard
 * Extends Passport's AuthGuard to handle JWT authentication
 * Attaches user to request after validation
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      this.logger.error('JWT validation error', {
        error: err.message || err,
        errorName: err.name,
        stack: err.stack,
      });
      throw err;
    }

    if (!user) {
      // Log info about why validation failed
      this.logger.warn('JWT validation failed', {
        info: info?.message || info,
        infoName: info?.name,
      });
      throw new UnauthorizedException(
        info?.message || 'Invalid or expired token. Please ensure you are using an access token with the correct audience.',
      );
    }

    return user;
  }
}

