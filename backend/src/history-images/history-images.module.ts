import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { HistoryImagesController } from './history-images.controller'
import { HistoryImagesService } from './history-images.service'
import { HistoryImage } from '../database/entities/history-image.entity'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'

@Module({
  imports: [
    SequelizeModule.forFeature([HistoryImage, User, Person]),
    AuthModule,
    StorageModule,
    KnowledgeModule,
  ],
  controllers: [HistoryImagesController],
  providers: [HistoryImagesService],
  exports: [HistoryImagesService],
})
export class HistoryImagesModule {}
