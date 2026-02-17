# MyArteLab Frontend

Modern frontend for MyArteLab - Built for African Creators. Trusted by Global Clients.

## 📁 Structure

```
frontend/
├── index.html              # Main entry point
├── styles.css              # Global styles
├── assets/
│   └── images/            # Images and logos
├── css/                   # Additional CSS modules
├── js/
│   ├── app.js             # Main application logic
│   ├── auth.js            # Authentication logic
│   ├── config.js          # Configuration
│   ├── navigation.js      # Navigation handling
│   ├── state.js           # State management
│   ├── utils.js           # Utility functions
│   ├── components/        # Reusable components
│   │   ├── creators.js
│   │   └── modals.js
│   └── pages/             # Page-specific logic
│       ├── home.js
│       ├── bookings.js
│       ├── wallet.js
│       ├── profile.js
│       └── settings.js
```

## 🚀 Getting Started

### Development Server

The frontend is a single-page application (SPA) that runs on port 8000:

```bash
# From the root directory
npm run dev:frontend
```

### Backend Integration

The frontend communicates with the backend API at `http://localhost:5000/api`

Make sure the backend server is running before starting the frontend.

## 🔐 Environment Configuration

The frontend connects to:
- Backend API: `http://localhost:5000/api` (development)
- HostFi Payment Processor: Integrated via backend

## 📧 Email Verification

Users receive email verification links after registration. The verification flow:
1. User registers → Receives verification email
2. Clicks verification link → Redirected to `/verify-email?token=...`
3. Token is verified → User account is activated

## 🎨 Features

- User authentication (register, login, logout)
- Creator discovery and filtering
- Booking management
- Wallet integration with HostFi for fiat onramp/offramp
- Profile management
- Settings and preferences

## 🛠️ Tech Stack

- Vanilla JavaScript (ES6+)
- CSS3 with modern features
- Single Page Application architecture
- REST API integration
