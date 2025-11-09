// Profile Page Module
import { appState } from '../state.js';
import { getAvatarUrl } from '../utils/avatar.js';

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

    const user = appState.user;
    const avatarUrl = getAvatarUrl(user);
    const isCreator = user.role === 'creator';

    mainContent.innerHTML = `
        <div class="profile-cover" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 200px;"></div>

        <div class="profile-header">
            <img src="${avatarUrl}" alt="${user.name}" class="profile-avatar">

            <div class="profile-info">
                <div class="profile-name-row">
                    <div>
                        <h1>${user.name}</h1>
                        ${user.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                        <div class="creator-role mt-sm">${isCreator ? 'Creator' : 'Client'}</div>
                        ${user.location?.country ? `
                        <div class="creator-location mt-sm">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M8 14s5-4 5-7.5a5 5 0 0 0-10 0C3 10 8 14 8 14z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                            ${user.location.country}
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="profile-actions">
                    <button class="btn-primary" onclick="navigateToPage('settings')">Edit Profile</button>
                    ${isCreator ? '<button class="btn-secondary" onclick="navigateToPage(\'bookings\')">View Bookings</button>' : ''}
                </div>

                <div class="mt-lg">
                    <h3 class="mb-sm">About</h3>
                    <p>${user.bio || 'No bio added yet. Click Edit Profile to add your bio.'}</p>
                    ${user.wallet ? `
                    <div class="mt-md card" style="padding: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" stroke="currentColor" stroke-width="2"/>
                                <path d="M18 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            <h4 style="margin: 0;">Wallet</h4>
                        </div>
                        <div class="small-text">Balance</div>
                        <div style="font-weight: 600; font-size: 20px; margin-top: 4px;">${user.wallet.currency || 'USDT'} ${(user.wallet.balance || 0).toFixed(2)}</div>
                        <div class="small-text mt-sm">Network: ${user.wallet.network || 'Solana'}</div>
                        <button class="btn-secondary mt-md" onclick="navigateToPage('wallet')" style="width: 100%;">Manage Wallet</button>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>

        ${isCreator ? `
        <div class="section">
            <div class="container">
                <h2 class="mb-md">Portfolio</h2>
                <div class="card" style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎨</div>
                    <p class="text-secondary">Add your portfolio images to showcase your work</p>
                    <button class="btn-primary mt-md" onclick="navigateToPage('settings')">Add Portfolio</button>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                <h2 class="mb-md">Services & Pricing</h2>
                <div class="card" style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">💼</div>
                    <p class="text-secondary">Set up your services and pricing to start receiving bookings</p>
                    <button class="btn-primary mt-md" onclick="navigateToPage('settings')">Add Services</button>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <div class="container">
                <h2 class="mb-md">Account Information</h2>
                <div class="card">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 16px 0; font-weight: 600;">Email</td>
                            <td style="padding: 16px 0; text-align: right;">${user.email}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 16px 0; font-weight: 600;">Account Type</td>
                            <td style="padding: 16px 0; text-align: right;">${isCreator ? 'Creator Account' : 'Client Account'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 16px 0; font-weight: 600;">Email Verified</td>
                            <td style="padding: 16px 0; text-align: right;">${user.isEmailVerified ? '<span style="color: var(--success);">✓ Verified</span>' : '<span style="color: var(--warning);">Not verified</span>'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 16px 0; font-weight: 600;">Member Since</td>
                            <td style="padding: 16px 0; text-align: right;">${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    `;
}
