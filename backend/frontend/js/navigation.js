import { appState, setCurrentPage, addToHistory, popHistory } from './state.js';
import { renderHomePage } from './pages/home.js';
import { renderProjectsPage } from './pages/projects.js';
import { renderBookingsPage } from './pages/bookings.js';
import { renderWalletPage } from './pages/wallet.js';
import { renderProfilePage } from './pages/profile.js';
import { renderSettingsPage } from './pages/settings.js';
import { renderFavoritesPage } from './pages/favorites.js';
import { renderNotificationsPage } from './pages/notifications.js';
import { renderWalletPage, startWalletPolling, stopWalletPolling } from './pages/wallet.js';
import { addPageTransition, initScrollAnimations, init2025Effects } from './utils.js';

export function navigateToPage(page, addToHistoryFlag = true) {
    // Use History API to update URL
    if (addToHistoryFlag && appState.currentPage !== page) {
        addToHistory(appState.currentPage);
        const urlPath = page === 'home' ? '/' : `/${page}`;
        history.pushState({ page }, '', urlPath);
    }

    // Stop wallet polling if we are navigating away from wallet
    if (appState.currentPage === 'wallet' && page !== 'wallet') {
        stopWalletPolling();
    }

    setCurrentPage(page);
    localStorage.setItem('currentPage', page);
    closeUserDropdown();
    updateBackButton();

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const mainContent = document.getElementById('mainContent');

    mainContent.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
    mainContent.style.opacity = '0';
    mainContent.style.transform = 'translateX(-20px)';

    requestAnimationFrame(() => {
        switch (page) {
            case 'home':
                renderHomePage();
                break;
            case 'projects':
                renderProjectsPage();
                break;
            case 'bookings':
                renderBookingsPage();
                break;
            case 'notifications':
                renderNotificationsPage();
                break;
            case 'wallet':
                renderWalletPage();
                startWalletPolling();
                break;
            case 'profile':
                renderProfilePage();
                break;
            case 'settings':
                renderSettingsPage();
                break;
            case 'favorites':
                renderFavoritesPage();
                break;
        }

        requestAnimationFrame(() => {
            mainContent.style.opacity = '1';
            mainContent.style.transform = 'translateX(0)';
            addPageTransition();
            initScrollAnimations();
            init2025Effects();

            // Update notification badge after page navigation
            if (window.updateNotificationBadge) {
                window.updateNotificationBadge();
            }
        });

        updateBackButton();
    });
}

export function goBack() {
    if (appState.navigationHistory.length > 0) {
        const previousPage = popHistory();
        navigateToPage(previousPage, false);
    } else {
        navigateToPage('home', false);
    }
}

export function updateBackButton() {
    const backBtn = document.getElementById('backBtn');
    if (!backBtn) return;

    if (appState.currentPage !== 'home') {
        backBtn.style.display = 'flex';
    } else {
        backBtn.style.display = 'none';
    }
}

export function closeUserDropdown() {
    document.getElementById('userDropdown')?.classList.remove('active');
}

export function openSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
        // 1. Make it visible in the DOM first (it stays invisible because opacity is 0)
        overlay.style.display = 'block';

        // 2. Force the browser to register the display change before animating
        void overlay.offsetWidth;

        // 3. Add the active class to trigger the smooth frosted glass fade-in
        overlay.classList.add('active');

        // 4. Focus the input so the user can start typing immediately
        setTimeout(() => {
            document.getElementById('globalSearch')?.focus();
        }, 100);
    }
}

export function closeSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
        // 1. Remove the active class to trigger the smooth fade-out
        overlay.classList.remove('active');

        // 2. Wait for the CSS transition (0.3s) to finish before hiding it from the DOM completely
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}
