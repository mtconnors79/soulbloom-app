# SoulBloom

**"Grow gently, live fully."**

A comprehensive AI-driven mental health application supporting users through daily check-ins, mood tracking, mindfulness activities, and crisis detection.

## Features

### Core Wellness
- **Daily Check-ins** - Mood, emotions, stress level, and journaling
- **Quick Mood Logging** - Fast emoji-based mood tracking
- **Mood Trends** - Visualize patterns with charts (summary + detailed views)
- **Mood Variability** - Min/max range bands, variance flags for conditions like bipolar
- **AI Analysis** - Sentiment analysis and risk detection via Claude API

### Crisis Support
- **Crisis Detection** - Keyword and AI-based risk level assessment
- **Crisis Resources** - 988, Crisis Text Line, 911 with tiered display
- **Emergency Contacts** - SMS alerts when calling 911
- **Contextual Resources** - Topic-based prompts (domestic violence, substance use, etc.)

### Mindfulness
- **Breathing Exercises** - Box breathing, 4-7-8, and more with animated timers
- **Activity Library** - Grounding exercises, guided meditation links
- **Post Check-in Suggestions** - Activity recommendations based on mood

### Goals & Progress
- **Automatic Daily Goals** - Check-in, mindfulness, mood logging
- **User-Defined Goals** - Custom goals with templates
- **Streaks** - Track consecutive days of activity
- **Achievements/Badges** - Unlock milestones (11 badges)

### Care Circle
- **Trusted Person Sharing** - Invite family/friends to view your data
- **Web Portal** - Trusted persons access via browser
- **Tiered Access** - Full data or data without journal text
- **Audit Logging** - Track who accessed what

### Notifications
- **Local Reminders** - Scheduled check-in and mindfulness reminders
- **Push Notifications (FCM)** - Pattern intervention, streak reminders, goal alerts
- **Quiet Hours** - Configurable do-not-disturb times
- **Smart Limits** - Daily notification caps

## Tech Stack

| Component | Technology |
|-----------|------------|
| Mobile App | React Native 0.76+ (iOS + Android) |
| Web Portal | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Databases | PostgreSQL + MongoDB |
| Auth | Firebase Authentication |
| AI | Claude API (Anthropic) |
| Push | Firebase Cloud Messaging |
| Notifications | @notifee/react-native |

## Project Structure

```
soulbloom-app/
├── mobile/          # React Native app (iOS + Android)
├── backend/         # Node.js Express API server
├── web-portal/      # React web app for Care Circle
└── README.md        # This file
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- Firebase project configured

### Installation

```bash
# Clone repository
git clone https://github.com/mtconnors79/soulbloom-app.git
cd soulbloom-app

# Backend setup
cd backend
cp .env.example .env  # Configure environment variables
npm install
npm run db:migrate
npm run db:indexes
npm run dev

# Mobile setup (new terminal)
cd mobile
cp .env.example .env  # Configure environment variables
npm install
cd ios && pod install && cd ..
npx react-native run-ios  # or run-android

# Web portal setup (new terminal)
cd web-portal
cp .env.example .env  # Configure environment variables
npm install
npm run dev
```

## API Endpoints Overview

### Core APIs
| API | Endpoints | Description |
|-----|-----------|-------------|
| `/api/auth` | register, login, me | Authentication |
| `/api/checkins` | CRUD + analyze | Daily check-ins with AI |
| `/api/mood` | CRUD + stats | Mood entries |
| `/api/activities/mindfulness` | list, complete, stats | Mindfulness activities |
| `/api/progress` | today, streaks, achievements, challenges | Progress tracking |
| `/api/goals` | CRUD + templates | User-defined goals |

### Support APIs
| API | Endpoints | Description |
|-----|-----------|-------------|
| `/api/resources` | crisis | Crisis support resources |
| `/api/emergency-contacts` | CRUD + confirm | Emergency contacts with consent |
| `/api/care-circle` | connections, invite, accept, data | Care Circle sharing |
| `/api/notifications` | register, preferences, history | Push notifications |

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| General | 100 req/15 min |
| Auth | 5 req/15 min |
| AI/Analysis | 20 req/hour |
| Check-in | 10 req/hour |

## Documentation

- [Mobile App](./mobile/README.md)
- [Backend API](./backend/README.md)
- [Web Portal](./web-portal/README.md)

## Services

| Service | Default Port |
|---------|--------------|
| Backend API | 3000 |
| Metro Bundler | 8081 |
| Web Portal | 5173 |
| PostgreSQL | 5432 |
| MongoDB | 27017 |

## License

Private - All rights reserved
