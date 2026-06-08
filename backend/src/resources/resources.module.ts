import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { ResourcesController } from './resources.controller'
import { ResourcesService } from './resources.service'
import { Resource } from '../database/entities/resource.entity'
import { ResourceVersion } from '../database/entities/resource-version.entity'
import { User } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [
    SequelizeModule.forFeature([Resource, ResourceVersion, User, Person]),
    AuthModule,
    StorageModule,
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
