import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '../config/config.module';
import { User } from '../database/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserLookupInterceptor } from './interceptors/user-lookup.interceptor';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    SequelizeModule.forFeature([User]),
    ConfigModule,
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, UserLookupInterceptor],
  exports: [JwtAuthGuard, RolesGuard, UserLookupInterceptor, PassportModule],
})
export class AuthModule {}

