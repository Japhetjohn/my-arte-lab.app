// Profile Page Module
import { appState } from '../state.js';
import { renderCreatorProfile } from '../components/creators.js';

export function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👤</div>
                <h3>Sign in to view your profile</h3>
                <p>Create your creator profile and start getting bookings</p>
                <button class="btn-primary" onclick="showAuthModal('signin')">Sign in</button>
            </div>
        `;
        return;
    }

    // Show first creator's profile as example
    const creator = appState.creators[0];
    renderCreatorProfile(creator);
}
