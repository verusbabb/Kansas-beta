import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NewslettersController } from './newsletters.controller';
import { NewslettersService } from './newsletters.service';
import { Newsletter } from '../database/entities/newsletter.entity';
import { User } from '../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Newsletter, User]), // User model needed for UserLookupGuard
    AuthModule,
    StorageModule,
  ],
  controllers: [NewslettersController],
  providers: [NewslettersService],
  exports: [NewslettersService],
})
export class NewslettersModule {}

