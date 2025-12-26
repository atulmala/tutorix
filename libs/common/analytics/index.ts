/**
 * Analytics Common Module
 * 
 * Shared analytics types and interfaces for all platforms
 * 
 * Note: Mobile provider is exported separately to avoid bundling React Native in web apps
 */

export * from './types';
export * from './analytics.service';
export * from './firebase-web.provider';

// Mobile provider is exported conditionally to avoid bundling React Native in web builds
// Mobile apps should import directly from './firebase-mobile.provider'


