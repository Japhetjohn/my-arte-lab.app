// Navigation System
import { appState, setCurrentPage, addToHistory, popHistory } from './state.js';
import { renderHomePage } from './pages/home.js';
import { renderDiscoverPage } from './pages/discover.js';
import { renderBookingsPage } from './pages/bookings.js';
import { renderWalletPage } from './pages/wallet.js';
import { renderProfilePage } from './pages/profile.js';
import { renderSettingsPage } from './pages/settings.js';

export function navigateToPage(page, addToHistoryFlag = true) {
    // Track navigation history
    if (addToHistoryFlag && appState.currentPage !== page) {
        addToHistory(appState.currentPage);
    }

    setCurrentPage(page);
    closeUserDropdown();

    // Update back button visibility
    updateBackButton();

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Render page content
    const mainContent = document.getElementById('mainContent');
    mainContent.style.opacity = '0';

    setTimeout(() => {
        switch (page) {
            case 'home':
                renderHomePage();
                break;
            case 'discover':
                renderDiscoverPage();
                break;
            case 'bookings':
                renderBookingsPage();
                break;
            case 'wallet':
                renderWalletPage();
                break;
            case 'profile':
                renderProfilePage();
                break;
            case 'settings':
                renderSettingsPage();
                break;
        }
        mainContent.style.opacity = '1';
        // Ensure back button is updated after rendering
        updateBackButton();
    }, 150);
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

    // Always show back button on all pages except home
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
    document.getElementById('searchOverlay').classList.add('active');
    setTimeout(() => {
        document.getElementById('globalSearch').focus();
    }, 100);
}

export function closeSearchOverlay() {
    document.getElementById('searchOverlay').classList.remove('active');
}
