/**
 * Clear Cache Utility
 * Clears old mock data from localStorage to ensure fresh start with live backend data
 */

export function clearOldMockData() {
    try {
        // Get the token (we want to keep this)
        const token = localStorage.getItem('token');

        // Clear all localStorage
        localStorage.clear();

        // Restore the token if it exists
        if (token) {
            localStorage.setItem('token', token);
        }

        return true;
    } catch (error) {
        console.error('Failed to clear localStorage:', error);
        return false;
    }
}

/**
 * Check if we need to clear cache (run once on app load)
 */
export function checkAndClearCache() {
    const cacheVersion = 'v2.0-live'; // Increment this to force cache clear
    const storedVersion = localStorage.getItem('cacheVersion');

    if (storedVersion !== cacheVersion) {
        clearOldMockData();
        localStorage.setItem('cacheVersion', cacheVersion);
    }
}
