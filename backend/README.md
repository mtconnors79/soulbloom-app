# MindWell Backend API

Node.js/Express REST API server for the MindWell mental health application.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Databases**:
  - PostgreSQL (Sequelize ORM) - Structured data
  - MongoDB (Mongoose ODM) - Flexible documents
- **Authentication**: Firebase Admin SDK + JWT
- **AI**: Anthropic Claude API for sentiment analysis
- **Push Notifications**: Firebase Cloud Messaging

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Set up Firebase service account
# Save as config/firebase-service-account.json

# Create PostgreSQL database
createdb mindwell_db

# Start server
npm start        # Production
npm run dev      # Development with nodemon
```

## Project Structure

```
backend/
├── config/
│   ├── firebase.js           # Firebase Admin SDK setup
│   ├── mongodb.js            # MongoDB connection
│   ├── sequelize.js          # Sequelize/PostgreSQL setup
│   └── firebase-service-account.json  # (gitignored)
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── checkinController.js  # Check-in CRUD + AI analysis
│   ├── moodController.js     # Mood entry management
│   └── ...
├── middleware/
│   ├── auth.js               # JWT/Firebase token verification
│   ├── rateLimiter.js        # Rate limiting rules
│   └── errorHandler.js       # Global error handling
├── models/
│   ├── index.js              # Model exports & associations
│   ├── User.js               # PostgreSQL - User accounts
│   ├── Profile.js            # PostgreSQL - User profiles
│   ├── MoodEntry.js          # PostgreSQL - Mood logs
│   ├── ActivityCompletion.js # PostgreSQL - Activity tracking
│   ├── UserAchievement.js    # PostgreSQL - Unlocked badges
│   ├── EmergencyContact.js   # PostgreSQL - Emergency contacts
│   ├── CheckinResponse.js    # MongoDB - Check-in documents
│   └── ActivityLog.js        # MongoDB - Activity logs
├── routes/
│   ├── auth.js               # /api/auth/*
│   ├── checkin.js            # /api/checkins/*
│   ├── mood.js               # /api/mood/*
│   ├── mindfulness.js        # /api/activities/mindfulness/*
│   ├── progress.js           # /api/progress/*
│   ├── resources.js          # /api/resources/*
│   ├── profile.js            # /api/profile/*
│   ├── emergencyContact.js   # /api/emergency-contacts/*
│   └── notification.js       # /api/notifications/*
├── services/
│   ├── sentimentService.js   # Claude AI integration
│   └── notificationService.js # FCM push notifications
├── index.js                  # Server entry point
└── package.json
```

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Register with email/password |
| POST | `/login` | No | Login, returns JWT |
| POST | `/register/firebase` | Firebase | Register with Firebase token |
| POST | `/login/firebase` | Firebase | Login with Firebase token |
| GET | `/me` | JWT | Get current user info |

### Check-ins (`/api/checkins`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | JWT | Create check-in (auto AI analysis if `auto_analyze: true`) |
| GET | `/` | JWT | List check-ins (`limit`, `offset`, `start_date`, `end_date`) |
| GET | `/stats` | JWT | Get check-in statistics |
| GET | `/:id` | JWT | Get single check-in |
| PUT | `/:id` | JWT | Update check-in |
| DELETE | `/:id` | JWT | Delete check-in |
| POST | `/analyze` | JWT | Analyze text without saving |
| POST | `/:id/analyze` | JWT | Re-analyze existing check-in |

**Create Check-in Request:**
```json
{
  "mood_rating": "good",
  "stress_level": 4,
  "selected_emotions": ["happy", "calm"],
  "check_in_text": "Had a productive day...",
  "auto_analyze": true
}
```

### Mood (`/api/mood`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | JWT | Create mood entry |
| GET | `/` | JWT | List entries (`limit`, `offset`, `start_date`, `end_date`) |
| GET | `/stats` | JWT | Statistics (`days` param for relative filtering) |
| GET | `/:id` | JWT | Get entry |
| PUT | `/:id` | JWT | Update entry |
| DELETE | `/:id` | JWT | Delete entry |

**Create Mood Entry Request:**
```json
{
  "sentiment_score": 0.5,
  "sentiment_label": "good",
  "check_in_date": "2025-12-18"
}
```

### Mindfulness (`/api/activities/mindfulness`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | JWT | List all activities grouped by category |
| GET | `/:activityId` | JWT | Get activity details |
| POST | `/:activityId/complete` | JWT | Mark activity complete |
| GET | `/stats/user` | JWT | User's completion stats (total, streak, weekly) |
| GET | `/suggested/activity` | JWT | Get suggested activity (`mood` param) |

**Categories:**
- `breathing` - Box Breathing, 4-7-8, Deep Belly
- `grounding` - 5-4-3-2-1 Senses, Body Scan
- `quick_resets` - 1-Minute Calm, Tension Release
- `guided_meditations` - UCLA Mindful links
- `sleep` - Sleep Breathing, Sleep Body Scan

### Progress (`/api/progress`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/today` | JWT | Today's goal completion |
| GET | `/streaks` | JWT | Current streak counts |
| GET | `/achievements` | JWT | All badges with unlock status |
| POST | `/achievements/check` | JWT | Evaluate and unlock earned badges |
| GET | `/challenges` | JWT | Weekly challenges with progress |

**Badges:**
- `first_checkin` - First Steps (complete first check-in)
- `week_one` - Week One (use app 7 days)
- `streak_7` - Week Warrior (7-day streak)
- `streak_30` - Monthly Master (30-day streak)
- `mindful_5` - Mindful Beginner (5 activities)
- `mindful_30` - Zen Master (30 activities)
- `breather_10` - Deep Breather (10 breathing exercises)
- `moods_20` - Mood Tracker (20 mood entries)
- `words_500` - Journaler (500+ words in notes)

### Resources (`/api/resources`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/crisis` | JWT | Crisis support resources list |

### Profile (`/api/profile`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | JWT | Get profile with emergency contacts |
| PUT | `/` | JWT | Update name, age |
| PUT | `/preferences` | JWT | Update preferences JSON |
| DELETE | `/preferences/:key` | JWT | Delete preference key |

### Emergency Contacts (`/api/emergency-contacts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | JWT | Create contact |
| GET | `/` | JWT | List all contacts |
| GET | `/:id` | JWT | Get contact |
| PUT | `/:id` | JWT | Update contact |
| DELETE | `/:id` | JWT | Delete contact |

### Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/token` | JWT | Register FCM device token |
| DELETE | `/token` | JWT | Remove device token |
| GET | `/status` | JWT | Check notification status |
| POST | `/test` | JWT | Send test notification |
| POST | `/reminder` | JWT | Send check-in reminder |

## Authentication

The API supports two authentication methods:

### 1. JWT Token (email/password users)
```bash
curl -H "Authorization: Bearer <jwt_token>" ...
```

### 2. Firebase ID Token (Google Sign-In users)
```bash
curl -H "Authorization: Bearer <firebase_id_token>" ...
```

The middleware automatically detects token type and validates accordingly.

## Rate Limits

| Category | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| AI Analysis | 20 requests | 1 hour |
| Check-in Creation | 10 requests | 1 hour |
| Bulk Operations | 5 requests | 1 hour |

## Database Schema

### PostgreSQL Tables

**users**
- `id`, `email`, `password_hash`, `created_at`

**profiles**
- `id`, `user_id`, `name`, `age`, `preferences` (JSON)

**mood_entries**
- `id`, `user_id`, `sentiment_score`, `sentiment_label`, `check_in_date`, `created_at`

**activity_completions**
- `id`, `user_id`, `activity_id`, `completed_at`

**user_achievements**
- `id`, `user_id`, `badge_id`, `unlocked_at`

**emergency_contacts**
- `id`, `user_id`, `name`, `phone`, `relationship`

### MongoDB Collections

**checkinresponses**
- `firebase_uid`, `mood_rating`, `stress_level`, `selected_emotions`, `check_in_text`, `ai_analysis`, `created_at`

**activitylogs**
- `firebase_uid`, `activity_type`, `duration_minutes`, `notes`, `created_at`

## Environment Variables

See `.env.example` for all required variables.

## Health Check

```bash
curl http://localhost:3000/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-18T00:00:00.000Z",
  "services": {
    "postgres": "connected",
    "mongodb": "connected",
    "firebase": "initialized"
  }
}
```
