// MyArteLab - Main Application Entry Point
import { appState, setUser } from './state.js';
import { navigateToPage, goBack, updateBackButton, openSearchOverlay, closeSearchOverlay, closeUserDropdown } from './navigation.js';
import { showAuthModal, handleAuth, handleLogout, updateUserMenu, initAuth } from './auth.js';
import { showToast, closeModal, closeModalOnBackdrop, toggleSwitch } from './utils.js';
import { checkAndClearCache } from './utils/clearCache.js';
import { renderCreatorProfile } from './components/creators.js';
import {
    showBookingModal,
    handleBookingSubmit,
    handleBookNow,
    openLightbox,
    handleProfileUpdate,
    handleAvatarUpload,
    handleCoverUpload,
    showChangePasswordModal,
    showTwoFactorModal,
    showDeleteAccountModal,
    showWithdrawModal,
    showAddFundsModal,
    showPayoutSettings,
    showTransactionHistory,
    showEarningsReport
} from './components/modals.js';

// Make functions globally available for onclick handlers
window.navigateToPage = navigateToPage;
window.goBack = goBack;
window.showAuthModal = showAuthModal;
window.handleAuth = handleAuth;
window.handleLogout = handleLogout;
window.closeModal = closeModal;
window.closeModalOnBackdrop = closeModalOnBackdrop;
window.closeUserDropdown = closeUserDropdown;
window.toggleSwitch = toggleSwitch;
window.showToast = showToast;
window.renderCreatorProfile = renderCreatorProfile;
window.showBookingModal = showBookingModal;
window.handleBookingSubmit = handleBookingSubmit;
window.handleBookNow = handleBookNow;
window.openLightbox = openLightbox;
window.handleProfileUpdate = handleProfileUpdate;
window.handleAvatarUpload = handleAvatarUpload;
window.handleCoverUpload = handleCoverUpload;
window.showChangePasswordModal = showChangePasswordModal;
window.showTwoFactorModal = showTwoFactorModal;
window.showDeleteAccountModal = showDeleteAccountModal;
window.showWithdrawModal = showWithdrawModal;
window.showAddFundsModal = showAddFundsModal;
window.showPayoutSettings = showPayoutSettings;
window.showTransactionHistory = showTransactionHistory;
window.showEarningsReport = showEarningsReport;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
    navigateToPage('home', false);
    updateBackButton();
});

async function initializeApp() {
    // Clear old mock data from localStorage (if any)
    checkAndClearCache();

    // Initialize authentication and restore user session from backend
    await initAuth();

    // All data is now loaded from the backend API when pages are rendered
    // No more mock data - everything is LIVE!
}

function setupEventListeners() {
    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateToPage(page);
        });
    });

    // Back button
    document.getElementById('backBtn')?.addEventListener('click', goBack);

    // Search button
    document.getElementById('searchBtn')?.addEventListener('click', openSearchOverlay);
    document.getElementById('closeSearchBtn')?.addEventListener('click', closeSearchOverlay);

    // Auth button will be handled dynamically
    updateUserMenu();

    // Close overlay when clicking outside
    document.getElementById('searchOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'searchOverlay') {
            closeSearchOverlay();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // ESC key closes modals, dropdowns, and overlays
        if (e.key === 'Escape') {
            closeModal();
            closeSearchOverlay();
            closeUserDropdown();
        }
    });
}

// Export for use in other modules
export { appState };
