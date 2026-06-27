import { Module, OnModuleInit } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { Sequelize } from 'sequelize-typescript'
import { ConfigService } from '@nestjs/config'
import { AppConfig } from '../config/configuration'
import { GuestList } from './entities/guest-list.entity'
import { Newsletter } from './entities/newsletter.entity'
import { User } from './entities/user.entity'
import { CalendarEvent } from './entities/calendar-event.entity'
import { HeroImage } from './entities/hero-image.entity'
import { Person } from './entities/person.entity'
import { PersonRelationship } from './entities/person-relationship.entity'
import { ExecPosition } from './entities/exec-position.entity'
import { ExecTerm } from './entities/exec-term.entity'
import { ExecAssignment } from './entities/exec-assignment.entity'
import { HouseMom } from './entities/house-mom.entity'
import { RushEvent } from './entities/rush-event.entity'
import { RushPageWidget } from './entities/rush-page-widget.entity'
import { RushPhoto } from './entities/rush-photo.entity'
import { HistoryImage } from './entities/history-image.entity'
import { PersonEnrichment } from './entities/person-enrichment.entity'
import { KnowledgeChunk } from './entities/knowledge-chunk.entity'
import { Resource } from './entities/resource.entity'
import { ResourceVersion } from './entities/resource-version.entity'
import { RushProspect } from './entities/rush-prospect.entity'
import { RushProspectActivity } from './entities/rush-prospect-activity.entity'
import { EmailCampaign } from './entities/email-campaign.entity'
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity'

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const config = configService.get<AppConfig>('config', { infer: true })!
        const dbConfig = config.database

        if (!dbConfig.host || !dbConfig.name || !dbConfig.user || !dbConfig.password) {
          throw new Error(
            'Database configuration is incomplete. Please check your .env file or Secret Manager.',
          )
        }

        // Determine connection type based on environment and host
        const isCloudSql = dbConfig.host?.includes('/cloudsql/') || false
        const isProduction = config.app.env === 'production'

        // Log connection info (minimal logging for production)
        if (!isProduction) {
          console.log(
            `Database: ${dbConfig.name}, Connection: ${isCloudSql ? 'Cloud SQL (Unix socket)' : 'TCP'}`,
          )
        }

        // Build Sequelize config
        const sequelizeConfig: any = {
          dialect: 'postgres',
          database: dbConfig.name,
          username: dbConfig.user,
          password: dbConfig.password,
        }

        // For Cloud SQL Unix socket connections
        if (isCloudSql) {
          // For PostgreSQL Unix sockets, set host to the socket path
          // The pg library (used by Sequelize) recognizes Unix socket paths
          sequelizeConfig.host = dbConfig.host // Socket path: /cloudsql/...
          // Don't set port for Unix socket connections
          sequelizeConfig.port = undefined
        } else {
          // For TCP connections
          sequelizeConfig.host = dbConfig.host
          sequelizeConfig.port = dbConfig.port || 5432
        }

        // Connection pool settings
        sequelizeConfig.pool = {
          max: isProduction ? 10 : 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        }

        // Logging (use Pino logger in production, console in dev)
        sequelizeConfig.logging = config.app.env === 'production' ? false : console.log

        // Explicitly add models for sequelize-typescript
        sequelizeConfig.models = [
          GuestList,
          Newsletter,
          User,
          CalendarEvent,
          RushEvent,
          RushPageWidget,
          RushPhoto,
          HistoryImage,
          HeroImage,
          Person,
          PersonRelationship,
          ExecPosition,
          ExecTerm,
          ExecAssignment,
          HouseMom,
          PersonEnrichment,
          KnowledgeChunk,
          Resource,
          ResourceVersion,
          RushProspect,
          RushProspectActivity,
          EmailCampaign,
          EmailCampaignRecipient,
        ]

        return sequelizeConfig
      },
    }),
    // Register models explicitly (excludes base.entity which is not a model)
    SequelizeModule.forFeature([
      GuestList,
      Newsletter,
      User,
      CalendarEvent,
      RushEvent,
      RushPageWidget,
      RushPhoto,
      HistoryImage,
      HeroImage,
      Person,
      PersonRelationship,
      ExecPosition,
      ExecTerm,
      ExecAssignment,
      HouseMom,
      PersonEnrichment,
      KnowledgeChunk,
      Resource,
      ResourceVersion,
      RushProspect,
      RushProspectActivity,
      EmailCampaign,
      EmailCampaignRecipient,
    ]),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule implements OnModuleInit {
  constructor(
    private sequelize: Sequelize,
    private configService: ConfigService<AppConfig>,
  ) {}

  async onModuleInit() {
    const config = this.configService.get<AppConfig>('config', { infer: true })!

    // Only sync in development (creates/updates tables)
    // In production, use migrations instead
    if (config.app.env !== 'production') {
      try {
        // Sync models - creates tables if they don't exist
        // alter: true will update existing tables to match models
        await this.sequelize.sync({ alter: true })
      } catch (error) {
        // Don't throw - allow app to continue (might be connection issue)
      }

      // Ensure pgvector extension exists.
      // Requires superuser — fails gracefully if extension already exists or
      // if the DB user lacks privileges (the extension may have been created manually).
      try {
        await this.sequelize.query(`CREATE EXTENSION IF NOT EXISTS vector`)
      } catch {
        // Ignore: extension likely already exists or user lacks CREATE EXTENSION privilege
      }

      // Ensure the embedding column and HNSW index exist on knowledge_chunks.
      // These are managed manually because Sequelize does not natively support pgvector.
      try {
        await this.sequelize.query(`
          ALTER TABLE knowledge_chunks
          ADD COLUMN IF NOT EXISTS embedding vector(768)
        `)
      } catch (error) {
        console.warn('pgvector column setup warning (non-fatal):', (error as Error).message)
      }
      try {
        await this.sequelize.query(`
          CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
          ON knowledge_chunks
          USING hnsw (embedding vector_cosine_ops)
        `)
      } catch (error) {
        console.warn('pgvector index setup warning (non-fatal):', (error as Error).message)
      }
    }
  }
}
