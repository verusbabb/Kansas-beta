import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '../config/config.module';
import { User } from '../database/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserLookupGuard } from './guards/user-lookup.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    SequelizeModule.forFeature([User]),
    ConfigModule,
    HttpModule.register({
      timeout: 5000, // 5 second timeout
      maxRedirects: 5,
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, UserLookupGuard],
  exports: [JwtAuthGuard, RolesGuard, UserLookupGuard, PassportModule],
})
export class AuthModule {}

