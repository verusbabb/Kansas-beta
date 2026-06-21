import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { RushProspectsController } from './rush-prospects.controller'
import { RushProspectsService } from './rush-prospects.service'
import { RushProspect } from '../database/entities/rush-prospect.entity'
import { RushProspectActivity } from '../database/entities/rush-prospect-activity.entity'
import { RushEvent } from '../database/entities/rush-event.entity'
import { Person } from '../database/entities/person.entity'
import { User } from '../database/entities/user.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    SequelizeModule.forFeature([RushProspect, RushProspectActivity, RushEvent, Person, User]),
    AuthModule,
  ],
  controllers: [RushProspectsController],
  providers: [RushProspectsService],
  exports: [RushProspectsService],
})
export class RushProspectsModule {}
