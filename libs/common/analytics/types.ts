/**
 * Analytics Event Types
 * 
 * Defines all analytics events that can be tracked across the application.
 */

export enum AnalyticsEvent {
  // User Events
  USER_REGISTERED = 'user_registered',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_PROFILE_UPDATED = 'user_profile_updated',
  
  // Signup Journey Events
  SIGNUP_STARTED = 'signup_started',
  SIGNUP_BASIC_DETAILS_SUBMITTED = 'signup_basic_details_submitted',
  SIGNUP_PHONE_VERIFICATION_STARTED = 'signup_phone_verification_started',
  SIGNUP_PHONE_VERIFICATION_COMPLETED = 'signup_phone_verification_completed',
  SIGNUP_EMAIL_VERIFICATION_STARTED = 'signup_email_verification_started',
  SIGNUP_EMAIL_VERIFICATION_COMPLETED = 'signup_email_verification_completed',
  SIGNUP_COMPLETED = 'signup_completed',
  SIGNUP_ABANDONED = 'signup_abandoned',
  SIGNUP_RESUMED = 'signup_resumed',
  
  // OTP Events
  OTP_REQUESTED = 'otp_requested',
  OTP_VERIFICATION_ATTEMPTED = 'otp_verification_attempted',
  OTP_VERIFICATION_FAILED = 'otp_verification_failed',
  OTP_RESEND_REQUESTED = 'otp_resend_requested',
  
  // Page/Screen Views
  PAGE_VIEW = 'page_view',
  SCREEN_VIEW = 'screen_view',
  
  // Navigation
  NAVIGATION = 'navigation',
  
  // Actions
  BUTTON_CLICK = 'button_click',
  LINK_CLICK = 'link_click',
  FORM_SUBMIT = 'form_submit',
  
  // Errors
  ERROR = 'error',
  EXCEPTION = 'exception',
  
  // Business Events
  TUTOR_SEARCH = 'tutor_search',
  TUTOR_VIEWED = 'tutor_viewed',
  TUTOR_BOOKED = 'tutor_booked',
  CLASS_CREATED = 'class_created',
  CLASS_JOINED = 'class_joined',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  
  // Engagement
  SEARCH_PERFORMED = 'search_performed',
  FILTER_APPLIED = 'filter_applied',
  CONTENT_SHARED = 'content_shared',
}

export interface BaseAnalyticsEvent {
  event: AnalyticsEvent;
  timestamp?: number;
  userId?: string | number;
  sessionId?: string;
  [key: string]: unknown;
}

export interface PageViewEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.PAGE_VIEW;
  page_path: string;
  page_title?: string;
  page_location?: string;
}

export interface ScreenViewEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.SCREEN_VIEW;
  screen_name: string;
  screen_class?: string;
}

export interface UserEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.USER_REGISTERED | AnalyticsEvent.USER_LOGIN | AnalyticsEvent.USER_LOGOUT;
  method?: string; // e.g., 'email', 'mobile', 'google'
  user_role?: string; // 'TUTOR', 'STUDENT', 'ADMIN'
}

export interface ErrorEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.ERROR | AnalyticsEvent.EXCEPTION;
  error_message: string;
  error_code?: string;
  error_location?: string;
  fatal?: boolean;
}

export interface ButtonClickEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.BUTTON_CLICK;
  button_name: string;
  button_location?: string;
}

export interface SearchEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.SEARCH_PERFORMED | AnalyticsEvent.TUTOR_SEARCH;
  search_term?: string;
  search_filters?: Record<string, unknown>;
  results_count?: number;
}

export interface BusinessEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.TUTOR_BOOKED | AnalyticsEvent.CLASS_CREATED | AnalyticsEvent.PAYMENT_COMPLETED;
  value?: number; // e.g., booking value, payment amount
  currency?: string;
  [key: string]: unknown;
}

export type AnalyticsEventData =
  | PageViewEvent
  | ScreenViewEvent
  | UserEvent
  | ErrorEvent
  | ButtonClickEvent
  | SearchEvent
  | BusinessEvent
  | BaseAnalyticsEvent;

export interface UserProperties {
  user_id?: string | number;
  user_role?: 'TUTOR' | 'STUDENT' | 'ADMIN';
  email?: string;
  mobile?: string;
  is_email_verified?: boolean;
  is_mobile_verified?: boolean;
  created_date?: string;
  [key: string]: unknown;
}


