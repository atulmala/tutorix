import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FirebaseAdminAnalyticsProvider } from '@tutorix/analytics/firebase-admin.provider';
import { AnalyticsEvent, UserProperties } from '@tutorix/analytics';

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);
  private analyticsProvider: FirebaseAdminAnalyticsProvider | null = null;
  private isInitialized = false;

  async onModuleInit() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Analytics already initialized');
      return;
    }

    try {
      this.analyticsProvider = new FirebaseAdminAnalyticsProvider();
      await this.analyticsProvider.initialize({});
      this.isInitialized = true;
      this.logger.log('Analytics service ready (client-first; server events are no-op until Measurement Protocol)');
    } catch (error) {
      this.logger.error('Failed to initialize analytics:', error);
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
