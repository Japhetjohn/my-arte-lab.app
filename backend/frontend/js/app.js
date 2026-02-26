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

    // Handle routing
    handleHistoryRoute();

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
            // 1. Instantly update the UI so it feels snappy
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');

            // 2. Then proceed with the actual navigation
            const page = e.currentTarget.dataset.page;
            navigateToPage(page);
        });
    });

    document.getElementById('backBtn')?.addEventListener('click', goBack);

    document.getElementById('searchBtn')?.addEventListener('click', openSearchOverlay);
    document.getElementById('closeSearchBtn')?.addEventListener('click', closeSearchOverlay);

    // Global search functionality
    const globalSearchInput = document.getElementById('globalSearch');
    globalSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchQuery = globalSearchInput.value.trim();
            if (searchQuery) {
                // Store search query in localStorage
                localStorage.setItem('pendingSearch', searchQuery);
                // Navigate to home page which will pick up the search
                navigateToPage('home');
                closeSearchOverlay();
                globalSearchInput.value = '';
            }
        }
    });

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

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page) {
            navigateToPage(e.state.page, false);
        } else {
            handleHistoryRoute();
        }
    });

    // Handle legacy hash changes (for shared links)
    window.addEventListener('hashchange', handleHistoryRoute);
}

/**
 * Handle path-based routing (History API)
 */
function handleHistoryRoute() {
    const path = window.location.pathname;
    const hash = window.location.hash;

    // Handle legacy hash routes first (redirect to clean path)
    if (hash && hash.startsWith('#/creator/')) {
        const creatorId = hash.replace('#/creator/', '');
        history.replaceState({ page: 'creator', creatorId }, '', `/creator/${creatorId}`);
        renderCreatorProfile(creatorId);
        return;
    }

    // Handle clean paths
    if (path === '/' || path === '/home') {
        navigateToPage('home', false);
    } else if (path.startsWith('/creator/')) {
        const creatorId = path.split('/')[2];
        if (creatorId && creatorId.length === 24) {
            renderCreatorProfile(creatorId);
        } else {
            navigateToPage('home', false);
        }
    } else {
        // Match other pages (wallet, bookings, etc)
        const page = path.substring(1);
        const validPages = ['projects', 'bookings', 'notifications', 'wallet', 'profile', 'settings', 'favorites'];
        if (validPages.includes(page)) {
            navigateToPage(page, false);
        } else {
            // Fallback to last page or home
            const lastPage = localStorage.getItem('currentPage') || 'home';
            navigateToPage(lastPage, false);
        }
    }
}

export { appState };
