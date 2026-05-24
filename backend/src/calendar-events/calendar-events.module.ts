import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { CalendarEventsController } from './calendar-events.controller'
import { CalendarEventsService } from './calendar-events.service'
import { CalendarEvent } from '../database/entities/calendar-event.entity'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { AuthModule } from '../auth/auth.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'

@Module({
  imports: [
    SequelizeModule.forFeature([CalendarEvent, User, Person]), // User + Person for UserLookupGuard
    AuthModule,
    KnowledgeModule,
  ],
  controllers: [CalendarEventsController],
  providers: [CalendarEventsService],
  exports: [CalendarEventsService],
})
export class CalendarEventsModule {}
