import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { RushEventsController } from './rush-events.controller'
import { RushEventsService } from './rush-events.service'
import { RushEvent } from '../database/entities/rush-event.entity'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    SequelizeModule.forFeature([RushEvent, User, Person]),
    AuthModule,
  ],
  controllers: [RushEventsController],
  providers: [RushEventsService],
  exports: [RushEventsService],
})
export class RushEventsModule {}
