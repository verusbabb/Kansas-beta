import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { RushPageWidgetsController } from './rush-page-widgets.controller'
import { RushPageWidgetsService } from './rush-page-widgets.service'
import { RushPageWidget } from '../database/entities/rush-page-widget.entity'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { AuthModule } from '../auth/auth.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'

@Module({
  imports: [
    SequelizeModule.forFeature([RushPageWidget, User, Person]),
    AuthModule,
    KnowledgeModule,
  ],
  controllers: [RushPageWidgetsController],
  providers: [RushPageWidgetsService],
  exports: [RushPageWidgetsService],
})
export class RushPageWidgetsModule {}
