# SoulBloom Backend

Node.js Express API server for SoulBloom mental health app.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Databases**: PostgreSQL (Sequelize) + MongoDB (Mongoose)
- **Auth**: Firebase Admin SDK + JWT
- **AI**: Anthropic Claude API
- **Push**: Firebase Cloud Messaging

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run migrations
npm run db:migrate

# Create MongoDB indexes
npm run db:indexes

# Start development server
npm run dev
```

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=soulbloom_db
DB_USER=your_user
DB_PASSWORD=your_password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/soulbloom_mongo

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Claude API
ANTHROPIC_API_KEY=your-api-key

# JWT
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d

# Email (for Care Circle invites)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Project Structure

```
backend/
├── config/
│   ├── firebase.js           # Firebase Auth SDK
│   ├── firebase-admin.js     # Firebase Admin (FCM)
│   ├── mongodb.js            # MongoDB connection
│   ├── sequelize.js          # PostgreSQL/Sequelize
│   └── firebase-service-account.json
├── controllers/
│   ├── authController.js
│   ├── checkinController.js
│   ├── moodController.js
│   ├── goalsController.js
│   ├── careCircleController.js
│   ├── careCircleDataController.js
│   └── notificationController.js
├── middleware/
│   ├── auth.js               # JWT/Firebase verification
│   ├── rateLimiter.js        # Rate limiting
│   ├── cacheHeaders.js       # Response caching
│   └── errorHandler.js
├── models/
│   ├── User.js               # PostgreSQL
│   ├── Profile.js            # PostgreSQL
│   ├── MoodEntry.js          # PostgreSQL
│   ├── UserGoal.js           # PostgreSQL
│   ├── CareCircleConnection.js
│   ├── CheckinResponse.js    # MongoDB
│   └── ActivityLog.js        # MongoDB
├── routes/
│   ├── auth.js
│   ├── checkin.js
│   ├── mood.js
│   ├── goals.js
│   ├── careCircle.js
│   ├── notification.js
│   └── ...
├── services/
│   ├── sentimentService.js   # Claude AI analysis
│   ├── pushNotificationService.js
│   ├── patternDetectionService.js
│   ├── emailService.js
│   └── goalProgressService.js
├── jobs/
│   ├── patternCheckJob.js    # Cron: pattern detection
│   ├── goalCronJobs.js       # Cron: goal reminders
│   └── goalHistoryCleanup.js
├── data/
│   ├── topicResources.js     # Crisis topic patterns
│   └── goalTemplates.js      # Goal presets
└── index.js
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| POST | /api/auth/register/firebase | Register with Firebase |
| POST | /api/auth/login/firebase | Login with Firebase |
| GET | /api/auth/me | Get current user |

### Check-ins
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/checkins | Get user's check-ins |
| POST | /api/checkins | Create check-in |
| GET | /api/checkins/stats | Get statistics |
| GET | /api/checkins/daily | Get daily details |
| GET | /api/checkins/:id | Get single check-in |

### Mood
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/mood | Get mood entries |
| POST | /api/mood | Log mood |
| GET | /api/mood/stats | Get statistics |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/goals | Get active goals |
| POST | /api/goals | Create goal |
| GET | /api/goals/templates | Get goal templates |
| GET | /api/goals/summary | Get goal statistics |
| PUT | /api/goals/:id | Update goal |
| DELETE | /api/goals/:id | Delete goal |
| POST | /api/goals/:id/complete | Mark complete |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/progress/today | Today's progress |
| GET | /api/progress/streaks | Streak data |
| GET | /api/progress/achievements | Badges |
| GET | /api/progress/challenges | Weekly challenges |

### Care Circle
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/care-circle/connections | Get connections |
| POST | /api/care-circle/invite | Send invite |
| POST | /api/care-circle/accept/:token | Accept invite |
| DELETE | /api/care-circle/:id | Remove connection |
| GET | /api/care-circle/data/:userId/summary | Get shared data |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/notifications/register-device | Register FCM token |
| POST | /api/notifications/unregister-device | Unregister token |
| GET | /api/notifications/preferences | Get preferences |
| PUT | /api/notifications/preferences | Update preferences |
| GET | /api/notifications/history | Get history |

## Scripts

```bash
npm run dev          # Start with nodemon
npm run start        # Start production
npm run test         # Run tests
npm run db:migrate   # Run Sequelize migrations
npm run db:indexes   # Create MongoDB indexes
```

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| General | 100 req/15 min |
| Auth | 5 req/15 min |
| AI/Analysis | 20 req/hour |
| Check-in | 10 req/hour |

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Pattern Detection | 10:00 AM | Check negative mood patterns |
| Streak Risk | 7:00 PM | Warn about at-risk streaks |
| Re-engagement | 11:00 AM | Nudge inactive users |
| Expiring Goals | 8:00 AM | Goal deadline reminders |
| History Cleanup | 3:00 AM | Clean old goal history |

## Health Check

```bash
curl http://localhost:3000/health
```

Returns:
```json
{
  "status": "healthy",
  "services": {
    "postgres": "connected",
    "mongodb": "connected",
    "firebase": "initialized"
  }
}
```
