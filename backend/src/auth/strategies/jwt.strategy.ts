import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

/**
 * JWT Payload interface from Auth0 token
 */
export interface JwtPayload {
  sub: string; // Auth0 user ID (format: "auth0|xxxxx" or "google-oauth2|xxxxx")
  email?: string;
  email_verified?: boolean;
  aud: string | string[]; // Audience (API identifier)
  iss: string; // Issuer (Auth0 domain)
  iat?: number;
  exp?: number;
}

/**
 * Request object with user attached
 */
export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    auth0Id: string;
  };
}

/**
 * Auth0 JWT Strategy
 * Validates JWT tokens from Auth0 using JWKS (JSON Web Key Set)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService<AppConfig>) {
    const config = configService.get<AppConfig>('config', { infer: true })!;
    const auth0Config = config.auth0;

    if (!auth0Config.domain || !auth0Config.audience) {
      throw new Error(
        'Auth0 configuration is incomplete. Please set AUTH0_DOMAIN and AUTH0_AUDIENCE environment variables.',
      );
    }

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${auth0Config.domain}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: auth0Config.audience,
      issuer: `https://${auth0Config.domain}/`,
      algorithms: ['RS256'],
    });
  }

  /**
   * Validate JWT payload
   * This method is called after the token is validated
   * Return value is attached to request.user
   * 
   * Note: Email is optional in access tokens. If missing, it will be fetched
   * from Auth0 userinfo endpoint or looked up by auth0Id in the guard.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    // Validate audience
    const config = this.configService.get<AppConfig>('config', { infer: true })!;
    const expectedAudience = config.auth0.audience;
    const tokenAudience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    
    if (!tokenAudience.includes(expectedAudience)) {
      throw new UnauthorizedException(
        `Invalid token: audience mismatch. Expected: ${expectedAudience}, Got: ${payload.aud}`,
      );
    }

    return payload;
  }
}

