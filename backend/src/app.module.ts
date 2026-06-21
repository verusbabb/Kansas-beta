import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { ConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health/health.controller'
import { ConfigController } from './config/config.controller'
import { NewslettersModule } from './newsletters/newsletters.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { CalendarEventsModule } from './calendar-events/calendar-events.module'
import { RushEventsModule } from './rush-events/rush-events.module'
import { RushPageWidgetsModule } from './rush-page-widgets/rush-page-widgets.module'
import { HeroImagesModule } from './hero-images/hero-images.module'
import { RushPhotosModule } from './rush-photos/rush-photos.module'
import { HistoryImagesModule } from './history-images/history-images.module'
import { PeopleModule } from './people/people.module'
import { PersonRelationshipsModule } from './person-relationships/person-relationships.module'
import { ExecTeamModule } from './exec-team/exec-team.module'
import { HouseMomModule } from './house-mom/house-mom.module'
import { AskModule } from './ask/ask.module'
import { KnowledgeModule } from './knowledge/knowledge.module'
import { ResourcesModule } from './resources/resources.module'
import { RushProspectsModule } from './rush-prospects/rush-prospects.module'
import { Auth0ManagementModule } from './auth0/auth0-management.module'
import { createLoggerConfig } from './config/logger.config'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { AppConfig } from './config/configuration'

@Module({
  imports: [
    ConfigModule, // Load configuration (must be first)
    Auth0ManagementModule, // Auth0 Management API (global — injected wherever needed)
    DatabaseModule, // Database connection (requires ConfigModule)
    AuthModule, // Authentication and authorization
    NewslettersModule, // Newsletters API
    UsersModule, // Users management API
    CalendarEventsModule, // Calendar events API
    RushEventsModule, // Rush timeline events API
    RushPageWidgetsModule, // Why Rush cards on /rush
    HeroImagesModule, // Hero images API
    RushPhotosModule, // Rush page photos API
    HistoryImagesModule, // History page photos API
    PeopleModule, // Chapter directory (members/parents)
    PersonRelationshipsModule, // Legacy / family links between people
    ExecTeamModule, // Executive team terms and roster
    HouseMomModule, // House mom profile (People page)
    AskModule, // Natural-language alumni search + RAG
    KnowledgeModule, // Site knowledge vector store (pgvector + Gemini embeddings)
    ResourcesModule, // Chapter documents / resources
    RushProspectsModule, // Rush CRM — prospect pipeline and application form
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        return createLoggerConfig(configService)
      },
    }),
  ],
  controllers: [HealthController, ConfigController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
