import { Module, OnModuleInit } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { GuestList } from './entities/guest-list.entity';
import { Newsletter } from './entities/newsletter.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const config = configService.get<AppConfig>('config', { infer: true })!;
        const dbConfig = config.database;

        if (!dbConfig.host || !dbConfig.name || !dbConfig.user || !dbConfig.password) {
          throw new Error(
            'Database configuration is incomplete. Please check your .env file or Secret Manager.',
          );
        }

        // Determine connection type based on environment and host
        const isCloudSql = dbConfig.host?.includes('/cloudsql/') || false;
        const isProduction = config.app.env === 'production';

        // Log connection info (minimal logging for production)
        if (!isProduction) {
          console.log(`Database: ${dbConfig.name}, Connection: ${isCloudSql ? 'Cloud SQL (Unix socket)' : 'TCP'}`);
        }

        // Build Sequelize config
        const sequelizeConfig: any = {
          dialect: 'postgres',
          database: dbConfig.name,
          username: dbConfig.user,
          password: dbConfig.password,
        };

        // For Cloud SQL Unix socket connections
        if (isCloudSql) {
          // For PostgreSQL Unix sockets, set host to the socket path
          // The pg library (used by Sequelize) recognizes Unix socket paths
          sequelizeConfig.host = dbConfig.host; // Socket path: /cloudsql/...
          // Don't set port for Unix socket connections
          sequelizeConfig.port = undefined;
        } else {
          // For TCP connections
          sequelizeConfig.host = dbConfig.host;
          sequelizeConfig.port = dbConfig.port || 5432;
        }

        // Connection pool settings
        sequelizeConfig.pool = {
          max: isProduction ? 10 : 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        };

        // Logging (use Pino logger in production, console in dev)
        sequelizeConfig.logging = config.app.env === 'production' ? false : console.log;

        // Explicitly add models for sequelize-typescript
        sequelizeConfig.models = [GuestList, Newsletter, User];

        return sequelizeConfig;
      },
    }),
    // Register models explicitly (excludes base.entity which is not a model)
    SequelizeModule.forFeature([GuestList, Newsletter, User]),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule implements OnModuleInit {
  constructor(
    private sequelize: Sequelize,
    private configService: ConfigService<AppConfig>,
  ) {}

  async onModuleInit() {
    const config = this.configService.get<AppConfig>('config', { infer: true })!;
    
        // Only sync in development (creates/updates tables)
        // In production, use migrations instead
        if (config.app.env !== 'production') {
          try {
            // Sync models - creates tables if they don't exist
            // alter: true will update existing tables to match models
            await this.sequelize.sync({ alter: true });
          } catch (error) {
            // Don't throw - allow app to continue (might be connection issue)
          }
        }
  }
}
