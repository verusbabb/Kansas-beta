import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HttpModule } from '@nestjs/axios';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    AuthModule,
    HttpModule.register({
      timeout: 5000, // 5 second timeout
      maxRedirects: 5,
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

