# SoulBloom App

Mental wellness React Native mobile app with Node.js backend and web portal.

## Project Structure

```
soulbloom-app/
├── backend/          # Node.js Express API server
│   ├── controllers/  # Route handlers
│   ├── middleware/   # Auth, validation
│   ├── models/       # Sequelize (PostgreSQL) + Mongoose (MongoDB)
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic (email, sentiment, etc.)
│   └── config/       # Database, Firebase config
├── mobile/           # React Native app
│   ├── src/
│   │   ├── screens/  # App screens (auth, main)
│   │   ├── services/ # API clients
│   │   ├── navigation/
│   │   ├── components/
│   │   └── theme/    # Colors, styles
│   ├── ios/          # iOS native code
│   └── android/      # Android native code
└── web-portal/       # Vite React web app (Care Circle)
    └── src/
        ├── pages/    # Login, Dashboard, PatientView
        ├── components/
        ├── services/ # API, Firebase
        └── context/  # Auth state
```

## Tech Stack

- **Mobile:** React Native 0.83, Firebase Auth, AsyncStorage
- **Backend:** Node.js, Express, Sequelize (PostgreSQL), Mongoose (MongoDB)
- **Web Portal:** Vite, React, Tailwind CSS v4, Firebase Auth
- **Auth:** Firebase Authentication + JWT
- **Databases:** PostgreSQL (users, profiles, connections), MongoDB (check-ins)

## Key Features

- Daily mood check-ins with AI sentiment analysis
- Crisis detection with tiered response (critical/high/moderate/low)
- Care Circle - trusted person data sharing
- Mindfulness exercises (breathing, grounding)
- Progress tracking and achievements
- Emergency contacts with SMS confirmation

## Development Commands

```bash
# Backend
cd backend && node index.js

# Mobile
cd mobile && npx react-native start --reset-cache
npx react-native run-ios --simulator="iPhone 16 Pro"

# Web Portal
cd web-portal && npm run dev

# Testing
npm test
npm run test:watch
```

## Environment Variables

Backend requires `.env` with:
- DATABASE_URL, MONGODB_URI
- JWT_SECRET
- Firebase config (FIREBASE_PROJECT_ID, etc.)
- SMTP config (optional, uses Ethereal for dev)

## Color Theme

Primary: #355F5B (teal)
Background: #F7F5F2
Surface: #EFEAF6

## Allowed Tools

The following commands can run without user approval:

```
# npm/node commands
Bash(npm:*)
Bash(npx:*)
Bash(node:*)

# Git commands
Bash(git:*)

# File operations within project
Bash(ls:*)
Bash(cat:*)
Bash(echo:*)
Bash(mkdir:*)
Bash(rm:*)

# Localhost curl only
Bash(curl http://localhost:*)
Bash(curl -s http://localhost:*)
Bash(curl -X * http://localhost:*)

# Jest test execution
Bash(jest:*)
Bash(npm test:*)
Bash(npm run test:*)

# React Native
Bash(npx react-native:*)
Bash(xcrun simctl:*)
Bash(pod install:*)

# Database (local dev)
Bash(psql:*)

# Process management
Bash(lsof:*)
Bash(kill:*)
Bash(pkill:*)
```
