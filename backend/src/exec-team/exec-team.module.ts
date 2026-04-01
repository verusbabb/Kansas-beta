import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'
import { ExecPosition } from '../database/entities/exec-position.entity'
import { ExecTerm } from '../database/entities/exec-term.entity'
import { ExecAssignment } from '../database/entities/exec-assignment.entity'
import { Person } from '../database/entities/person.entity'
import { User } from '../database/entities/user.entity'
import { ExecTeamController } from './exec-team.controller'
import { ExecTeamService } from './exec-team.service'

@Module({
  imports: [
    SequelizeModule.forFeature([ExecPosition, ExecTerm, ExecAssignment, Person, User]),
    AuthModule,
    StorageModule,
  ],
  controllers: [ExecTeamController],
  providers: [ExecTeamService],
  exports: [ExecTeamService],
})
export class ExecTeamModule {}
