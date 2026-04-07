import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    SequelizeModule.forFeature([User, Person]), // Person for UserLookupGuard (email → personId link)
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
