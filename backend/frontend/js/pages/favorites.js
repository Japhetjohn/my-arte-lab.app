import { appState, setCurrentPage } from '../state.js';
import api from '../services/api.js';
import { updateBackButton } from '../navigation.js';
import { renderCreatorProfile } from '../components/creators.js';

export async function renderFavoritesPage() {
    setCurrentPage('favorites');
    const mainContent = document.getElementById('mainContent');

    window.showLoadingSpinner('Loading your favorites...');

    try {
        const response = await api.getFavorites();

        if (response.success) {
            const favorites = response.data.favorites;
            window.hideLoadingSpinner();

            if (favorites && favorites.length > 0) {
                mainContent.innerHTML = `
                    <div class="section">
                        <div class="container">
                            <div class="glass-effect" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding: 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.5);">
                                <h1 class="page-title" style="margin: 0;">Saved Creators</h1>
                                <span class="badge" style="background: rgba(151, 71, 255, 0.15); color: var(--primary); backdrop-filter: blur(4px); border: 1px solid rgba(151, 71, 255, 0.2); padding: 8px 16px; border-radius: 12px; font-weight: 600;">
                                    ${favorites.length} ${favorites.length === 1 ? 'Creator' : 'Creators'}
                                </span>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
                                ${favorites.map(creator => renderFavoriteCard(creator)).join('')}
                            </div>
                        </div>
                    </div>
                `;

                setupFavoriteListeners();
            } else {
                mainContent.innerHTML = `
                    <div class="section">
                        <div class="container">
                            <h1 class="page-title mb-lg">Saved Creators</h1>
                            <div class="empty-state glass-effect" style="padding: 60px 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.4);">
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
                                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <h3>No Favorites Yet</h3>
                                <p>Start exploring and save your favorite creators!</p>
                                <button class="btn-primary" onclick="window.navigateToPage('discover')" style="margin-top: 16px;">Discover Creators</button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load favorites:', error);
        window.hideLoadingSpinner();
        mainContent.innerHTML = `
            <div class="section">
                <div class="container">
                    <h1 class="page-title mb-lg">Saved Creators</h1>
                    <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px; border-color: rgba(239, 68, 68, 0.3);">
                        <div class="empty-icon" style="color: var(--error);">❌</div>
                        <h3>Failed to Load Favorites</h3>
                        <p>${error.message || 'An error occurred'}</p>
                        <button class="btn-primary" onclick="window.location.reload()">Try Again</button>
                    </div>
                </div>
            </div>
        `;
    }

    updateBackButton();
}

function renderFavoriteCard(creator) {
    const avatar = creator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || 'User')}&background=9747FF&color=fff&bold=true`;
    const category = creator.category ? creator.category.charAt(0).toUpperCase() + creator.category.slice(1) : 'Creator';
    const rating = creator.rating?.average?.toFixed(1) || '0.0';
    const reviewCount = creator.rating?.count || 0;
    const location = creator.location ?
        (typeof creator.location === 'object' ?
            `${creator.location.city || ''}${creator.location.city && creator.location.country ? ', ' : ''}${creator.location.country || ''}`.trim()
            : creator.location)
        : 'Nigeria';

    return `
        <div class="creator-card glass-effect" data-creator-id="${creator._id}" style="border: 1px solid rgba(255,255,255,0.5); border-radius: 16px; padding: 20px; background: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                <img src="${avatar}" alt="${creator.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.6);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <div style="font-weight: 600; font-size: 16px; color: var(--text-primary);">${creator.name}</div>
                        ${creator.isVerified ? '<span style="color: var(--primary); font-size: 14px;">✓</span>' : ''}
                    </div>
                    <div style="color: var(--text-secondary); font-size: 14px;">${category}</div>
                </div>
                <button class="btn-ghost unfavorite-btn" data-creator-id="${creator._id}" style="padding: 8px; min-width: auto; background: rgba(239, 68, 68, 0.05);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color: var(--error);">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>

            <div style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px; font-size: 14px; color: var(--text-secondary);">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M7 12s4-3 4-6a4 4 0 0 0-8 0c0 3 4 6 4 6z" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    ${location}
                </div>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 14px;">
                    <span style="color: #F59E0B;">★</span>
                    <span style="font-weight: 600; color: var(--text-primary);">${rating}</span>
                    <span style="color: var(--text-secondary);">(${reviewCount})</span>
                </div>
            </div>

            ${creator.bio ? `
                <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.5; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${creator.bio}
                </p>
            ` : ''}

            ${creator.metrics ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.4); border-radius: 12px; border: 1px solid rgba(255,255,255,0.3);">
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 2px;">Response</div>
                        <div style="font-weight: 600; color: var(--primary);">${creator.metrics.responseRate || 100}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 2px;">On-Time</div>
                        <div style="font-weight: 600; color: var(--primary);">${creator.metrics.onTimeDeliveryRate || 100}%</div>
                    </div>
                </div>
            ` : ''}

            ${creator.badges && creator.badges.length > 0 ? `
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;">
                    ${creator.badges.slice(0, 3).map(badge => {
        const badgeInfo = {
            'top_rated': { icon: '⭐', label: 'Top Rated' },
            'power_seller': { icon: '💪', label: 'Power Seller' },
            'rising_talent': { icon: '🚀', label: 'Rising' },
            'fast_responder': { icon: '⚡', label: 'Fast' },
            'reliable': { icon: '✓', label: 'Reliable' }
        };
        const info = badgeInfo[badge.type] || { icon: '🏆', label: badge.type };
        // 🌟 UPDATED: Frosted badges
        return `<span style="font-size: 12px; padding: 4px 10px; background: rgba(255,255,255,0.5); backdrop-filter: blur(4px); border-radius: 8px; border: 1px solid rgba(255,255,255,0.4); color: var(--text-primary); font-weight: 500;">${info.icon} ${info.label}</span>`;
    }).join('')}
                </div>
            ` : ''}

            <div style="display: flex; gap: 8px;">
                <button class="btn-primary view-profile-btn" data-creator-id="${creator._id}" style="flex: 1; font-size: 14px;">View Profile</button>
                <button class="btn-secondary book-btn" data-creator-id="${creator._id}" style="flex: 1; font-size: 14px; background: rgba(255,255,255,0.5);">Book Now</button>
            </div>
        </div>
    `;
}

function setupFavoriteListeners() {
    document.querySelectorAll('.view-profile-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const creatorId = btn.dataset.creatorId;
            renderCreatorProfile({ id: creatorId });
        });
    });

    document.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const creatorId = btn.dataset.creatorId;
            window.showBookingModal(creatorId);
        });
    });

    document.querySelectorAll('.unfavorite-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const creatorId = btn.dataset.creatorId;

            if (!confirm('Remove this creator from your favorites?')) return;

            try {
                await api.removeFromFavorites(creatorId);
                window.showToast('Removed from favorites', 'success');
                renderFavoritesPage(); // Reload the page
            } catch (error) {
                console.error('Failed to remove favorite:', error);
                window.showToast(error.message || 'Failed to remove favorite', 'error');
            }
        });
    });

    document.querySelectorAll('.creator-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                const creatorId = card.dataset.creatorId;
                renderCreatorProfile({ id: creatorId });
            }
        });
    });
}

export default { renderFavoritesPage };