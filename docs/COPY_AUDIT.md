# MyArteLab Copy Audit & String Inventory

**Version:** 1.0  
**Date:** October 25, 2026  
**Auditor:** Senior UX Writer & Brand Strategist (Antigravity)  
**Status:** Phase 1 Complete — Moving to Voice Guide & Batch Rewrites  

---

## 1. Executive Summary & Key Findings

An audit of the MyArteLab codebase was conducted across frontend route components, layout containers, shared UI elements, modals, notifications, wallet workflows, booking systems, social streams, authentication screens, transactional email templates, and HTML meta tags.

### Core Findings:
1. **Generic AI Templates & Clichés:**
   - Common generic patterns were found throughout initial templates: *"Welcome back! We're excited to have you back."*, *"Unlock your creative potential"*, *"Empower"*, *"Elevate your craft"*, *"Something went wrong. Please try again."*, *"No data found"*, *"Congratulations! Your booking request has been successfully processed."*
2. **Inconsistent Terminology:**
   - Varied usage of *"Log In"* vs *"Sign In"*, *"Create account"* vs *"Register"*, *"Sign Out"* vs *"Log Out"*.
   - Mixed descriptions of engagements (*"Booking"*, *"Project"*, *"Service"*, *"Commission"*).
   - Inconsistent wallet labels (*"Add Funds"* vs *"Deposit"*, *"Payout"* vs *"Withdrawal"*).
3. **Robotic Validation & Empty States:**
   - Empty states frequently defaulted to generic phrases (*"No items found"*, *"You have no bookings at this time. Get started today to discover new opportunities."*) rather than contextual, warm guidance.
4. **Over-enthusiastic Punctuation:**
   - Excessive exclamation marks (*"Success!"*, *"Email verified!"*, *"New verification code sent!"*) and uppercase Title Case on ordinary actions.

---

## 2. Non-Negotiable Brand Line Protection

The core brand anchor:
> **"Built for African creators"**

### Registered Occurrences:
1. `backend/frontend/app/index.html` (Line 7): Meta description tag  
   `content="Discover and book top African creators. Built for African creators, trusted by clients globally."`
2. `backend/frontend/app/index.html` (Line 13): Open Graph description tag  
   `content="Discover and book top African creators. Built for African creators, trusted by clients globally."`
3. `backend/frontend/app/index.html` (Line 20): Twitter card description tag  
   `content="Discover and book top African creators. Built for African creators, trusted by clients globally."`
4. `backend/frontend/index.html` (Web root copy) (Lines 7, 13, 20)

**Rule:** Every occurrence of `"Built for African creators"` is immutable. It will never be rephrased, re-punctuated, or modified.

---

## 3. High-Risk Zones & Technical String Boundaries

### Preserved Technical Elements:
- Backend error codes (`EMAIL_NOT_VERIFIED`, `USER_NOT_FOUND`, `INVALID_CREDENTIALS`, `INSUFFICIENT_FUNDS`, `RATE_LIMIT_EXCEEDED`).
- Solana & blockchain network constants (`SOLANA`, `USDC`, token mint addresses, transaction hashes).
- Database statuses & enums (`pending`, `confirmed`, `in_progress`, `delivered`, `completed`, `cancelled`, `disputed`, `awaiting_payment`).
- Provider webhooks & payment status fields from Switch and Solana.
- Dynamic interpolation tags (`{name}`, `${amount}`, `${currency}`, `{{resetUrl}}`).

---

## 4. Comprehensive String Inventory by Category

### Batch 1: Authentication & Account Access
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `pages/auth/Login.tsx` | `"Welcome back"` | Auth Header | Generic AI welcome | `"Good to see you"` |
| `pages/auth/Login.tsx` | `"Log in to continue to MyArteLab."` | Subtitle | Generic filler | `"Sign in to pick up where you left off."` |
| `pages/auth/Login.tsx` | `"Logging in..."` | Button state | Clunky progressive | `"Signing in..."` |
| `pages/auth/Login.tsx` | `"Log in"` | Primary CTA | Inconsistent with Sign In | `"Sign in"` |
| `pages/auth/Login.tsx` | `"Don't have an account? Sign up"` | Footer Link | Standard | `"New to MyArteLab? Create an account"` |
| `pages/auth/Login.tsx` | `"Verify Your Email"` | Modal Title | Title Case / robotic | `"Verify your email"` |
| `pages/auth/Login.tsx` | `"Email verified! You can now log in."` | Toast | Over-enthusiastic | `"Email verified. You can now sign in."` |
| `pages/auth/Register.tsx` | `"Create your account"` | Auth Header | Acceptable | `"Create your account"` |
| `pages/auth/Register.tsx` | `"Join MyArteLab and connect with creative opportunities."` | Subtitle | Generic SaaS promise | `"Set up your space to share work and get booked."` |
| `pages/auth/Register.tsx` | `"Client (Hire creators)"` | Toggle Label | Parenthetical clutter | `"Client (hire talent)"` |
| `pages/auth/Register.tsx` | `"Creator (Offer services)"` | Toggle Label | Parenthetical clutter | `"Creator (showcase & get booked)"` |
| `pages/auth/Register.tsx` | `"Select your primary specialty..."` | Select default | Clunky phrasing | `"Choose your creative discipline..."` |
| `pages/auth/Register.tsx` | `"Creating account..."` | Button state | Missing pronoun | `"Setting up your account..."` |
| `pages/auth/Register.tsx` | `"Already have an account? Log in"` | Footer Link | Inconsistent | `"Already have an account? Sign in"` |
| `pages/auth/ForgotPassword.tsx` | `"Forgot Password?"` | Auth Header | Title case | `"Forgot your password?"` |
| `pages/auth/ForgotPassword.tsx` | `"Enter your email to receive a 6-digit verification code"` | Subtitle | Passive instruction | `"Enter your email and we'll send you a 6-digit reset code."` |
| `pages/auth/ForgotPassword.tsx` | `"Sending Code..."` | Button state | Title case | `"Sending code..."` |
| `pages/auth/ForgotPassword.tsx` | `"Back to Login"` | Navigation link | Inconsistent | `"Back to sign in"` |
| `pages/auth/ResetPassword.tsx` | `"Password Reset!"` | Success Title | Clunky exclamation | `"Password updated"` |
| `pages/auth/ResetPassword.tsx` | `"Your password has been successfully reset."` | Description | Redundant wording | `"Your password is updated. You can now sign in."` |
| `pages/auth/ResetPassword.tsx` | `"Sign In"` | Primary CTA | Inconsistent | `"Sign in"` |

---

### Batch 2: Onboarding & First-Use Experiences
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `pages/auth/Onboarding.tsx` | `"Set up your account preferences to unlock the full MyArteLab experience."` | Subtitle | Generic "unlock experience" AI cliché | `"Tell us a bit about your work so we can personalize your space."` |
| `pages/auth/Onboarding.tsx` | `"Hire top creative talent and commission custom projects."` | Role Card | Buzzword-heavy | `"Find African creators and commission creative projects."` |
| `pages/auth/Onboarding.tsx` | `"Offer creative services, showcase your work, and get booked."` | Role Card | Generic description | `"Showcase your portfolio, offer services, and get booked directly."` |
| `pages/auth/Onboarding.tsx` | `"Tell potential clients about your creative style, experience, and services..."` | Bio Placeholder | Stiff prompt | `"Share what you make, your style, or the kind of work you love taking on..."` |
| `pages/auth/Onboarding.tsx` | `"Share a bit about what projects you are looking to hire for..."` | Bio Placeholder | Awkward preposition | `"Describe the projects or talent you're looking to collaborate with..."` |
| `pages/auth/Onboarding.tsx` | `"Complete Setup & Continue"` | Button CTA | Wordy title case | `"Save and continue"` |
| `pages/auth/Onboarding.tsx` | `"Saving profile..."` | Loading state | Terse | `"Setting up your profile..."` |

---

### Batch 3: Home, Dashboard, Navigation & Discovery
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `components/layout/TopNavigation.tsx` | `"Login"` / `"Logout"` | Auth Buttons | Inconsistent terminology | `"Sign in"` / `"Sign out"` |
| `components/layout/TopNavigation.tsx` | `"My Account"` | Dropdown Menu | Generic | `"Account"` |
| `pages/Home.tsx` | `"Join the Creative Space"` | Hero Card Title | Marketing fluff | `"Your creative headquarters"` |
| `pages/Home.tsx` | `"Publish artwork, connect with top African creators, and book services."` | Hero Card Subtitle | List-like | `"Showcase your work, connect with other creators, and collaborate."` |
| `pages/Home.tsx` | `"Log In / Sign Up"` | Button | Slash delimiter | `"Sign in or join"` |
| `pages/Home.tsx` | `"Share your latest work..."` | Mobile Composer | Generic | `"What are you working on?"` |
| `pages/Home.tsx` | `"Loading creative artwork feed..."` | Feed Loading | Redundant adjective | `"Loading your feed..."` |
| `pages/Home.tsx` | `"No artwork yet"` | Empty State Title | Negative | `"Nothing here yet"` |
| `pages/Home.tsx` | `"Be the first creator to share your work with the MyArteLab community!"` | Empty State Body | Over-enthusiastic exclamation | `"Share your latest piece to get the community feed started."` |
| `pages/Home.tsx` | `"Load More Artwork"` | Button | Redundant wording | `"Load more"` |
| `pages/Creators.tsx` | `"Failed to load creators"` | Toast | Stiff error | `"We couldn't load creators right now."` |
| `pages/Creators.tsx` | `"100% Guaranteed milestone delivery"` | Sidebar Feature | Overpromising guarantee | `"Milestone-based deliverable inspections"` |

---

### Batch 4: Portfolios & Creative Content
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `components/social/PostComposer.tsx` | `"Please enter a caption or description for your artwork"` | Validation | Stiff "Please enter" | `"Add a caption to your post before sharing."` |
| `components/social/PostComposer.tsx` | `"Your post exceeds the limit by ${chars} characters"` | Validation | Clunky grammar | `"Your post is ${chars} characters over the limit."` |
| `components/social/PostComposer.tsx` | `"Your creative work has been published!"` | Success Toast | Overblown celebratory | `"Published to your feed."` |
| `components/social/PostComposer.tsx` | `"Publishing..."` | Button State | Heavy wording | `"Posting..."` |
| `components/social/PostComposer.tsx` | `"Publish"` | Button CTA | Heavy wording | `"Post"` |
| `pages/CreatorProfile.tsx` | `"Avatar updated successfully"` | Toast | Robotic | `"Profile photo updated."` |
| `pages/CreatorProfile.tsx` | `"Tell clients about your creative background..."` | Bio Placeholder | Stiff prompt | `"A few words about your background, tools, and specialty..."` |
| `pages/CreatorProfile.tsx` | `"Get Verified Creator Badge"` | Dialog Title | Wordy | `"Creator verification"` |
| `pages/CreatorProfile.tsx` | `"Save Changes"` | Dialog CTA | Standard | `"Save changes"` |

---

### Batch 5: Booking & Project Workflows
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `pages/Bookings.tsx` | `"No bookings found"` | Empty Title | Database-centric language | `"No bookings yet"` |
| `pages/Bookings.tsx` | `"You haven't initiated or received any bookings yet."` | Empty Body | Stiff phrasing | `"When a client books you or you commission a project, it will appear here."` |
| `pages/Bookings.tsx` | `"Cancel Booking?"` | Modal Title | Missing article | `"Cancel this booking?"` |
| `pages/Bookings.tsx` | `"Are you sure you want to cancel this booking? This action cannot be undone."` | Confirmation | Dramatic AI template | `"Cancelling will stop this project and notify the other party."` |
| `pages/Bookings.tsx` | `"Reason for cancellation (Optional)"` | Placeholder | Parenthetical | `"Reason for cancellation (optional)"` |
| `pages/Bookings.tsx` | `"Keep Booking"` | Modal Cancel CTA | Good | `"Keep booking"` |
| `components/booking/NewBookingModal.tsx` | `"Send Booking Request"` / `"Submit Project"` | Modal Submit | Context distinction | `"Submit project proposal"` |
| `pages/BookingDetail.tsx` | `"Congratulations! Your booking request has been successfully processed."` | Status notice | Overblown celebratory | `"Booking request sent. We'll let you know when the creator responds."` |

---

### Batch 6: Wallet, Payments, Deposits, Withdrawals & Solana
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `components/wallet/DesktopWallet.tsx` | `"Available Balance"` | Label | Title Case | `"Available balance"` |
| `components/wallet/DesktopWallet.tsx` | `"${amount} USDC reserved for pending withdrawal"` | Notice | Accurate | Keep concise: `"${amount} USDC reserved for your pending withdrawal"` |
| `components/wallet/DesktopWallet.tsx` | `"No transactions yet"` | Empty Title | Good | `"No transactions yet"` |
| `components/wallet/DesktopWallet.tsx` | `"Your deposit, withdrawal, and booking transactions will appear here."` | Empty Body | Good | `"Deposits, payouts, and project payments will appear here."` |
| `components/wallet/DesktopWallet.tsx` | `"Zero funds released without client approval"` | Feature Callout | Good | `"Funds are only released when you inspect and approve work"` |
| `components/wallet/AddFundsModal.tsx` | `"Unable to retrieve guaranteed quote. Please try again."` | Error Message | Clunky | `"We couldn't get a live exchange quote. Try again in a moment."` |
| `components/modals/TransactionStatusModal.tsx` | `"We were unable to complete your transaction. Please try again."` | Error Message | Generic AI template | `"We couldn't confirm this transaction. Check your balance before trying again."` |

---

### Batch 7: Notifications & Messaging
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `pages/Notifications.tsx` | `"All notifications marked as read"` | Toast | Acceptable | `"Marked all notifications as read."` |
| `pages/Notifications.tsx` | `"Notification deleted"` | Toast | Terse | `"Notification removed."` |
| `pages/Messages.tsx` | `"Start a conversation..."` | Placeholder | Standard | `"Send a message to get started..."` |
| `pages/Messages.tsx` | `"Write a message..."` | Textarea Placeholder | Good | `"Write a message..."` |
| `pages/Messages.tsx` | `"Your Messages"` | Empty Title | Title Case | `"Your conversations"` |
| `pages/Messages.tsx` | `"Select a conversation from the list to start chatting..."` | Empty Body | Wordy | `"Choose a conversation on the left, or reach out to a creator to collaborate."` |

---

### Batch 8: Errors, Validation, Loading & Empty States
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `components/shared/EmptyState.tsx` | `"No data available"` | Default Title | Robotic database language | `"Nothing to show here"` |
| `components/shared/EmptyState.tsx` | `"There is no information to display at this time."` | Default Description | Robotic boilerplate | `"When there is new activity, it will show up here."` |
| `App.tsx` | `"Please check your internet connection and try again"` | Offline Banner | Stiff | `"You're offline. Reconnect to continue where you left off."` |
| `lib/validations/authSchemas.ts` | `"Password must be at least 8 characters"` | Validation | Standard | `"Must be at least 8 characters"` |

---

### Batch 9: Modals, Confirmations & Destructive Actions
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `components/modals/ConfirmationModal.tsx` | `"Are you sure you want to proceed?"` | Default prompt | Generic AI cliché | Specific to action (e.g. `"Are you sure?"`) |
| `pages/Messages.tsx` | `"Block User?"` | Modal Title | Title Case | `"Block this user?"` |
| `pages/Messages.tsx` | `"They will no longer be able to send you direct messages or view your profile."` | Description | Good, clear | `"They will no longer be able to message you or view your profile."` |
| `pages/Messages.tsx` | `"Block User"` / `"Cancel"` | Buttons | Clear | `"Block user"` / `"Cancel"` |

---

### Batch 10: Emails, Footer, SEO & Metadata
| File & Component | Existing String | Category | Issue | Proposed Target Copy |
|---|---|---|---|---|
| `backend/src/utils/emailTemplates.js` | `"Welcome to MyArteLab!"` | Welcome Email Subject | Standard | `"Welcome to MyArteLab — your creative headquarters"` |
| `backend/src/utils/emailTemplates.js` | `"Withdrawal Initiated ⚡"` | Email Subject | Emoji clutter | `"Withdrawal initiated: ${amount}"` |
| `backend/src/utils/emailTemplates.js` | `"Withdrawal Completed ✅"` | Email Subject | Emoji clutter | `"Withdrawal complete: ${amount}"` |
| `backend/src/utils/emailTemplates.js` | `"Reset your MyArteLab password"` | Email Subject | Good | `"Reset your MyArteLab password"` |
| `backend/frontend/app/index.html` | Meta tag description containing `"Built for African creators"` | SEO Metadata | Immutable Brand Anchor | Preserved character for character |

---

## 5. Uncertainty Register

The following strings and technical items are intentionally documented and flagged for preservation without arbitrary copy changes:
1. **Solana Token Account Instructions** (`backend/src/routes/walletRoutes.js:1700`): Technical blockchain message required for recipient account validation.
2. **Payment Corridor Currency Labels** (`USDC`, `NGN`, `KES`, `GHS`, `ZAR`): Regulated banking and crypto ticker abbreviations.
3. **HTTP 429 Rate Limiter Headers** (`backend/src/config/rateLimiting.js`): Security-sensitive responses designed for automated client backoff.
4. **Third-Party Provider Error Passthroughs** (Switch & Solana RPC error payloads).
