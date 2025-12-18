import { appState, setUser } from './state.js';
import { navigateToPage, goBack, updateBackButton, openSearchOverlay, closeSearchOverlay, closeUserDropdown } from './navigation.js';
import { showAuthModal, handleAuth, handleLogout, updateUserMenu, initAuth } from './auth.js';
import { showToast, closeModal, closeModalOnBackdrop, toggleSwitch } from './utils.js';
import { checkAndClearCache } from './utils/clearCache.js';
import { renderCreatorProfile } from './components/creators.js';
import './utils/serviceManagement.js';
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

    const lastPage = localStorage.getItem('currentPage') || 'home';
    navigateToPage(lastPage, false);
    updateBackButton();
});

async function initializeApp() {
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
}

export { appState };
