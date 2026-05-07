import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { RushPhotosController } from './rush-photos.controller'
import { RushPhotosService } from './rush-photos.service'
import { RushPhoto } from '../database/entities/rush-photo.entity'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [
    SequelizeModule.forFeature([RushPhoto, User, Person]),
    AuthModule,
    StorageModule,
  ],
  controllers: [RushPhotosController],
  providers: [RushPhotosService],
  exports: [RushPhotosService],
})
export class RushPhotosModule {}
