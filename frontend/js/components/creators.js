// Creators Component Module
import { appState, addToHistory, setCurrentPage } from '../state.js';
import { updateBackButton } from '../navigation.js';

export function renderCreatorCards(creators) {
    return creators.map(creator => `
        <div class="creator-card" data-creator-id="${creator.id}">
            <img src="${creator.avatar}" alt="${creator.name}" class="creator-image">
            <div class="creator-info">
                <div class="creator-header">
                    <div>
                        <div class="creator-name">${creator.name}</div>
                        ${creator.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                    </div>
                </div>
                <div class="creator-role">${creator.role}</div>
                <div class="creator-location">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M7 12s4-3 4-6a4 4 0 0 0-8 0c0 3 4 6 4 6z" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    ${creator.location}
                </div>
                <div class="creator-rating">
                    <span class="stars">★★★★★</span>
                    <span class="rating-count">${creator.rating} (${creator.reviewCount})</span>
                </div>
                <div class="creator-price">${creator.price}</div>
                <div class="creator-actions">
                    <button class="btn-secondary" onclick="event.stopPropagation(); renderCreatorProfile(${JSON.stringify(creator).replace(/"/g, '&quot;')})">View profile</button>
                    <button class="btn-primary" onclick="event.stopPropagation(); handleBookNow(${creator.id})">Book now</button>
                </div>
            </div>
        </div>
    `).join('');
}

export function renderCreatorProfile(creator) {
    // Track that we're viewing a profile (not a main page)
    setCurrentPage('creator-profile');

    if (!creator) {
        console.error('No creator data provided to renderCreatorProfile');
        return;
    }

    const mainContent = document.getElementById('mainContent');
    // Always use default avatar with initials for consistency
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || 'User')}&background=9747FF&color=fff&bold=true`;
    const coverImage = creator.cover || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';
    mainContent.innerHTML = `
        <div class="profile-cover" style="background-image: url('${coverImage}'); background-size: cover; background-position: center;"></div>

        <div class="profile-header">
            <img src="${defaultAvatar}" alt="${creator.name}" class="profile-avatar">

            <div class="profile-info">
                <div class="profile-name-row">
                    <div>
                        <h1>${creator.name}</h1>
                        ${creator.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                        <div class="creator-role mt-sm">${creator.role}</div>
                        <div class="creator-location mt-sm">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M8 14s5-4 5-7.5a5 5 0 0 0-10 0C3 10 8 14 8 14z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                            ${creator.location}
                        </div>
                        <div class="creator-rating mt-sm">
                            <span class="stars">★★★★★</span>
                            <span class="rating-count">${creator.rating} (${creator.reviewCount} reviews)</span>
                        </div>
                    </div>
                </div>

                <div class="profile-actions">
                    <button class="btn-primary" onclick="showBookingModal(${creator.id})">Book now</button>
                    <button class="btn-secondary">Message</button>
                    <button class="btn-ghost">Save</button>
                </div>

                <div class="mt-lg">
                    <h3 class="mb-sm">About</h3>
                    <p>${creator.bio || 'No bio available'}</p>
                    <div class="mt-md" style="display: flex; gap: 24px; flex-wrap: wrap;">
                        <div>
                            <div class="small-text">Response time</div>
                            <div style="font-weight: 600;">${creator.responseTime || 'N/A'}</div>
                        </div>
                        <div>
                            <div class="small-text">Completed jobs</div>
                            <div style="font-weight: 600;">${creator.completedJobs || 0}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        ${creator.portfolio && creator.portfolio.length > 0 ? `
        <div class="section">
            <div class="container">
                <h2 class="mb-md">Portfolio</h2>
                <div class="portfolio-grid">
                    ${creator.portfolio.map((image, index) => `
                        <div class="portfolio-item" onclick="openLightbox(${creator.id}, ${index})">
                            <img src="${image}" alt="Portfolio ${index + 1}">
                            <div class="portfolio-overlay">
                                <div>Project ${index + 1}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        ` : ''}

        ${creator.services && creator.services.length > 0 ? `
        <div class="section">
            <div class="container">
                <h2 class="mb-md">Services & Pricing</h2>
                <div class="services-list">
                    ${creator.services.map((service, index) => `
                        <div class="service-card">
                            <div class="service-header">
                                <div>
                                    <div class="service-title">${service.title}</div>
                                    <div class="service-duration">${service.duration || 'Contact for details'}</div>
                                </div>
                                <div class="service-price">${service.price || 'Contact for pricing'}</div>
                            </div>
                            <ul class="service-deliverables">
                                ${service.deliverables ? service.deliverables.map(item => `<li>${item}</li>`).join('') : ''}
                            </ul>
                            <button class="btn-primary" onclick="showBookingModal(${creator.id}, ${index})">Book this service</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <div class="container">
                <h2 class="mb-md">Reviews</h2>
                <div class="card">
                    <div class="creator-rating mb-md">
                        <span class="stars" style="font-size: 24px;">★★★★★</span>
                        <span style="font-size: 24px; font-weight: 600; margin-left: 8px;">${creator.rating}</span>
                        <span class="rating-count">(${creator.reviewCount} reviews)</span>
                    </div>
                    <p class="text-secondary">Reviews will be displayed here after clients complete their bookings and leave feedback.</p>
                </div>
            </div>
        </div>
    `;

    // Update back button visibility
    updateBackButton();
}

export function setupCreatorCardListeners() {
    document.querySelectorAll('.creator-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                const creatorId = parseInt(card.dataset.creatorId);
                const creator = appState.creators.find(c => c.id === creatorId);
                if (creator) {
                    // Add current page to history before navigating to profile
                    if (appState.currentPage !== 'creator-profile') {
                        addToHistory(appState.currentPage);
                    }
                    renderCreatorProfile(creator);
                }
            }
        });
    });
}

// Make function available globally for inline onclick handlers
window.renderCreatorProfile = renderCreatorProfile;

export function renderCategories(categoryCounts = {}) {
    // Map category types to display info
    const categoryMap = {
        photographer: { name: 'Photographers', icon: '📷' },
        designer: { name: 'Designers', icon: '🎨' },
        videographer: { name: 'Videographers', icon: '🎥' },
        illustrator: { name: 'Illustrators', icon: '✏️' },
        other: { name: 'Other', icon: '🎭' }
    };

    const categories = [];

    // Add categories from API data
    Object.keys(categoryMap).forEach(key => {
        const count = categoryCounts[key] || 0;
        if (count > 0 || key === 'photographer' || key === 'designer') {
            categories.push({
                name: categoryMap[key].name,
                icon: categoryMap[key].icon,
                count: count
            });
        }
    });

    // If no categories have counts, show placeholders
    if (categories.length === 0) {
        categories.push(
            { name: 'Photographers', icon: '📷', count: 0 },
            { name: 'Designers', icon: '🎨', count: 0 },
            { name: 'Videographers', icon: '🎥', count: 0 }
        );
    }

    return categories.map(category => `
        <div class="category-card">
            <div class="category-icon">${category.icon}</div>
            <div class="category-name">${category.name}</div>
            <div class="category-count">${category.count > 0 ? category.count.toLocaleString() : 'Coming soon'} ${category.count > 0 ? 'creators' : ''}</div>
        </div>
    `).join('');
}
