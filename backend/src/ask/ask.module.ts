import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { SequelizeModule } from '@nestjs/sequelize'
import { Person } from '../database/entities/person.entity'
import { User } from '../database/entities/user.entity'
import { AuthModule } from '../auth/auth.module'
import { AskController } from './ask.controller'
import { AskService } from './ask.service'
import { EnrichmentService } from './enrichment/enrichment.service'
import { PdlService } from './enrichment/pdl.service'
import { TavilyService } from './enrichment/tavily.service'

@Module({
  imports: [
    SequelizeModule.forFeature([Person, User]),
    HttpModule,
    AuthModule,
  ],
  controllers: [AskController],
  providers: [AskService, EnrichmentService, PdlService, TavilyService],
})
export class AskModule {}
