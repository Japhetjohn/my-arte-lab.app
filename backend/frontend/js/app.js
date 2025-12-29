import { appState, setUser } from './state.js';
import { navigateToPage, goBack, updateBackButton, openSearchOverlay, closeSearchOverlay, closeUserDropdown } from './navigation.js';
import { showAuthModal, handleAuth, handleLogout, updateUserMenu, initAuth } from './auth.js';
import { showToast, closeModal, closeModalOnBackdrop, toggleSwitch } from './utils.js';
import { checkAndClearCache } from './utils/clearCache.js';
import { renderCreatorProfile } from './components/creators.js';
import './utils/serviceManagement.js';
import './components/projectModals.js';
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
    showWithdrawModal,
    showAddFundsModal,
    showPayoutSettings,
    showTransactionHistory,
    showEarningsReport
} from './components/modals.js';

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
window.showWithdrawModal = showWithdrawModal;
window.showAddFundsModal = showAddFundsModal;
window.showPayoutSettings = showPayoutSettings;
window.showTransactionHistory = showTransactionHistory;
window.showEarningsReport = showEarningsReport;

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();

    // Handle hash-based routing (for shared links)
    handleHashRoute();

    updateBackButton();
});

async function initializeApp() {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    checkAndClearCache();

    await initAuth();

}

function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateToPage(page);
        });
    });

    document.getElementById('backBtn')?.addEventListener('click', goBack);

    document.getElementById('searchBtn')?.addEventListener('click', openSearchOverlay);
    document.getElementById('closeSearchBtn')?.addEventListener('click', closeSearchOverlay);

    updateUserMenu();

    document.getElementById('searchOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'searchOverlay') {
            closeSearchOverlay();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeSearchOverlay();
            closeUserDropdown();
        }
    });

    // Handle hash changes (for shared links)
    window.addEventListener('hashchange', handleHashRoute);
}

/**
 * Handle hash-based routing for shared profile links
 * Example: #/creator/507f1f77bcf86cd799439011
 */
function handleHashRoute() {
    const hash = window.location.hash;

    if (!hash || hash === '#') {
        // No hash, load default page
        const lastPage = localStorage.getItem('currentPage') || 'home';
        navigateToPage(lastPage, false);
        return;
    }

    // Parse hash route: #/creator/123
    const match = hash.match(/#\/creator\/([a-f0-9]{24})/i);

    if (match && match[1]) {
        const creatorId = match[1];
        console.log('Loading creator profile:', creatorId);

        // Render the creator profile
        renderCreatorProfile(creatorId);
    } else {
        // Invalid hash, go to home
        console.warn('Invalid hash route:', hash);
        navigateToPage('home', false);
    }
}

export { appState };
