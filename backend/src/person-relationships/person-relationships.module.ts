import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { Person } from '../database/entities/person.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { User } from '../database/entities/user.entity'
import { AuthModule } from '../auth/auth.module'
import { PersonRelationshipsService } from './person-relationships.service'
import { PersonRelationshipsController } from './person-relationships.controller'

@Module({
  imports: [SequelizeModule.forFeature([PersonRelationship, Person, User]), AuthModule],
  controllers: [PersonRelationshipsController],
  providers: [PersonRelationshipsService],
  exports: [PersonRelationshipsService],
})
export class PersonRelationshipsModule {}
