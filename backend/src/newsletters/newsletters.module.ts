import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HttpModule } from '@nestjs/axios';
import { NewslettersController } from './newsletters.controller';
import { NewslettersService } from './newsletters.service';
import { Newsletter } from '../database/entities/newsletter.entity';
import { User } from '../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Newsletter, User]), // User model needed for UserLookupGuard
    AuthModule,
    HttpModule.register({
      timeout: 5000, // 5 second timeout
      maxRedirects: 5,
    }),
  ],
  controllers: [NewslettersController],
  providers: [NewslettersService],
  exports: [NewslettersService],
})
export class NewslettersModule {}

