# Current Session Fixes

## 1. Google OAuth Signup/Signin Separation ✅
**Problem**: Sign up with Google was signing in existing users instead of creating new accounts.

**Solution**:
- Added mode (`signup` vs `signin`) parameter to OAuth flow
- Used in-memory Map with random state tokens to preserve mode/role through OAuth redirect
- Backend validates: signup with existing account → error, signin without account → error

**Files Modified**:
- `backend/src/routes/googleAuthRoutes.js` - State management with Map
- `backend/src/config/passport.js` - Mode validation logic
- `frontend/js/auth.js` - Added mode parameter to OAuth URLs

## 2. Creator Category Requirement ✅
**Problem**: Google OAuth signup for creators failing with "category field required" error.

**Solution**: Default category to 'other' for creator signups via Google OAuth.

**Files Modified**:
- `backend/src/config/passport.js` - Added default category for creators

## 3. Pending Tasks

### Notifications Section (Dummy Data)
**Status**: No backend API exists yet
**Action Needed**: Hide notification badge until API is implemented

### Search Functionality (Dummy Data)
**Status**: Search overlay shows dummy recent searches
**Action Needed**: Implement real search against creators API

### Discover Page Search
**Status**: May have dummy suggestions
**Action Needed**: Connect to real creators API
