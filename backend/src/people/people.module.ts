import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { Person } from '../database/entities/person.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { User } from '../database/entities/user.entity'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'
import { PeopleService } from './people.service'
import { PeopleController } from './people.controller'

@Module({
  imports: [SequelizeModule.forFeature([Person, PersonRelationship, User]), AuthModule, StorageModule],
  controllers: [PeopleController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
