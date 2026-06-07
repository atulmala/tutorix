/**
 * Firebase Admin Analytics Provider for Server-Side (NestJS API)
 *
 * Client-first analytics: user-facing events are tracked via Firebase SDK on
 * web/mobile/admin. This provider is a no-op placeholder until GA4 Measurement
 * Protocol is implemented for server-only events (e.g. payment webhooks).
 */

import { IAnalyticsService } from './analytics.service';
import { AnalyticsEvent, UserProperties } from './types';

export class FirebaseAdminAnalyticsProvider implements IAnalyticsService {
  private isInitialized = false;

  async initialize(config: Record<string, unknown>): Promise<void> {
    void config;
    this.isInitialized = true;
  }

  async trackEvent(event: AnalyticsEvent, params?: Record<string, unknown>): Promise<void> {
    void event;
    void params;
  }

  async trackPageView(pagePath: string, pageTitle?: string): Promise<void> {
    void pagePath;
    void pageTitle;
  }

  async trackScreenView(screenName: string, screenClass?: string): Promise<void> {
    void screenName;
    void screenClass;
  }

  async setUserProperties(properties: UserProperties): Promise<void> {
    void properties;
  }

  async setUserId(userId: string | number | null): Promise<void> {
    void userId;
  }

  async reset(): Promise<void> {
    // No-op
  }

  async trackError(
    error: Error | string,
    fatal = false,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    void error;
    void fatal;
    void additionalData;
  }
}
