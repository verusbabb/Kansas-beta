import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HeroImagesController } from './hero-images.controller';
import { HeroImagesService } from './hero-images.service';
import { HeroImage } from '../database/entities/hero-image.entity';
import { User } from '../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    SequelizeModule.forFeature([HeroImage, User]), // User model needed for UserLookupGuard
    AuthModule,
    StorageModule,
  ],
  controllers: [HeroImagesController],
  providers: [HeroImagesService],
  exports: [HeroImagesService],
})
export class HeroImagesModule {}

