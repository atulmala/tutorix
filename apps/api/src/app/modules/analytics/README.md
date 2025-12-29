# Analytics Module

This module provides server-side analytics tracking for the API using Firebase Admin SDK.

## Setup

### 1. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Configure Firebase Admin

You need to provide Firebase Admin credentials. There are two ways:

#### Option A: Service Account JSON File

1. Download your Firebase service account key from [Firebase Console](https://console.firebase.google.com/)
2. Go to Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Save the JSON file securely
5. Set the environment variable:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json
```

#### Option B: Service Account JSON String

Set the service account JSON as an environment variable:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

#### Option C: Default Application Credentials (GCP)

If running on Google Cloud Platform, you can use default application credentials:

```bash
FIREBASE_PROJECT_ID=your-project-id
```

### 3. Environment Variables

Add to your `.env` file:

```env
# Required
FIREBASE_PROJECT_ID=tutorix-b7882

# Option A: Service Account File Path
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json

# Option B: Service Account JSON String (alternative to file path)
# FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

## Usage

The `AnalyticsService` is available globally and can be injected into any service:

```typescript
import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../analytics/services/analytics.service';

@Injectable()
export class YourService {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async someMethod() {
    // Track an event
    await this.analyticsService.trackEvent(AnalyticsEvent.TUTOR_SEARCH, {
      search_term: 'math',
      results_count: 10,
    });

    // Track user registration
    await this.analyticsService.trackUserRegistration({
      userId: 123,
      userRole: 'TUTOR',
      method: 'mobile',
    });
  }
}
```

## Available Methods

- `trackEvent(event, params)` - Track a custom event
- `trackUserRegistration(params)` - Track user registration
- `trackUserLogin(params)` - Track user login
- `trackUserLogout(userId)` - Track user logout
- `setUserProperties(properties)` - Set user properties
- `setUserId(userId)` - Set user ID
- `reset()` - Reset analytics (on logout)
- `trackError(error, fatal, additionalData)` - Track errors

## Current Implementation

Currently, the analytics events are logged to the console. This can be extended to:

1. Send events via Google Analytics Measurement Protocol
2. Store events in a database for processing
3. Send events to a message queue for async processing
4. Integrate with other analytics services

## Notes

- Analytics failures are logged but don't affect the main application flow
- The service gracefully handles missing Firebase configuration
- Events are tracked asynchronously to avoid blocking requests

