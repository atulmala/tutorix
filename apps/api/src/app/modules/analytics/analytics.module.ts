import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnalyticsService } from './services/analytics.service';

@Global() // Make analytics available globally
@Module({
  imports: [ConfigModule], // ConfigModule should already be loaded globally
  providers: [
    {
      provide: AnalyticsService,
      useFactory: async (configService: ConfigService) => {
        console.log('AnalyticsService factory called');
        const service = new AnalyticsService(configService);
        try {
          await service.initialize(configService);
        } catch (error) {
          // Log error but don't fail module initialization
          console.error('Analytics module initialization error:', error);
        }
        return service;
      },
      inject: [ConfigService],
    },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

