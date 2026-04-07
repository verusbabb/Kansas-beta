import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { HeroImagesController } from './hero-images.controller'
import { HeroImagesService } from './hero-images.service'
import { HeroImage } from '../database/entities/hero-image.entity'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [
    SequelizeModule.forFeature([HeroImage, User, Person]), // User + Person for UserLookupGuard
    AuthModule,
    StorageModule,
  ],
  controllers: [HeroImagesController],
  providers: [HeroImagesService],
  exports: [HeroImagesService],
})
export class HeroImagesModule {}
