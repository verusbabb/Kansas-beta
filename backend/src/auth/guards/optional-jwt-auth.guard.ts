import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'

/**
 * Runs JWT validation when `Authorization: Bearer` is present; otherwise leaves `request.user` unset.
 * Invalid/expired tokens are treated as anonymous (no throw).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest<{ headers?: { authorization?: string } }>()
    const auth = req.headers?.authorization
    if (!auth?.startsWith('Bearer ')) {
      return true
    }
    return super.canActivate(context)
  }

  handleRequest<TUser = unknown>(err: Error | null, user: TUser | false): TUser | undefined {
    if (err || !user) {
      return undefined
    }
    return user
  }
}
