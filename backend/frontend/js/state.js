export const appState = {
    currentPage: 'home',
    previousPage: null,
    navigationHistory: [],
    user: null,
    creators: [],
    bookings: [],
    wallet: {
        balance: 0,
        transactions: []
    }
};

export function setUser(user) {
    appState.user = user;
}

export function clearUser() {
    appState.user = null;
}

export function setCurrentPage(page) {
    appState.previousPage = appState.currentPage;
    appState.currentPage = page;
}

export function addToHistory(page) {
    if (page !== 'creator-profile') {
        appState.navigationHistory.push(page);
    }
}

export function popHistory() {
    return appState.navigationHistory.pop();
}
