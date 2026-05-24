import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { KnowledgeChunk } from '../database/entities/knowledge-chunk.entity'
import { Person } from '../database/entities/person.entity'
import { ExecAssignment } from '../database/entities/exec-assignment.entity'
import { ExecTerm } from '../database/entities/exec-term.entity'
import { ExecPosition } from '../database/entities/exec-position.entity'
import { CalendarEvent } from '../database/entities/calendar-event.entity'
import { RushEvent } from '../database/entities/rush-event.entity'
import { RushPageWidget } from '../database/entities/rush-page-widget.entity'
import { HouseMom } from '../database/entities/house-mom.entity'
import { HistoryImage } from '../database/entities/history-image.entity'
import { Newsletter } from '../database/entities/newsletter.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { StorageModule } from '../storage/storage.module'
import { EmbeddingService } from './embedding.service'
import { VectorStoreService } from './vector-store.service'
import { IndexingService } from './indexing.service'
import { RetrievalService } from './retrieval.service'

@Module({
  imports: [
    SequelizeModule.forFeature([
      KnowledgeChunk,
      Person,
      ExecAssignment,
      ExecTerm,
      ExecPosition,
      CalendarEvent,
      RushEvent,
      RushPageWidget,
      HouseMom,
      HistoryImage,
      Newsletter,
      PersonRelationship,
    ]),
    StorageModule,
  ],
  providers: [EmbeddingService, VectorStoreService, IndexingService, RetrievalService],
  exports: [EmbeddingService, VectorStoreService, IndexingService, RetrievalService],
})
export class KnowledgeModule {}
