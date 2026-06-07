import { Module, Global } from '@nestjs/common';
import { AnalyticsService } from './services/analytics.service';

@Global() // Make analytics available globally
@Module({
  providers: [
    {
      provide: AnalyticsService,
      useFactory: async () => {
        const service = new AnalyticsService();
        try {
          await service.initialize();
        } catch (error) {
          console.error('Analytics module initialization error:', error);
        }
        return service;
      },
    },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

