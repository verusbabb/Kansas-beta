import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { User } from '../../database/entities/user.entity'
import { Person } from '../../database/entities/person.entity'
import { JwtPayload } from '../strategies/jwt.strategy'

/**
 * After OptionalJwtAuthGuard: if JWT payload present, resolve DB user and attach to `request.user`.
 * Never throws (anonymous / unknown users → `request.user` undefined). Does not run on routes without a prior payload.
 */
@Injectable()
export class OptionalUserLookupGuard implements CanActivate {
  private readonly logger = new Logger(OptionalUserLookupGuard.name)

  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Person)
    private readonly personModel: typeof Person,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload | User }>()
    const jwtPayload = request.user as JwtPayload | undefined

    if (!jwtPayload || typeof jwtPayload !== 'object' || !('sub' in jwtPayload) || !jwtPayload.sub) {
      request.user = undefined
      return true
    }

    const auth0Id = jwtPayload.sub
    const email = jwtPayload['https://kansas-beta-api/email'] || jwtPayload.email

    if (!email) {
      this.logger.warn('Optional user lookup: no email on token', { auth0Id })
      request.user = undefined
      return true
    }

    try {
      let user = await this.userModel.findOne({ where: { auth0Id } })

      if (user) {
        await this.linkPersonIdIfUnset(user)
        request.user = user
        return true
      }

      user = await this.userModel.findOne({ where: { email } })

      if (user) {
        if (user.auth0Id && user.auth0Id !== auth0Id) {
          request.user = undefined
          return true
        }
        if (!user.auth0Id && auth0Id) {
          user.auth0Id = auth0Id
          await user.save()
          this.logger.log('Linked Auth0 account to user (optional path)', { email, auth0Id })
        }
        await this.linkPersonIdIfUnset(user)
        request.user = user
        return true
      }

      request.user = undefined
      return true
    } catch (e) {
      this.logger.error('Optional user lookup failed', {
        error: e instanceof Error ? e.message : String(e),
        auth0Id,
      })
      request.user = undefined
      return true
    }
  }

  private async linkPersonIdIfUnset(user: User): Promise<void> {
    if (user.personId) return
    const norm = user.email.trim().toLowerCase()
    const matches = await this.personModel.findAll({
      where: { email: { [Op.iLike]: norm } },
    })
    if (matches.length !== 1) return
    user.personId = matches[0].id
    await user.save()
    this.logger.log('Linked user to directory person by email (optional path)', {
      userId: user.id,
      personId: user.personId,
    })
  }
}
