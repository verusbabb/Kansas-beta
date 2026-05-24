import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { NewslettersController } from './newsletters.controller'
import { NewslettersService } from './newsletters.service'
import { Newsletter } from '../database/entities/newsletter.entity'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'

@Module({
  imports: [
    SequelizeModule.forFeature([Newsletter, User, Person]),
    AuthModule,
    StorageModule,
    KnowledgeModule,
  ],
  controllers: [NewslettersController],
  providers: [NewslettersService],
  exports: [NewslettersService],
})
export class NewslettersModule {}
