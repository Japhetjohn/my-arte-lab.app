# MyArteLab

A modern web application connecting creators with clients across Africa.

## 🎨 Features

- **Modern UI/UX** - Beautiful, responsive design with smooth animations
- **Modular Architecture** - Clean ES6 modules for better maintainability
- **Creator Profiles** - Showcase portfolios, services, and reviews
- **Booking System** - Multi-step booking flow with escrow protection
- **Wallet Management** - Track earnings, transactions, and withdrawals
- **User Settings** - Profile editing, notifications, security settings

## 🚀 Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom design system with CSS variables
- **JavaScript (ES6)** - Modular architecture
- **No frameworks** - Pure vanilla JavaScript

## 📁 Project Structure

```
myartelab/
├── index.html
├── styles.css
├── logo.PNG
├── .gitignore
│
└── js/
    ├── app.js              # Main entry point
    ├── state.js            # State management
    ├── config.js           # Configuration & mock data
    ├── navigation.js       # Routing system
    ├── auth.js             # Authentication
    ├── utils.js            # Utility functions
    │
    ├── pages/              # Page modules
    │   ├── home.js
    │   ├── discover.js
    │   ├── bookings.js
    │   ├── wallet.js
    │   ├── profile.js
    │   └── settings.js
    │
    └── components/         # Reusable components
        ├── creators.js
        └── modals.js
```

## 🎨 Design System

### Colors
- Primary: `#9747FF`
- Secondary: `#6B46FF`
- Success: `#10B981`
- Error: `#EF4444`

### Typography
- Font: Calibri with system fallback
- Responsive sizing with CSS variables

## 🚀 Getting Started

1. Clone the repository
```bash
git clone https://github.com/Japhetjohn/my-arte-lab.app.git
cd my-arte-lab.app
```

2. Open `index.html` in your browser
```bash
# Or use a local server
python -m http.server 8000
# Then visit http://localhost:8000
```

## 📱 Pages

- **Home** - Hero section, featured creators, categories
- **Discover** - Search and browse creators
- **Bookings** - Manage active and past bookings
- **Wallet** - View balance, transactions, withdraw funds
- **Profile** - View creator profiles
- **Settings** - Edit profile, manage notifications, security

## 🔐 Authentication

- Sign up / Sign in flows
- Google OAuth integration (UI ready)
- User session management
- Profile dropdown menu

## 💰 Wallet Features

- View available balance
- Track total earnings
- Monitor pending payments
- Transaction history
- Withdrawal management

## 🎯 Future Enhancements

- [ ] Backend API integration
- [ ] Real payment processing
- [ ] File upload functionality
- [ ] Real-time messaging
- [ ] Push notifications
- [ ] Analytics dashboard

## 📄 License

This project is for portfolio demonstration purposes.

## 👨‍💻 Author

Built with ❤️ for creators and clients across Africa

---

**Note:** This is currently a frontend prototype with mock data. Backend integration coming soon.
