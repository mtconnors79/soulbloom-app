# MindWell - Mental Health & Wellness App

A comprehensive mental health tracking and wellness application built with React Native (iOS/Android) and Node.js backend.

## Features

### Daily Check-In with AI Analysis
- Structured check-in flow with mood rating, stress level slider, and emotion tags
- Free-form journaling with AI-powered sentiment analysis via Claude
- Personalized supportive messages and suggestions based on entries
- Risk level assessment for proactive mental health support

### Quick Mood Logging
- One-tap mood logging from the home screen
- 5-point emoji scale (Great, Good, Okay, Not Great, Difficult)
- Instant mood tracking without full check-in flow

### My Journey - Mood Trends & Visualization
- Weekly and monthly mood trend charts
- Sentiment distribution breakdown
- Check-in history with date range filtering
- Track emotional patterns over time

### Mindfulness Activity Library
- **Breathing Exercises**: Box Breathing, 4-7-8 Relaxing Breath, Deep Belly Breathing with animated visual guides
- **Grounding Techniques**: 5-4-3-2-1 Senses, Body Scan exercises
- **Quick Resets**: 1-minute calm, Tension release exercises
- **Guided Meditations**: Links to UCLA Mindful meditations
- **Sleep Support**: Sleep-focused breathing and body scan
- Activity completion tracking with streaks

### Progress & Achievements
- **Today's Goals**: Track daily check-in, mindfulness, and mood logging completion
- **Streaks**: Maintain consecutive day streaks for each activity type
- **Badges**: Unlock 9 achievement badges (First Steps, Week Warrior, Zen Master, etc.)
- **Weekly Challenges**: Complete curated challenges like "Daily Calm" and "Mood Awareness"
- Congratulations modal when unlocking new achievements

### Crisis Resources (3 Access Points)
- Automatic display for high-risk check-ins with required acknowledgment
- "Need support?" link shown for negative sentiment entries
- Manual access via Profile screen
- Includes National Suicide Prevention Lifeline, Crisis Text Line, and more

### User Authentication
- Firebase Authentication with Google Sign-In
- Secure JWT token management
- Automatic token refresh
- Profile management with preferences

## Tech Stack

### Frontend (Mobile)
- React Native 0.83
- React Navigation (Bottom Tabs + Stack)
- Firebase Auth with Google Sign-In
- react-native-config for environment variables
- react-native-vector-icons (Ionicons)
- Animated API for breathing exercise visuals

### Backend
- Node.js with Express
- PostgreSQL (Sequelize ORM) - Users, Profiles, Mood Entries, Achievements
- MongoDB (Mongoose) - Check-in responses, Activity logs
- Firebase Admin SDK for token verification
- Anthropic Claude API for sentiment analysis

## Project Structure

```
mindwell-app/
├── backend/                 # Node.js API server
│   ├── config/             # Database and Firebase configuration
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth, rate limiting, error handling
│   ├── models/             # Sequelize and Mongoose models
│   ├── routes/             # API route definitions
│   └── index.js            # Server entry point
│
├── mobile/                  # React Native app
│   ├── ios/                # iOS native code
│   ├── android/            # Android native code
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── navigation/     # Navigation configuration
│       ├── screens/        # Screen components
│       └── services/       # API client and utilities
│
└── README.md               # This file
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Xcode 15+ (for iOS development)
- Android Studio (for Android development)
- Firebase project with Authentication enabled

### 1. Clone the Repository
```bash
git clone https://github.com/mtconnors79/mindwell-app.git
cd mindwell-app
```

### 2. Backend Setup
```bash
cd backend
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your database credentials and API keys

# Set up Firebase service account
# Download from Firebase Console > Project Settings > Service Accounts
# Save as backend/config/firebase-service-account.json

# Start the server
npm start
```

### 3. Database Setup
```bash
# PostgreSQL - Create database
createdb mindwell_db
# Tables are auto-created by Sequelize on first run

# MongoDB - Start service
brew services start mongodb-community
# Collections are created automatically
```

### 4. Mobile Setup
```bash
cd mobile
npm install

# iOS only: Install CocoaPods dependencies
cd ios && pod install && cd ..

# Copy environment template
cp .env.example .env
# Edit .env with your Google Sign-In client IDs and API URL

# Run on iOS Simulator
npx react-native run-ios

# Run on Android Emulator
npx react-native run-android
```

## Environment Variables

### Backend (.env)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment (development/production) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `MONGODB_URI` | MongoDB connection string |
| `FIREBASE_*` | Firebase project configuration |
| `ANTHROPIC_API_KEY` | Claude API key for sentiment analysis |
| `JWT_SECRET` | Secret for JWT token signing |
| `JWT_EXPIRES_IN` | Token expiration (default: 7d) |

### Mobile (.env)
| Variable | Description |
|----------|-------------|
| `IOS_CLIENT_ID` | Google Sign-In iOS client ID |
| `WEB_CLIENT_ID` | Google Sign-In web client ID |
| `API_BASE_URL` | Backend API URL |

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login with email/password |
| POST | `/register/firebase` | Register with Firebase token |
| POST | `/login/firebase` | Login with Firebase token |
| GET | `/me` | Get current user info |

### Check-ins (`/api/checkins`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create check-in with AI analysis |
| GET | `/` | List check-ins (paginated) |
| GET | `/stats` | Get check-in statistics |
| GET | `/:id` | Get single check-in |
| PUT | `/:id` | Update check-in |
| DELETE | `/:id` | Delete check-in |
| POST | `/analyze` | Analyze text without saving |

### Mood (`/api/mood`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create mood entry |
| GET | `/` | List mood entries |
| GET | `/stats` | Get mood statistics (supports `days` param) |
| GET | `/:id` | Get mood entry |
| PUT | `/:id` | Update mood entry |
| DELETE | `/:id` | Delete mood entry |

### Mindfulness (`/api/activities/mindfulness`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all activities by category |
| GET | `/:activityId` | Get activity details |
| POST | `/:activityId/complete` | Mark activity complete |
| GET | `/stats/user` | Get user's completion stats |
| GET | `/suggested/activity` | Get suggested activity based on mood |

### Progress (`/api/progress`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/today` | Today's goal completion status |
| GET | `/streaks` | Current streak counts |
| GET | `/achievements` | All badges with unlock status |
| POST | `/achievements/check` | Check and unlock earned badges |
| GET | `/challenges` | Weekly challenges with progress |

### Resources (`/api/resources`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/crisis` | Get crisis support resources |

### Profile (`/api/profile`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user profile |
| PUT | `/` | Update profile |
| PUT | `/preferences` | Update preferences |
| DELETE | `/preferences/:key` | Delete preference |

### Emergency Contacts (`/api/emergency-contacts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create contact |
| GET | `/` | List contacts |
| GET | `/:id` | Get contact |
| PUT | `/:id` | Update contact |
| DELETE | `/:id` | Delete contact |

### Notifications (`/api/notifications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/token` | Register device token |
| DELETE | `/token` | Remove device token |
| GET | `/status` | Get notification status |
| POST | `/test` | Send test notification |

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 requests / 15 min |
| Authentication | 5 requests / 15 min |
| AI Analysis | 20 requests / hour |
| Check-in Creation | 10 requests / hour |

## Mobile App Screens

| Screen | Tab | Description |
|--------|-----|-------------|
| Home | Home | Greeting, quick mood, suggested activity, weekly summary |
| CheckIn | Check-In | Structured check-in flow with AI analysis |
| Mood | My Journey | Mood trends, charts, check-in history |
| Mindfulness | Mindfulness | Activity library with breathing exercises |
| Progress | Progress | Today's goals, streaks, achievements, challenges |
| Profile | Profile | User settings, crisis resources access |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and not licensed for public use.
