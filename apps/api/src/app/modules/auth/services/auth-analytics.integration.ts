/**
 * Analytics Integration for Auth Service
 * 
 * Example integration showing how to track authentication events
 * This can be imported and used in your auth service or resolvers
 */

import { AnalyticsEvent, UserProperties } from '@tutorix/analytics';

/**
 * Helper functions to track authentication events
 * These can be called from your auth service after successful operations
 */

export interface TrackRegistrationParams {
  userId: number;
  userRole: string;
  method: 'email' | 'mobile';
  email?: string;
  mobile?: string;
}

export interface TrackLoginParams {
  userId: number;
  userRole: string;
  method: 'email' | 'mobile';
}

/**
 * Format user properties for analytics
 */
export function formatUserProperties(user: {
  id: number;
  role: string;
  email?: string;
  mobile?: string;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
  createdDate?: Date;
}): UserProperties {
  return {
    user_id: user.id,
    user_role: user.role as 'TUTOR' | 'STUDENT' | 'ADMIN',
    email: user.email,
    mobile: user.mobile,
    is_email_verified: user.isEmailVerified,
    is_mobile_verified: user.isMobileVerified,
    created_date: user.createdDate?.toISOString(),
  };
}

/**
 * Get analytics event data for registration
 */
export function getRegistrationEventData(params: TrackRegistrationParams): {
  event: AnalyticsEvent;
  params: Record<string, unknown>;
  userProperties: UserProperties;
} {
  return {
    event: AnalyticsEvent.USER_REGISTERED,
    params: {
      method: params.method,
      user_role: params.userRole,
    },
    userProperties: {
      user_id: params.userId,
      user_role: params.userRole as 'TUTOR' | 'STUDENT' | 'ADMIN',
      email: params.email,
      mobile: params.mobile,
    },
  };
}

/**
 * Get analytics event data for login
 */
export function getLoginEventData(params: TrackLoginParams): {
  event: AnalyticsEvent;
  params: Record<string, unknown>;
  userProperties: UserProperties;
} {
  return {
    event: AnalyticsEvent.USER_LOGIN,
    params: {
      method: params.method,
      user_role: params.userRole,
    },
    userProperties: {
      user_id: params.userId,
      user_role: params.userRole as 'TUTOR' | 'STUDENT' | 'ADMIN',
    },
  };
}


