# MindWell Mobile App

React Native application for iOS and Android.

## Tech Stack

- **Framework**: React Native 0.83
- **Navigation**: React Navigation 6 (Bottom Tabs + Stack)
- **Authentication**: Firebase Auth with Google Sign-In
- **Configuration**: react-native-config
- **Icons**: react-native-vector-icons (Ionicons)
- **Charts**: react-native-chart-kit

## Quick Start

### Prerequisites
- Node.js 18+
- Xcode 15+ (iOS)
- Android Studio (Android)
- CocoaPods (iOS)

### Installation

```bash
# Install dependencies
npm install

# iOS: Install CocoaPods
cd ios && pod install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run iOS
npx react-native run-ios --simulator="iPhone 16 Pro"

# Run Android
npx react-native run-android
```

## Project Structure

```
mobile/
├── ios/                          # iOS native code
├── android/                      # Android native code
└── src/
    ├── components/
    │   ├── BreathingExerciseModal.js  # Animated breathing exercise
    │   └── CrisisResourcesModal.js    # Crisis support modal
    ├── navigation/
    │   └── AppNavigator.js       # Tab + Stack navigation
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.js    # Google Sign-In
    │   │   └── RegisterScreen.js
    │   └── main/
    │       ├── HomeScreen.js     # Dashboard
    │       ├── CheckInScreen.js  # Daily check-in
    │       ├── MoodScreen.js     # My Journey trends
    │       ├── MindfulnessScreen.js  # Activity library
    │       ├── ProgressScreen.js     # Achievements
    │       └── ProfileScreen.js      # Settings
    └── services/
        └── api.js                # API client with interceptors
```

## Screens & Navigation

### Bottom Tab Navigation

| Tab | Screen | Icon | Description |
|-----|--------|------|-------------|
| Home | HomeScreen | `home` | Dashboard with quick mood, suggestions |
| Check-In | CheckInScreen | `create` | Daily structured check-in |
| My Journey | MoodScreen | `analytics` | Mood trends and history |
| Mindfulness | MindfulnessScreen | `leaf` | Activity library |
| Progress | ProgressScreen | `trophy` | Goals, streaks, achievements |
| Profile | ProfileScreen | `person` | Settings, crisis resources |

### Screen Details

#### HomeScreen
- Personalized greeting
- Quick mood logging (5 emoji buttons)
- Suggested mindfulness activity based on recent mood
- Weekly mood summary card
- Latest check-in preview
- Quick action buttons grid

#### CheckInScreen
- Mood rating selector (5 options: Great to Terrible)
- Stress level slider (1-10)
- Emotion tag multi-select (8 emotions)
- Free-form text input (2000 char limit)
- AI analysis preview before saving
- Crisis resources auto-display for high-risk entries

#### MoodScreen (My Journey)
- Time range filter (7 days, 30 days, 90 days)
- Mood trend line chart
- Sentiment distribution breakdown
- Check-in history list
- Stats summary (total entries, average, trend)

#### MindfulnessScreen
- Activity categories (expandable sections)
- Category icons and colors
- Activity cards with duration badges
- BreathingExerciseModal for breathing activities
- External links for guided meditations
- Completion stats card (total, streak, weekly)

#### ProgressScreen
- Today's Goals: 3 circular progress rings
- Current Streaks: 4 flame counters
- Weekly Challenges: Progress bars
- Achievements: Badge grid (locked/unlocked)
- Congratulations modal for new badges

#### ProfileScreen
- User info display
- Crisis resources access button
- Logout functionality

## Components

### BreathingExerciseModal
Full-screen modal with animated breathing guide:
- Expanding/contracting circle animation
- Phase indicators (Inhale, Hold, Exhale)
- Cycle counter
- Haptic feedback on phase changes
- Completion callback

### CrisisResourcesModal
Support resources display:
- Hotline numbers with tap-to-call
- Crisis text line info
- Acknowledgment requirement for high-risk
- Custom alert messages

## API Service

Located in `src/services/api.js`:

```javascript
// Available API modules
authAPI      // Authentication
profileAPI   // User profile
moodAPI      // Mood entries
checkinAPI   // Check-ins with AI
mindfulnessAPI  // Activities
progressAPI  // Goals, streaks, badges
resourcesAPI // Crisis resources
emergencyContactAPI
notificationAPI
```

### Features
- Automatic Firebase token injection
- Token refresh on 401 errors
- Android emulator localhost handling
- Error message formatting

## Environment Variables

Create `.env` in the mobile directory:

```env
# Google Sign-In (from Firebase Console)
IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# API Base URL
API_BASE_URL=http://localhost:3000/api
```

### Getting Google Client IDs

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Authentication > Sign-in method > Google
4. Enable Google Sign-In
5. Copy Web Client ID
6. For iOS Client ID, download `GoogleService-Info.plist` and find `CLIENT_ID`

## iOS Setup

### GoogleService-Info.plist
1. Download from Firebase Console
2. Place in `ios/MindWellMobile/`
3. Add to Xcode project

### URL Schemes
The `REVERSED_CLIENT_ID` from GoogleService-Info.plist must be added to URL schemes in Xcode.

### Vector Icons
Fonts are linked in `ios/MindWellMobile/Info.plist`:
```xml
<key>UIAppFonts</key>
<array>
    <string>Ionicons.ttf</string>
</array>
```

## Android Setup

### google-services.json
1. Download from Firebase Console
2. Place in `android/app/`

### Vector Icons
Fonts are copied via `react-native.config.js` asset linking.

## Development

### Start Metro Bundler
```bash
npx react-native start --reset-cache
```

### Run on iOS
```bash
npx react-native run-ios
```

### Run on Android
```bash
npx react-native run-android
```

### Clean Build
```bash
# iOS
cd ios && xcodebuild clean && pod install && cd ..

# Android
cd android && ./gradlew clean && cd ..
```

## Troubleshooting

### Metro bundler issues
```bash
npx react-native start --reset-cache
```

### iOS build fails
```bash
cd ios && pod deintegrate && pod install && cd ..
```

### Android emulator can't reach localhost
The API service automatically converts `localhost` to `10.0.2.2` for Android emulators.

### Vector icons not showing
```bash
# iOS
cd ios && pod install && cd ..

# Android
npx react-native-asset
```
