import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { SequelizeModule } from '@nestjs/sequelize'
import { Person } from '../database/entities/person.entity'
import { User } from '../database/entities/user.entity'
import { PersonEnrichment } from '../database/entities/person-enrichment.entity'
import { ExecAssignment } from '../database/entities/exec-assignment.entity'
import { ExecTerm } from '../database/entities/exec-term.entity'
import { ExecPosition } from '../database/entities/exec-position.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { Newsletter } from '../database/entities/newsletter.entity'
import { AuthModule } from '../auth/auth.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { AskController } from './ask.controller'
import { AskService } from './ask.service'
import { EnrichmentService } from './enrichment/enrichment.service'
import { PdlService } from './enrichment/pdl.service'
import { FullContactService } from './enrichment/fullcontact.service'
import { DatagmaService } from './enrichment/datagma.service'

@Module({
  imports: [
    SequelizeModule.forFeature([
      Person,
      User,
      PersonEnrichment,
      ExecAssignment,
      ExecTerm,
      ExecPosition,
      PersonRelationship,
      Newsletter,
    ]),
    HttpModule,
    AuthModule,
    KnowledgeModule,
  ],
  controllers: [AskController],
  providers: [AskService, EnrichmentService, PdlService, FullContactService, DatagmaService],
})
export class AskModule {}
