import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Person } from '../database/entities/person.entity';
import { User } from '../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { PeopleService } from './people.service';
import { PeopleController } from './people.controller';

@Module({
  imports: [SequelizeModule.forFeature([Person, User]), AuthModule],
  controllers: [PeopleController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
