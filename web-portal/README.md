# SoulBloom Web Portal

React web application for Care Circle trusted persons to view shared patient data.

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Features

- **Login/Register** - Firebase authentication
- **Dashboard** - View patients sharing with you
- **Patient View** - Mood trends, check-ins, statistics
- **Export** - PDF reports
- **Print** - Printable reports
- **Accept Invites** - Public invite acceptance page

## Tech Stack

- React 18
- Vite (build tool)
- Tailwind CSS v4
- React Router
- Recharts (charts)
- @react-pdf/renderer (PDF export)
- Firebase Auth

## Project Structure

```
src/
├── components/
│   ├── Layout.js           # Responsive sidebar layout
│   ├── LazyImage.js        # Lazy loading images
│   ├── ExportReport.js     # PDF generation
│   └── PrintableReport.js  # Browser print view
├── context/
│   └── AuthContext.js      # Firebase auth state
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx       # Patient list
│   ├── PatientView.jsx     # Patient data display
│   └── AcceptInvite.jsx    # Public invite page
├── services/
│   └── api.js              # Backend API client
└── App.jsx                 # Router setup
```

## Pages

| Page | Path | Auth | Description |
|------|------|------|-------------|
| Login | /login | No | Firebase email/password login |
| Register | /register | No | Create new account |
| Dashboard | / | Yes | List connected patients |
| Patient View | /patient/:id | Yes | View shared data |
| Accept Invite | /accept/:token | No | Accept Care Circle invite |

## API Integration

The portal connects to the SoulBloom backend for:
- Care Circle connection management
- Shared patient data (mood, check-ins, trends)
- PDF export data generation

## Performance

- Code-split routes (React.lazy)
- Lazy loading images
- PDF renderer loaded on-demand
- Initial bundle: ~440KB (gzipped: ~135KB)

## Scripts

```bash
npm run dev      # Start dev server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Styling

Uses Tailwind CSS v4 with SoulBloom color palette:
- Primary: #355F5B (teal)
- Accent colors for mood indicators
- Responsive design for mobile/desktop
