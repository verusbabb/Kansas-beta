import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { SequelizeModule } from '@nestjs/sequelize'
import { ConfigModule } from '../config/config.module'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { JwtStrategy } from './strategies/jwt.strategy'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { UserLookupGuard } from './guards/user-lookup.guard'
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard'
import { OptionalUserLookupGuard } from './guards/optional-user-lookup.guard'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    SequelizeModule.forFeature([User, Person]),
    ConfigModule,
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    UserLookupGuard,
    OptionalJwtAuthGuard,
    OptionalUserLookupGuard,
  ],
  exports: [
    JwtAuthGuard,
    RolesGuard,
    UserLookupGuard,
    OptionalJwtAuthGuard,
    OptionalUserLookupGuard,
    PassportModule,
  ],
})
export class AuthModule {}
