# MindWell App

A mental health and wellness tracking application with a Node.js/Express backend.

## Features

- User authentication (JWT + Firebase)
- Mood tracking and analytics
- Daily check-ins with AI-powered sentiment analysis
- Activity logging (meditation, exercise, journaling, etc.)
- Emergency contacts management
- Push notifications via Firebase Cloud Messaging
- Profile and preferences management

## Tech Stack

- **Backend:** Node.js, Express.js
- **Databases:** PostgreSQL (Sequelize ORM), MongoDB (Mongoose ODM)
- **Authentication:** JWT, Firebase Admin SDK
- **AI:** Anthropic Claude API for sentiment analysis
- **Push Notifications:** Firebase Cloud Messaging

## Prerequisites

- Node.js v18+
- PostgreSQL
- MongoDB
- Firebase project with service account
- Anthropic API key (for sentiment analysis)

## Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:mtconnors79/mindwell-app.git
   cd mindwell-app/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the `backend` directory:
   ```env
   PORT=3000
   NODE_ENV=development

   # PostgreSQL Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=mindwell_db
   DB_USER=your_username
   DB_PASSWORD=your_password

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/mindwell_mongo

   # Firebase Configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Anthropic API Configuration
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Firebase Cloud Messaging
   FCM_ENABLED=true

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRES_IN=7d
   ```

4. **Set up Firebase Service Account**

   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the file as `backend/config/firebase-service-account.json`

5. **Set up PostgreSQL database**
   ```bash
   createdb mindwell_db
   ```

   The tables will be created automatically by Sequelize on first run.

6. **Start MongoDB**
   ```bash
   brew services start mongodb-community
   # or
   mongod
   ```

## Running the Server

**Development:**
```bash
npm start
```

The server will start on `http://localhost:3000`

**Verify it's running:**
```bash
curl http://localhost:3000/health
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/register/firebase` | Register with Firebase |
| POST | `/api/auth/login/firebase` | Login with Firebase |
| GET | `/api/auth/me` | Get current user |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update profile |
| PUT | `/api/profile/preferences` | Update preferences |
| DELETE | `/api/profile/preferences/:key` | Delete preference |

### Mood Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mood` | Create mood entry |
| GET | `/api/mood` | List mood entries |
| GET | `/api/mood/stats` | Get mood statistics |
| GET | `/api/mood/:id` | Get mood entry |
| PUT | `/api/mood/:id` | Update mood entry |
| DELETE | `/api/mood/:id` | Delete mood entry |

### Check-ins
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/checkins` | Create check-in |
| GET | `/api/checkins` | List check-ins |
| GET | `/api/checkins/stats` | Get check-in statistics |
| GET | `/api/checkins/:id` | Get check-in |
| PUT | `/api/checkins/:id` | Update check-in |
| DELETE | `/api/checkins/:id` | Delete check-in |
| POST | `/api/checkins/analyze` | Analyze text (AI) |
| POST | `/api/checkins/:id/analyze` | Analyze check-in (AI) |

### Activities
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/activities` | Log activity |
| GET | `/api/activities` | List activities |
| GET | `/api/activities/:id` | Get activity |
| PUT | `/api/activities/:id` | Update activity |
| DELETE | `/api/activities/:id` | Delete activity |

### Emergency Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emergency-contacts` | Create contact |
| GET | `/api/emergency-contacts` | List contacts |
| GET | `/api/emergency-contacts/:id` | Get contact |
| PUT | `/api/emergency-contacts/:id` | Update contact |
| DELETE | `/api/emergency-contacts/:id` | Delete contact |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/token` | Register device token |
| DELETE | `/api/notifications/token` | Remove device token |
| GET | `/api/notifications/status` | Get notification status |
| POST | `/api/notifications/test` | Send test notification |
| POST | `/api/notifications/reminder` | Send check-in reminder |

## Authentication

All endpoints except `/api/auth/register` and `/api/auth/login` require authentication.

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Example Usage

**Register a new user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Create a check-in:**
```bash
curl -X POST http://localhost:3000/api/checkins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"check_in_text":"Feeling good today!"}'
```

**Analyze text with AI:**
```bash
curl -X POST http://localhost:3000/api/checkins/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text":"I am feeling happy and grateful today."}'
```

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 requests / 15 min |
| Authentication | 5 requests / 15 min |
| AI Analysis | 20 requests / hour |
| Check-in Creation | 10 requests / hour |
| Bulk Operations | 5 requests / hour |

## Project Structure

```
backend/
├── config/
│   ├── firebase.js          # Firebase Admin SDK setup
│   ├── mongodb.js           # MongoDB connection
│   ├── postgres.js          # PostgreSQL connection
│   └── sequelize.js         # Sequelize ORM setup
├── controllers/
│   ├── authController.js
│   ├── profileController.js
│   ├── moodController.js
│   ├── checkinController.js
│   ├── activityController.js
│   ├── emergencyContactController.js
│   └── notificationController.js
├── middleware/
│   ├── auth.js              # JWT/Firebase authentication
│   ├── validate.js          # Input validation
│   ├── rateLimiter.js       # Rate limiting
│   └── errorHandler.js      # Global error handling
├── models/
│   ├── User.js              # PostgreSQL
│   ├── Profile.js           # PostgreSQL
│   ├── MoodEntry.js         # PostgreSQL
│   ├── EmergencyContact.js  # PostgreSQL
│   ├── CheckinResponse.js   # MongoDB
│   └── ActivityLog.js       # MongoDB
├── routes/
│   ├── auth.js
│   ├── profile.js
│   ├── mood.js
│   ├── checkin.js
│   ├── activity.js
│   ├── emergencyContact.js
│   └── notification.js
├── services/
│   ├── sentimentService.js  # Claude AI integration
│   └── notificationService.js # FCM push notifications
├── index.js                 # App entry point
└── package.json
```

## License

MIT
