/**
 * Analytics Common Module
 * 
 * Shared analytics types and interfaces for all platforms
 * 
 * Note: Mobile provider is exported separately to avoid bundling React Native in web apps
 * Admin provider is exported separately to avoid bundling firebase-admin in client apps
 * Crashlytics provider is exported separately to avoid bundling React Native in web builds
 */

export * from './types';
export * from './analytics.service';
export * from './firebase-web.provider';

// Mobile provider is exported conditionally to avoid bundling React Native in web builds
// Mobile apps should import directly from './firebase-mobile.provider'

// Admin provider is exported separately to avoid bundling firebase-admin in client apps
// Server-side apps should import directly from './firebase-admin.provider'

// Crashlytics provider is exported separately to avoid bundling React Native in web builds
// Mobile apps should import directly from './firebase-crashlytics.provider'


