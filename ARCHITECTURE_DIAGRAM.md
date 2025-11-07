# MyArteLab Architecture Diagrams

## Application Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     index.html (SPA Shell)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Top NavBar   │  │ Main Content │  │ Bottom NavBar        │  │
│  │ - Logo       │  │ (Dynamic)    │  │ (Mobile)             │  │
│  │ - Search     │  │              │  │ 5 main pages         │  │
│  │ - Notif      │  │ <render>     │  │                      │  │
│  │ - User Menu  │  │ </render>    │  │ Home/Discover/etc   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │     app.js          │
                    │ Initialization      │
                    │ Event Listeners     │
                    │ Global Functions    │
                    └─────────────────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
   ┌─────────┐          ┌──────────┐          ┌──────────┐
   │ auth.js │          │state.js  │          │config.js │
   │         │          │          │          │          │
   │ Sign In │          │appState  │          │ Mock     │
   │ Sign Up │          │ Users    │          │ Creators │
   │ Logout  │          │ Bookings │          │ Bookings │
   │ User    │          │ Wallet   │          │ Wallet   │
   │ Menu    │          │ Creators │          │          │
   └─────────┘          └──────────┘          └──────────┘
        ↓                     ↓
   ┌──────────────────────────────────────┐
   │      navigation.js & utils.js        │
   │                                      │
   │ Route to Pages / Utility Functions   │
   └──────────────────────────────────────┘
        ↓
   ┌────────────────────────────────────────────────────────┐
   │          6 Pages (Render to #mainContent)              │
   ├────────────────────────────────────────────────────────┤
   │ home.js     → Hero + Stats + Featured + Categories     │
   │ discover.js → Search + Filters + Creator Grid          │
   │ profile.js  → User's Creator Profile                   │
   │ settings.js → Profile Editor + Account Settings        │
   │ bookings.js → Active & Completed Bookings              │
   │ wallet.js   → Balance + Transactions + Modals           │
   └────────────────────────────────────────────────────────┘
        ↓
   ┌────────────────────────────────────────────────────────┐
   │     Components (Reusable UI Building Blocks)           │
   ├────────────────────────────────────────────────────────┤
   │ creators.js → Creator Cards, Profiles, Categories      │
   │ modals.js   → 15 Modal Dialogs                         │
   │              Booking, Auth, Settings, Wallet, etc      │
   └────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌──────────────────────────────┐
│    Global appState Object    │
├──────────────────────────────┤
│ currentPage                  │  ← Current page being displayed
│ navigationHistory []         │  ← For back button
│ user {                       │
│   name, email, type          │
│   avatar, cover, bio         │
│   location, phone            │
│ }                            │
│ creators []                  │  ← All creators in marketplace
│ bookings []                  │  ← User's bookings
│ wallet {                     │
│   balance, pending           │
│   transactions []            │
│ }                            │
└──────────────────────────────┘
      ↑          ↑          ↑
      │          │          │
   Read in    Update by    Read by
   Pages      Components   Modals
```

## Page Navigation Flow

```
                        app.js (init)
                            ↓
                    navigateToPage()
                            ↓
        ┌───────────────────┼───────────────────┐
        │ Update NavBar     │ Render Page       │ Update Back Button
        │ (Active Item)     │ (Switch)          │                   
        │                   │                   │                   
        ↓                   ↓                   ↓                   
        ·                 home() ────────→ renderHomePage()
        ·                 discover() ─────→ renderDiscoverPage()
        ·                 profile() ──────→ renderProfilePage()
        ·                 settings() ─────→ renderSettingsPage()
        ·                 bookings() ─────→ renderBookingsPage()
        ·                 wallet() ───────→ renderWalletPage()
        ·
        └──────────────────────→ scrollToTop() + smoothFade
```

## Authentication Flow

```
User Not Signed In
        ↓
  [Sign In Button]
        ↓
showAuthModal('signin')
        ↓
┌─────────────────────────────────┐
│      Modal Appears              │
│  ┌─────────────────────────┐    │
│  │ Email: _________        │    │
│  │ Pass:  _________        │    │
│  │ [Sign In] [Google OAuth]│    │
│  │ Don't have account? →   │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
        ↓
   User Submits
        ↓
handleAuth(event, 'signin')
        ↓
setUser({hardcoded mock user})
        ↓
appState.user = {name, email, avatar, ...}
        ↓
updateUserMenu()
        ↓
┌──────────────────────────┐
│ Navbar Changes to:       │
│ ┌────────────────────┐   │
│ │ [Avatar] Name ▼    │   │
│ │ ├─ My profile      │   │
│ │ ├─ Wallet          │   │
│ │ ├─ My bookings     │   │
│ │ ├─────────────     │   │
│ │ └─ Logout          │   │
│ └────────────────────┘   │
└──────────────────────────┘
        ↓
Profile/Wallet/Bookings
Pages Now Accessible
```

## Creator Card to Profile Flow

```
renderHomePage()
        ↓
renderCreatorCards(creators)
        ↓
┌─────────────────────┐
│   Creator Card      │
│ ┌────────────────┐  │
│ │ [Avatar]       │  │
│ │ Name ✓ Verified│  │
│ │ Role, Location │  │
│ │ Rating (4.9)   │  │
│ │ [View] [Book]  │  │
│ └────────────────┘  │
└─────────────────────┘
        ↓
User Clicks [View Profile]
        ↓
renderCreatorProfile(creator)
        ↓
┌──────────────────────────────┐
│   Creator Full Profile       │
│ ┌──────────────────────────┐ │
│ │ [Cover Image]            │ │
│ │ [Avatar] Name ✓          │ │
│ │ Role, Location, Rating   │ │
│ │ [Book] [Message] [Save]  │ │
│ │                          │ │
│ │ About: Bio & Stats       │ │
│ │ Services:                │ │
│ │  - Wedding Photo ($250)  │ │
│ │  - Portrait ($80)        │ │
│ │ Portfolio:               │ │
│ │ [Img1] [Img2] [Img3]...  │ │
│ │ Reviews:                 │ │
│ │ ★★★★★ 127 reviews       │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## Booking Flow

```
User Views Creator
        ↓
[Book Now] Button
        ↓
(Logged in?) 
    ↙ No         ↓ Yes
showAuthModal  showBookingModal()
    ↓           ↓
[Sign In]   ┌───────────────────┐
    ↓       │ Booking Modal     │
    │       │ ┌───────────────┐ │
    └──────→│ Step 1: Details │ │
        │   │ Date: ______    │ │
        │   │ Time: ______    │ │
        │   │ Brief: ______   │ │
        │   │ Files: ______   │ │
        │   │ [Cancel][Next]  │ │
        │   └───────────────┘ │
        │   ... (Step 2 & 3)  │
        │   Final: [Submit]   │
        └───────────────────┘
                ↓
        handleBookingSubmit()
                ↓
        appState.bookings
        .push(new booking)
                ↓
        showToast('Success!')
                ↓
        navigateToPage('bookings')
```

## Data Model Relationships

```
┌─────────────────────────────────────────────────────────┐
│                    Creator Object                       │
├─────────────────────────────────────────────────────────┤
│ id, name, role, location, rating, reviewCount          │
│ price, verified, avatar, cover, bio                    │
│ responseTime, completedJobs                            │
│                                                         │
│ portfolio: [                                            │
│   imageUrl1, imageUrl2, ...                            │
│ ]                                                       │
│                                                         │
│ services: [                                             │
│   {title, price, duration, deliverables[]},            │
│   ...                                                  │
│ ]                                                       │
└─────────────────────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────┐
│                    Booking Object                       │
├─────────────────────────────────────────────────────────┤
│ id, creatorName, creatorAvatar, service                │
│ status (pending|in_progress|completed)                 │
│ date, amount, clientName                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    User Object                          │
├─────────────────────────────────────────────────────────┤
│ name, email, type (client|creator)                      │
│ avatar, cover, bio, location, phone                     │
└─────────────────────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────┐
│                    Wallet Object                        │
├─────────────────────────────────────────────────────────┤
│ balance, pending, totalEarnings, withdrawn              │
│                                                         │
│ transactions: [                                         │
│   {id, title, description, date, amount,               │
│    type (credit|debit), status (completed|pending)},   │
│   ...                                                  │
│ ]                                                       │
└─────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
index.html (Root)
├── <nav id="topNav">
│   ├── Logo (clickable → home)
│   ├── Search Button (overlay)
│   ├── Notifications Button
│   └── User Menu Container
│       └── User Avatar Button
│           └── Dropdown Menu
│
├── <main id="mainContent">
│   └── Dynamically Rendered Page
│       ├── Page Header
│       ├── Page Content
│       │   ├── Cards
│       │   ├── Forms
│       │   ├── Lists
│       │   └── Sections
│       └── Call-to-Action Buttons
│           └── showModal() → triggers
│
├── <nav id="bottomNav"> (Mobile)
│   ├── Home Button
│   ├── Discover Button
│   ├── Bookings Button
│   ├── Wallet Button
│   └── Profile Button
│
├── <div id="modalsContainer">
│   └── Currently Active Modal
│       ├── Auth Modal
│       ├── Booking Modal
│       ├── Profile Update Modal
│       ├── Wallet Modals
│       └── etc...
│
└── <div id="searchOverlay">
    └── Global Search Interface
```

## File Dependencies Graph

```
index.html
    ↓
app.js ──────────────────────────────────┐
    ├──→ auth.js ─────────────┐          │
    ├──→ state.js ────────────┤─→ config.js
    ├──→ navigation.js ───────┤
    ├──→ utils.js ────────────┤
    │                         │
    ├──→ pages/home.js ───┐   │
    ├──→ pages/discover.js┤   ↓
    ├──→ pages/profile.js ├──→ components/creators.js
    ├──→ pages/settings.js┤   ↑
    ├──→ pages/bookings.js┤   │
    └──→ pages/wallet.js ─┘   │
                              │
    └──→ components/modals.js─┘

Legend: ──→ imports from
```

## HTTP/REST Integration Points (When Backend Added)

```
Frontend                              Backend
─────────                            ────────

[Sign In Form] ──POST /api/auth/login──→ [User Service]
                                           ↓
                ←──── JWT Token ←────────[DB: Users]

[Create Booking]──POST /api/bookings──→ [Booking Service]
                                           ↓
                ←─ Booking ID, Status ←─[DB: Bookings]

[Search Creators]─GET /api/creators?search=...
                    ↓
              [Search Service]
                    ↓
              [DB: Creators]
                    ↓
            [Return filtered list]

[Upload Avatar]──POST /api/upload──→ [File Service]
                                      ↓
                ←─ Image URL ←─────[Cloud Storage]

[Withdraw Funds]─POST /api/withdrawals─→ [Payment Service]
                                          ↓
                ←── Confirmation ←───[Payment Processor]
```

## Component Rendering Flow

```
navigateToPage('home')
    ↓
mainContent.innerHTML = renderHomePage()
    ↓
    └──→ Hero Section (Static HTML)
    ├──→ Stats Ribbon (Static HTML)
    └──→ Featured Creators
        └──→ renderCreatorCards(appState.creators)
            ├──→ Loop through creators array
            ├──→ Generate card HTML for each
            └──→ Return joined HTML string
                ↓
        └──→ setupCreatorCardListeners()
            ├──→ Find all .creator-card elements
            ├──→ Attach click handlers
            └──→ Each handler → renderCreatorProfile()
```

---

This visual guide shows how all the pieces fit together in the MyArteLab application.
