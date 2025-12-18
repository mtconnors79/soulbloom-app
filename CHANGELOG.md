# Changelog

All notable changes to the MindWell app are documented in this file.

## [0.5.0] - 2025-12-18

### Added
- **Progress/Achievements Screen** - New tab with gamification features
  - Today's Goals section with 3 circular progress rings (Check-in, Mindfulness, Mood)
  - Current Streaks display with flame icons for each activity type
  - 9 achievement badges: First Steps, Week One, Week Warrior, Monthly Master, Mindful Beginner, Zen Master, Deep Breather, Mood Tracker, Journaler
  - Weekly Challenges with progress bars (Daily Calm, Mood Awareness, Check-in Champion)
  - Congratulations modal when unlocking new badges
  - Auto-check achievements after completing activities
- **Backend Progress API** (`/api/progress`)
  - `GET /today` - Today's goal completion status
  - `GET /streaks` - Current streak counts
  - `GET /achievements` - All badges with unlock status
  - `POST /achievements/check` - Evaluate and unlock earned badges
  - `GET /challenges` - Weekly challenges with progress
- **UserAchievement PostgreSQL model** for tracking unlocked badges
- Updated HomeScreen Quick Actions: replaced Activity button with Progress button

### Fixed
- Mood stats endpoint now accepts `days` parameter for relative date filtering

## [0.4.0] - 2025-12-17

### Added
- **Mindfulness Activity Library** - Comprehensive wellness activities
  - 5 categories: Breathing, Grounding, Quick Resets, Guided Meditations, Sleep
  - Built-in activities: Box Breathing, 4-7-8 Relaxing Breath, Deep Belly Breathing
  - Grounding exercises: 5-4-3-2-1 Senses, Body Scan
  - External links to UCLA Mindful guided meditations
  - Activity completion tracking with stats and streaks
- **BreathingExerciseModal** - Full-screen animated breathing guide
  - Expanding/contracting circle animation using React Native Animated API
  - Phase indicators (Ready, Inhale, Hold, Exhale)
  - Cycle counter and progress tracking
  - Haptic feedback on phase changes
- **Suggested Activity Card** on HomeScreen based on recent mood
- New Mindfulness tab in bottom navigation with leaf icon
- **Backend Mindfulness API** (`/api/activities/mindfulness`)
  - List activities by category
  - Mark activities complete
  - User completion stats
  - Mood-based activity suggestions

### Changed
- ActivityCompletion PostgreSQL model for tracking mindfulness completions

## [0.3.0] - 2025-12-17

### Added
- **Crisis Resources Feature** with 3 access points
  - Automatic modal display for high-risk check-ins (requires acknowledgment)
  - "Need support?" link for negative sentiment entries
  - Manual access via Profile screen
  - Resources include: National Suicide Prevention Lifeline, Crisis Text Line, SAMHSA, 911
- **CrisisResourcesModal component** with tap-to-call functionality
- **Backend Resources API** (`/api/resources/crisis`)

## [0.2.0] - 2025-12-16

### Added
- **Quick Mood Logging** on HomeScreen
  - 5-emoji scale for instant mood tracking
  - One-tap logging without full check-in flow
- **Mood Visualization Charts** on MoodScreen
  - Line chart showing mood trends over time
  - Time range filters (7 days, 30 days, 90 days)
  - Sentiment distribution breakdown
  - Check-in history list
- **Structured Check-in Flow**
  - 5-point mood rating selector with emojis
  - Stress level slider (1-10 scale)
  - Emotion tag multi-select (8 emotions)
  - Free-form text input with character count
  - AI analysis preview before saving
- **Environment Variable Management** with react-native-config
  - Separate .env files for mobile and backend
  - Google Sign-In client IDs configuration
  - API base URL configuration

### Changed
- Refactored mood tracking UX for better user experience

## [0.1.0] - 2025-12-15

### Added
- Initial React Native app setup with React Navigation
- **Firebase Authentication** with Google Sign-In
  - iOS and Android configuration
  - Auto-create users in PostgreSQL on first Firebase login
- **Backend API** with Express.js
  - PostgreSQL database with Sequelize ORM
  - MongoDB with Mongoose ODM
  - JWT + Firebase token authentication
  - Rate limiting middleware
- **Core Screens**
  - LoginScreen with Google Sign-In button
  - HomeScreen with greeting and dashboard
  - CheckInScreen for daily entries
  - MoodScreen for tracking history
  - ProfileScreen with user info and logout
- **AI-Powered Sentiment Analysis**
  - Anthropic Claude API integration
  - Sentiment, emotions, risk level detection
  - Personalized suggestions and supportive messages
- **Data Models**
  - User, Profile, MoodEntry, EmergencyContact (PostgreSQL)
  - CheckinResponse, ActivityLog (MongoDB)

### Technical
- React Native 0.83
- Bottom tab navigation with Ionicons
- Axios API client with interceptors
- Android emulator localhost handling
