# SoulBloom Mobile App

React Native mobile application for iOS and Android.

## Setup

```bash
# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..

# Configure environment
cp .env.example .env

# Run iOS
npx react-native run-ios

# Run Android
npx react-native run-android
```

## Environment Variables

```env
# API
API_BASE_URL=http://localhost:3000/api

# Google Sign-In
IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## Project Structure

```
src/
├── components/
│   ├── BreathingExerciseModal.js   # Animated breathing guide
│   ├── CrisisResourcesModal.js     # Crisis support with 911 flow
│   ├── AddContactModal.js          # Emergency contact form
│   ├── AddGoalModal.js             # Goal creation with templates
│   ├── GoalCard.js                 # Goal progress display
│   ├── MoodRangeBand.js            # Mood variability chart
│   ├── VarianceFlag.js             # Mood swing indicators
│   ├── OptimizedImage.js           # Lazy loading images
│   └── ScreenLoader.js             # Loading placeholder
├── navigation/
│   └── AppNavigator.js             # Tab + Stack navigation
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js
│   │   └── RegisterScreen.js
│   └── main/
│       ├── HomeScreen.js           # Dashboard
│       ├── CheckInScreen.js        # Daily check-in
│       ├── MoodScreen.js           # Mood trends + variability
│       ├── MindfulnessScreen.js    # Activity library
│       ├── ProgressScreen.js       # Goals, streaks, badges
│       ├── ProfileScreen.js        # User profile
│       ├── SettingsScreen.js       # All settings
│       ├── EmergencyContactsScreen.js
│       ├── CareCircleScreen.js     # Trusted person sharing
│       └── GoalHistoryScreen.js    # Past goals
├── services/
│   ├── api.js                      # API client
│   ├── notificationService.js      # Local notifications
│   ├── pushNotificationService.js  # FCM push notifications
│   └── goalsApi.js                 # Goals API
└── theme/
    └── colors.js                   # SoulBloom color palette
```

## Key Dependencies

- react-native 0.76+
- @react-navigation/native
- @react-native-firebase/auth
- @react-native-firebase/messaging
- @notifee/react-native
- react-native-chart-kit
- react-native-reanimated
- react-native-localize

## Screens

### Tab Navigation
| Tab | Screen | Description |
|-----|--------|-------------|
| Home | HomeScreen | Quick mood, suggested activity |
| Check-In | CheckInScreen | Structured check-in with AI |
| My Journey | MoodScreen | Mood trends + variability charts |
| Mindfulness | MindfulnessScreen | Breathing + activities |
| Progress | ProgressScreen | Goals, streaks, badges |
| Profile | ProfileScreen | Settings, crisis resources |

### Stack Screens
| Screen | Description |
|--------|-------------|
| Settings | Reminders, goals, push prefs, display |
| EmergencyContacts | Support contact management |
| CareCircle | Trusted person connections |
| GoalHistory | Past goals (completed/abandoned) |

## Features

### Mood Tracking
- 5-point mood scale
- Stress level slider
- Emotion tags
- AI-powered sentiment analysis
- Mood variability visualization

### Goals
- Daily automatic goals
- User-defined goals with templates
- Progress tracking
- Goal notifications

### Care Circle
- Invite trusted persons
- View connection status
- Audit log of data access

### Push Notifications
- Pattern intervention (negative mood streak)
- Streak reminders
- Goal alerts
- Quiet hours support
- Daily limits

## Testing

```bash
npm test              # Run all tests
npm test -- --coverage # With coverage report
```

## Building

### iOS
```bash
cd ios
xcodebuild -workspace SoulBloom.xcworkspace -scheme SoulBloom -configuration Release
```

### Android
```bash
cd android
./gradlew assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

## Performance Optimizations

- Lazy screen loading (React.lazy + Suspense)
- React.memo on frequently re-rendered components
- FlatList optimizations (windowSize, removeClippedSubviews)
- Multi-resolution logo images (@1x, @2x, @3x)
- ProGuard/R8 enabled for Android release

## Troubleshooting

### Metro bundler issues
```bash
npx react-native start --reset-cache
```

### iOS build fails
```bash
cd ios && pod deintegrate && pod install && cd ..
```

### Android emulator API issues
API service auto-converts localhost to 10.0.2.2

### Vector icons not showing
```bash
cd ios && pod install && cd ..
npx react-native-asset
```
