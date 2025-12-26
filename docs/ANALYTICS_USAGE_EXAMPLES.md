# Analytics Usage Examples

Practical examples of using Firebase Analytics in your Tutorix applications.

## Web App Examples

### 1. Track Page Views with React Router

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from './lib/analytics';

function App() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location]);

  return <YourAppContent />;
}
```

### 2. Track Login Events

```tsx
import { useAnalytics } from './hooks/useAnalytics';
import { setUserId, setUserProperties } from './lib/analytics';

function LoginComponent() {
  const { analytics } = useAnalytics();

  const handleLogin = async (credentials) => {
    try {
      const response = await loginMutation(credentials);
      const user = response.data.login.user;

      // Set user in analytics
      setUserId(user.id);
      setUserProperties({
        user_id: user.id,
        user_role: user.role,
        email: user.email,
        mobile: user.mobile,
      });

      // Track login event
      analytics.trackLogin(
        user.role === 'ADMIN' ? 'email' : 'mobile',
        user.role
      );
    } catch (error) {
      analytics.trackError(error, false, { context: 'login' });
    }
  };

  return <LoginForm onSubmit={handleLogin} />;
}
```

### 3. Track Registration Events

```tsx
import { useAnalytics } from './hooks/useAnalytics';
import { setUserId, setUserProperties } from './lib/analytics';

function RegistrationComponent() {
  const { analytics } = useAnalytics();

  const handleRegister = async (formData) => {
    try {
      const response = await registerMutation(formData);
      const user = response.data.register.user;

      // Set user in analytics
      setUserId(user.id);
      setUserProperties({
        user_id: user.id,
        user_role: user.role,
        email: user.email,
        mobile: user.mobile,
        is_email_verified: user.isEmailVerified,
        is_mobile_verified: user.isMobileVerified,
      });

      // Track registration event
      analytics.trackRegistration(
        user.role === 'ADMIN' ? 'email' : 'mobile',
        user.role
      );
    } catch (error) {
      analytics.trackError(error, false, { context: 'registration' });
    }
  };

  return <RegistrationForm onSubmit={handleRegister} />;
}
```

### 4. Track Button Clicks

```tsx
import { useAnalytics } from './hooks/useAnalytics';

function TutorCard({ tutor }) {
  const { analytics } = useAnalytics();

  const handleBookClick = () => {
    analytics.trackButtonClick('book_tutor', 'tutor_card');
    analytics.trackTutorBooked(tutor.id, tutor.hourlyRate);
    // ... booking logic
  };

  return (
    <div>
      <h3>{tutor.name}</h3>
      <button onClick={handleBookClick}>Book Now</button>
    </div>
  );
}
```

### 5. Track Search Events

```tsx
import { useAnalytics } from './hooks/useAnalytics';

function TutorSearch() {
  const { analytics } = useAnalytics();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (term: string, filters: Record<string, unknown>) => {
    // Perform search
    const results = performSearch(term, filters);

    // Track search event
    analytics.trackTutorSearch(term, filters, results.length);
  };

  return <SearchForm onSubmit={handleSearch} />;
}
```

### 6. Track Errors

```tsx
import { trackError } from './lib/analytics';

// In error boundary or catch blocks
try {
  // Some operation
} catch (error) {
  trackError(error, false, {
    component: 'TutorSearch',
    action: 'search',
  });
}
```

## Mobile App Examples (React Native)

### 1. Track Screen Views

```tsx
import { useScreenTracking } from './hooks/useAnalytics';
import { View, Text } from 'react-native';

function HomeScreen() {
  useScreenTracking('Home', 'HomeScreen');

  return (
    <View>
      <Text>Home Screen</Text>
    </View>
  );
}
```

### 2. Track Navigation

```tsx
import { useAnalytics } from './hooks/useAnalytics';
import { useNavigation } from '@react-navigation/native';

function TutorListScreen() {
  const { analytics } = useAnalytics();
  const navigation = useNavigation();

  const handleTutorPress = (tutorId: number) => {
    analytics.trackNavigation('TutorList', 'TutorDetail');
    analytics.trackTutorViewed(tutorId);
    navigation.navigate('TutorDetail', { tutorId });
  };

  return <TutorList onTutorPress={handleTutorPress} />;
}
```

### 3. Track User Actions

```tsx
import { useAnalytics } from './hooks/useAnalytics';

function BookingScreen({ tutorId, hourlyRate }) {
  const { analytics } = useAnalytics();

  const handleBooking = async () => {
    try {
      // Process booking
      await bookTutor(tutorId);

      // Track events
      analytics.trackButtonClick('confirm_booking', 'booking_screen');
      analytics.trackTutorBooked(tutorId, hourlyRate);
      analytics.trackPaymentInitiated(hourlyRate);
    } catch (error) {
      analytics.trackError(error, false, { context: 'booking' });
    }
  };

  return <BookingForm onSubmit={handleBooking} />;
}
```

## Integration with GraphQL Resolvers (Backend)

### Track Server-Side Events

```typescript
// In your auth resolver or service
import { AnalyticsEvent } from '../../common/analytics/types';

@Resolver(() => User)
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly analyticsService: AnalyticsService, // If you implement backend analytics
  ) {}

  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    const result = await this.authService.login(input);

    // Track login event (if you have backend analytics)
    // await this.analyticsService.trackEvent(AnalyticsEvent.USER_LOGIN, {
    //   user_id: result.user.id,
    //   user_role: result.user.role,
    //   method: input.loginId.includes('@') ? 'email' : 'mobile',
    // });

    return result;
  }
}
```

## Best Practices

1. **Track User Context**: Always set user ID and properties after login
2. **Track Errors**: Capture all errors for debugging
3. **Use Consistent Naming**: Follow the event naming convention
4. **Don't Track PII**: Avoid tracking personally identifiable information directly
5. **Batch Events**: Firebase handles batching automatically
6. **Test Events**: Use Firebase DebugView to verify events are being tracked

## Testing Analytics

### Web Apps
1. Open browser DevTools → Network tab
2. Filter for "google-analytics" or "firebase"
3. Check that events are being sent

### Mobile Apps
1. Enable Firebase DebugView in Firebase Console
2. For Android: `adb shell setprop debug.firebase.analytics.app com.mobile`
3. For iOS: Enable DebugView in Firebase Console settings
4. View events in real-time in Firebase Console

## Next Steps

1. Integrate analytics into your authentication flow
2. Add page/screen tracking to all routes
3. Track key business events (bookings, payments, etc.)
4. Set up dashboards in Firebase Console
5. Create custom reports for important metrics


