import { Module, OnModuleInit } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { GuestList } from './entities/guest-list.entity';

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
        const isCloudSql = dbConfig.host.includes('/cloudsql/');
        const isProduction = config.app.env === 'production';

        return {
          dialect: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port || 5432,
          database: dbConfig.name,
          username: dbConfig.user,
          password: dbConfig.password,
          // For Cloud SQL Unix socket connections
          ...(isCloudSql && {
            dialectOptions: {
              socketPath: dbConfig.host,
            },
            host: undefined, // Remove host when using socket
          }),
          // Connection pool settings
          pool: {
            max: isProduction ? 10 : 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
          },
          // Logging (use Pino logger in production, console in dev)
          logging: config.app.env === 'production' ? false : console.log,
          // Explicitly add models for sequelize-typescript
          models: [GuestList],
        };
      },
    }),
    // Register models explicitly (excludes base.entity which is not a model)
    SequelizeModule.forFeature([GuestList]),
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
        // Check if models are registered
        const models = this.sequelize.models;
        console.log(`Models registered: ${Object.keys(models).join(', ') || 'none'}`);
        
        // Sync models - creates tables if they don't exist
        // alter: true will update existing tables to match models
        await this.sequelize.sync({ alter: true });
        console.log('✓ Database models synchronized');
        
        // Verify tables were created
        const tableNames = await this.sequelize.getQueryInterface().showAllTables();
        console.log(`Tables in database: ${tableNames.join(', ') || 'none'}`);
      } catch (error) {
        console.error('✗ Database sync failed:', error);
        // Don't throw - allow app to continue (might be connection issue)
      }
    }
  }
}
