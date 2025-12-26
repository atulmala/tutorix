# Analytics Setup Guide

This guide covers setting up analytics across all Tutorix applications (Web, Web-Admin, Mobile, and API).

## 🎯 Implementation Status

✅ **Firebase Analytics has been implemented** across all platforms!
- Shared analytics library created
- Web app integration complete
- Web Admin app integration complete
- Mobile app integration complete
- All event types defined
- React hooks available
- Auto-initialization configured

**See [FIREBASE_ANALYTICS_SUMMARY.md](./FIREBASE_ANALYTICS_SUMMARY.md) for implementation details.**

## Analytics Options

### 1. **Firebase Analytics** (Recommended for Mobile)
- **Pros**: 
  - Free tier is generous
  - Excellent mobile support (iOS/Android)
  - Google Analytics integration
  - Real-time data
  - User properties and custom events
- **Cons**: 
  - Less flexible than some alternatives
  - Google ecosystem dependency
- **Best for**: Mobile apps, comprehensive Google ecosystem integration

### 2. **PostHog** (Recommended for Web)
- **Pros**: 
  - Open-source option available
  - Product analytics + feature flags
  - Session replay
  - Great for web applications
  - Privacy-focused
- **Cons**: 
  - Mobile support is newer
- **Best for**: Web apps, product analytics, startups

### 3. **Mixpanel**
- **Pros**: 
  - Powerful event tracking
  - Great segmentation
  - Funnels and cohorts
- **Cons**: 
  - Can get expensive
- **Best for**: Product analytics, event-heavy applications

### 4. **Amplitude**
- **Pros**: 
  - Great user behavior analytics
  - Strong mobile support
  - Good free tier
- **Cons**: 
  - Complex for simple use cases
- **Best for**: User behavior analytics

### 5. **Custom Solution** (Backend tracking)
- **Pros**: 
  - Full control
  - Privacy compliance
  - Custom data model
- **Cons**: 
  - More development time
  - Infrastructure needed
- **Best for**: Sensitive data, full control requirements

## ✅ Implemented Solution

**Firebase Analytics** has been implemented across all platforms:
1. **Web App**: Firebase Analytics (React)
2. **Web Admin App**: Firebase Analytics (React)
3. **Mobile App**: Firebase Analytics (React Native)
4. **Backend API**: Ready for Firebase Admin SDK integration (optional)

This provides:
- ✅ Consistent analytics across all platforms
- ✅ Single dashboard for all data
- ✅ Excellent mobile support
- ✅ Real-time event tracking
- ✅ User properties and segmentation

## Implementation Strategy

### Option A: Firebase Analytics (All Platforms)

**Installation Required:**
- Mobile: `@react-native-firebase/analytics`
- Web: `firebase` SDK

### Option B: PostHog (Web) + Firebase (Mobile)

**Installation Required:**
- Web: `posthog-js`
- Mobile: `@react-native-firebase/analytics` or `posthog-react-native`

### Option C: Custom Analytics Service

**Implementation:**
- Create analytics service in backend
- Track events via GraphQL mutations or REST endpoints
- Store in database or send to analytics service

## Shared Analytics Library Structure

For a monorepo, we recommend creating a shared analytics library:

```
libs/
  shared/
    analytics/
      src/
        lib/
          analytics.service.ts        # Core analytics service
          events.ts                   # Event definitions
          providers/
            firebase.provider.ts      # Firebase implementation
            posthog.provider.ts       # PostHog implementation
            custom.provider.ts        # Custom/backend implementation
          types.ts                    # Type definitions
        index.ts
```

## Next Steps

1. **Choose Analytics Provider(s)**
2. **Create Shared Analytics Library** (if using Nx library)
3. **Configure for Each App**:
   - Web App
   - Web Admin App
   - Mobile App
   - Backend API (optional)
4. **Define Events** (track user actions, errors, conversions)
5. **Set Up Dashboards** (in analytics platform)

## Questions to Decide

1. **Which provider(s) do you want to use?**
   - Firebase Analytics (all platforms)
   - PostHog (web) + Firebase (mobile)
   - Mixpanel/Amplitude
   - Custom backend solution

2. **What events do you want to track?**
   - User registration/login
   - Page/screen views
   - Button clicks/actions
   - Errors/exceptions
   - Business events (tutor matched, class booked, etc.)

3. **Privacy requirements?**
   - GDPR compliance needed?
   - User consent management?
   - Data retention policies?

Let me know your preferences and I can implement the chosen solution!

