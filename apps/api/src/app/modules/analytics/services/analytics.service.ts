import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdminAnalyticsProvider } from '@tutorix/analytics/firebase-admin.provider';
import { AnalyticsEvent, UserProperties } from '@tutorix/analytics';

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);
  private analyticsProvider: FirebaseAdminAnalyticsProvider | null = null;
  private isInitialized = false;
  private configService: ConfigService | null = null;

  constructor(private readonly configServiceInjected?: ConfigService) {
    this.configService = configServiceInjected || null;
    this.logger.log('AnalyticsService constructor called');
  }

  async onModuleInit() {
    this.logger.log('AnalyticsService onModuleInit called');
    // If not initialized via factory, try to initialize here
    if (!this.isInitialized && this.configService) {
      this.logger.log('Initializing AnalyticsService in onModuleInit...');
      await this.initialize(this.configService);
    } else if (!this.isInitialized) {
      this.logger.warn('AnalyticsService not initialized - ConfigService not available');
    }
  }

  async initialize(configService: ConfigService): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Analytics already initialized');
      return;
    }

    this.logger.log('🔄 Initializing Analytics...');

    try {
      this.analyticsProvider = new FirebaseAdminAnalyticsProvider();

      // Get Firebase configuration from environment
      const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
      this.logger.debug(`Firebase Project ID: ${projectId ? 'Found' : 'Missing'}`);

      const config: Record<string, unknown> = {
        projectId,
      };

      // Check for service account credentials
      const serviceAccountPath = configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
      const serviceAccountJson = configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');

      this.logger.debug(`Service Account Path: ${serviceAccountPath ? 'Found' : 'Not set'}`);
      this.logger.debug(`Service Account JSON: ${serviceAccountJson ? 'Found' : 'Not set'}`);

      if (serviceAccountPath) {
        // Load service account from file path
        const fs = await import('fs');
        const serviceAccount = JSON.parse(
          fs.readFileSync(serviceAccountPath, 'utf8')
        );
        config.serviceAccount = serviceAccount;
        this.logger.debug('Loaded service account from file');
      } else if (serviceAccountJson) {
        // Parse service account from JSON string
        try {
          // Remove surrounding quotes if present
          let jsonString = serviceAccountJson.trim();
          
          // Remove single quotes if the entire string is wrapped in them
          if ((jsonString.startsWith("'") && jsonString.endsWith("'")) ||
              (jsonString.startsWith('"') && jsonString.endsWith('"'))) {
            jsonString = jsonString.slice(1, -1);
          }
          
          // Log first 100 chars for debugging (without sensitive data)
          this.logger.debug(`Parsing JSON (first 100 chars): ${jsonString.substring(0, 100)}...`);
          
          config.serviceAccount = JSON.parse(jsonString);
          this.logger.debug('Parsed service account from JSON string');
        } catch (parseError) {
          this.logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON');
          this.logger.error('JSON string length:', serviceAccountJson?.length);
          this.logger.error('JSON string (first 200 chars):', serviceAccountJson?.substring(0, 200));
          if (parseError instanceof Error) {
            this.logger.error('Parse error:', parseError.message);
            this.logger.error('Stack:', parseError.stack);
          }
          throw parseError;
        }
      } else {
        this.logger.warn('No Firebase service account credentials found. Analytics will not be fully functional.');
      }

      if (!projectId) {
        this.logger.warn('FIREBASE_PROJECT_ID not set. Analytics initialization may fail.');
      }

      // Initialize the provider
      await this.analyticsProvider.initialize(config);
      this.isInitialized = true;
      this.logger.log('✅ Analytics initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize analytics:', error);
      if (error instanceof Error) {
        this.logger.error('Error details:', error.message);
        this.logger.error('Stack trace:', error.stack);
      }
      // Don't throw - allow app to continue without analytics
      this.isInitialized = false;
    }
  }

  /**
   * Track an event
   */
  async trackEvent(event: AnalyticsEvent, params?: Record<string, unknown>): Promise<void> {
    if (!this.isInitialized || !this.analyticsProvider) {
      this.logger.warn(`Analytics not initialized, event not tracked: ${event}`);
      return;
    }

    try {
      await this.analyticsProvider.trackEvent(event, params);
    } catch (error) {
      this.logger.error(`Failed to track event ${event}:`, error);
    }
  }

  /**
   * Track page view (for API endpoints)
   */
  async trackPageView(pagePath: string, pageTitle?: string): Promise<void> {
    await this.trackEvent(AnalyticsEvent.PAGE_VIEW, {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: UserProperties): Promise<void> {
    if (!this.isInitialized || !this.analyticsProvider) {
      this.logger.warn('Analytics not initialized, user properties not set');
      return;
    }

    try {
      await this.analyticsProvider.setUserProperties(properties);
    } catch (error) {
      this.logger.error('Failed to set user properties:', error);
    }
  }

  /**
   * Set user ID
   */
  async setUserId(userId: string | number | null): Promise<void> {
    if (!this.isInitialized || !this.analyticsProvider) {
      this.logger.warn('Analytics not initialized, user ID not set');
      return;
    }

    try {
      await this.analyticsProvider.setUserId(userId);
    } catch (error) {
      this.logger.error('Failed to set user ID:', error);
    }
  }

  /**
   * Reset analytics (on logout)
   */
  async reset(): Promise<void> {
    if (!this.isInitialized || !this.analyticsProvider) {
      this.logger.warn('Analytics not initialized, reset not performed');
      return;
    }

    try {
      await this.analyticsProvider.reset();
    } catch (error) {
      this.logger.error('Failed to reset analytics:', error);
    }
  }

  /**
   * Track error
   */
  async trackError(error: Error | string, fatal = false, additionalData?: Record<string, unknown>): Promise<void> {
    await this.trackEvent(AnalyticsEvent.EXCEPTION, {
      description: error instanceof Error ? error.message : error,
      fatal,
      ...additionalData,
    });
  }

  /**
   * Convenience methods for common events
   */
  async trackUserRegistration(params: {
    userId: number;
    userRole: string;
    method: 'email' | 'mobile';
  }): Promise<void> {
    await this.trackEvent(AnalyticsEvent.USER_REGISTERED, {
      method: params.method,
      user_role: params.userRole,
    });

    await this.setUserId(params.userId);
    await this.setUserProperties({
      user_id: params.userId,
      user_role: params.userRole as 'TUTOR' | 'STUDENT' | 'ADMIN',
    });
  }

  async trackUserLogin(params: {
    userId: number;
    userRole: string;
    method: 'email' | 'mobile';
  }): Promise<void> {
    await this.trackEvent(AnalyticsEvent.USER_LOGIN, {
      method: params.method,
      user_role: params.userRole,
    });

    await this.setUserId(params.userId);
  }

  async trackUserLogout(userId: number): Promise<void> {
    await this.trackEvent(AnalyticsEvent.USER_LOGOUT, {
      user_id: userId,
    });
    await this.reset();
  }
}

