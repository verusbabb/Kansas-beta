import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'
import { HouseMom } from '../database/entities/house-mom.entity'
import { User } from '../database/entities/user.entity'
import { HouseMomController } from './house-mom.controller'
import { HouseMomService } from './house-mom.service'

@Module({
  imports: [
    SequelizeModule.forFeature([HouseMom, User]), // User for UserLookupGuard on protected routes
    AuthModule,
    StorageModule,
  ],
  controllers: [HouseMomController],
  providers: [HouseMomService],
  exports: [HouseMomService],
})
export class HouseMomModule {}
