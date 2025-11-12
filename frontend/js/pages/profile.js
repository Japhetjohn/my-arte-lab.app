// Profile Page Module
import { appState } from '../state.js';
import { getAvatarUrl } from '../utils/avatar.js';
import { renderProfileCompletionWidget } from '../utils/profileCompletion.js';
import api from '../services/api.js';

export async function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                </svg>
                <h3>Sign in to view your profile</h3>
                <p>Create your creator profile and start getting bookings</p>
                <button class="btn-primary" onclick="showAuthModal('signin')">Sign in</button>
            </div>
        `;
        return;
    }

    const user = appState.user;
    const avatarUrl = getAvatarUrl(user);

    // More flexible creator check - check role, category, or services array
    const isCreator = user.role && (
        user.role.toLowerCase().includes('creator') ||
        user.role.toLowerCase() === 'creator'
    );

    console.log('👤 Profile Page - Full User Object:', user);
    console.log('📋 User Role (raw):', user.role);
    console.log('📋 User Role (type):', typeof user.role);
    console.log('🎯 Is Creator?', isCreator);
    console.log('📊 User Category:', user.category);
    console.log('🔧 Has Services Field?', 'services' in user);

    // Load services if creator
    let services = [];
    if (isCreator) {
        try {
            const response = await api.getMyServices();
            if (response.success) {
                services = response.data.services || [];
            }
        } catch (error) {
            console.error('Failed to load services:', error);
        }
    }

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
                        ${user.location && (user.location.city || user.location.country) ? `
                        <div class="creator-location mt-sm">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M8 14s5-4 5-7.5a5 5 0 0 0-10 0C3 10 8 14 8 14z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                            ${[user.location.city, user.location.country].filter(Boolean).join(', ')}
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
                        <div style="font-weight: 600; font-size: 20px; margin-top: 4px;">${user.wallet.currency || 'USDC'} ${(user.wallet.balance || 0).toFixed(2)}</div>
                        <div class="small-text mt-sm">Network: ${user.wallet.network || 'Solana'}</div>
                        <button class="btn-secondary mt-md" onclick="navigateToPage('wallet')" style="width: 100%;">Manage Wallet</button>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                ${renderProfileCompletionWidget(user)}
            </div>
        </div>

        ${isCreator ? `
        <div class="section">
            <div class="container">
                <h2 class="mb-md">Portfolio</h2>
                <div class="card" style="text-align: center; padding: 40px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin: 0 auto 16px;">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <p class="text-secondary">Add your portfolio images to showcase your work</p>
                    <button class="btn-primary mt-md" onclick="navigateToPage('settings')">Add Portfolio</button>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2>My Services</h2>
                    <button class="btn-primary" onclick="window.showAddServiceModal()" style="display: flex; align-items: center; gap: 8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Add Service
                    </button>
                </div>
                ${services.length > 0 ? `
                    <div style="display: grid; gap: 16px;">
                        ${services.map(service => `
                            <div class="card" style="padding: 20px;">
                                ${service.images && service.images.length > 0 ? `
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; margin-bottom: 16px;">
                                        ${service.images.map(img => `
                                            <img src="${img}" alt="${service.title}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 8px; cursor: pointer;" onclick="window.open('${img}', '_blank')">
                                        `).join('')}
                                    </div>
                                ` : ''}
                                <h3 style="font-size: 18px; margin-bottom: 8px;">${service.title}</h3>
                                <p style="color: var(--text-secondary); margin-bottom: 12px; line-height: 1.6;">${service.description}</p>
                                ${service.directLink ? `
                                    <div style="margin-bottom: 12px;">
                                        <a href="${service.directLink}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            ${service.directLink}
                                        </a>
                                    </div>
                                ` : ''}
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn-secondary" onclick="window.editService('${service._id}')" style="flex: 1;">Edit</button>
                                    <button class="btn-ghost" onclick="window.deleteService('${service._id}')" style="flex: 1; color: var(--error); border-color: var(--error);">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="card" style="text-align: center; padding: 40px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin: 0 auto 16px;">
                            <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                            <path d="M7 10h10M7 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3 style="margin-bottom: 8px;">No Services Yet</h3>
                        <p class="text-secondary">Add your first service to start receiving bookings</p>
                        <button class="btn-primary mt-md" onclick="window.showAddServiceModal()">Add Your First Service</button>
                    </div>
                `}
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
