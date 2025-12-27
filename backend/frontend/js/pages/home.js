export async function renderHomePage() {
    const mainContent = document.getElementById('mainContent');

    mainContent.innerHTML = `
        <div class="hero-section-modern">
            <!-- Organic shapes background -->
            <div class="organic-shape organic-shape-1"></div>
            <div class="organic-shape organic-shape-2"></div>
            <div class="organic-shape organic-shape-3"></div>

            <div class="hero-content-modern">
                <h1 class="hero-title-oversized">
                    Built for African creators. Trusted globally.
                </h1>
                <p class="hero-subtitle-modern">
                    Connect with authentic African photographers and designers.
                </p>
                <p class="hero-tagline-modern">
                    Fast. Fair. Secure.
                </p>
                <div class="hero-cta-modern">
                    <button class="btn-primary btn-cta-large" onclick="navigateToPage('discover')">
                        Explore creators
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="margin-left: 8px; vertical-align: middle;">
                            <path d="M7.5 15l5-5-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Bento Grid Features Section -->
        <div class="section" style="padding: 80px 20px; background: var(--background);">
            <div class="container" style="max-width: 1200px; margin: 0 auto;">
                <div class="bento-grid">
                    <!-- Large featured card -->
                    <div class="bento-item bento-large card-lift scroll-fade-in dynamic-light">
                        <div class="bento-icon-large">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3 class="bento-title">Secure Payments</h3>
                        <p class="bento-description">
                            Pay with USDC on Solana blockchain. Fast, transparent, and secure transactions with instant confirmations.
                        </p>
                        <div class="bento-badge">Blockchain Powered</div>
                    </div>

                    <!-- Medium cards -->
                    <div class="bento-item bento-medium card-lift scroll-fade-in scroll-fade-in-delay-1 dynamic-light">
                        <div class="bento-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3 class="bento-title">Verified Creators</h3>
                        <p class="bento-description">
                            Work with vetted African creatives. Quality guaranteed on every project.
                        </p>
                    </div>

                    <div class="bento-item bento-medium card-lift scroll-fade-in scroll-fade-in-delay-2 dynamic-light">
                        <div class="bento-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3 class="bento-title">Fast Booking</h3>
                        <p class="bento-description">
                            Book creators instantly. Get responses within 24 hours or less.
                        </p>
                    </div>
                </div>

                <div style="margin-top: 60px; text-align: center;">
                    <button class="btn-primary" onclick="navigateToPage('discover')" style="padding: 14px 40px; font-size: 16px;">
                        Browse All Creators
                    </button>
                </div>
            </div>
        </div>

        <!-- Featured Creators Section -->
        <div class="section" style="padding: 80px 20px; background: var(--surface);">
            <div class="container" style="max-width: 1200px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 48px;">
                    <h2 style="font-size: 36px; font-weight: 800; margin-bottom: 16px; background: linear-gradient(135deg, #9747FF 0%, #6B46FF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        Discover Talented Creators
                    </h2>
                    <p style="color: var(--text-secondary); font-size: 18px; max-width: 600px; margin: 0 auto;">
                        Connect with verified African photographers, designers, and creatives
                    </p>
                </div>

                <!-- Creators Preview -->
                <div id="featuredCreatorsGrid" style="margin-bottom: 40px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
                        ${[1, 2, 3, 4].map(() => `
                            <div class="card card-lift scroll-fade-in" style="padding: 0; overflow: hidden; height: 300px; animation: pulse 1.5s ease-in-out infinite;">
                                <div style="background: linear-gradient(135deg, rgba(151, 71, 255, 0.1) 0%, rgba(107, 70, 255, 0.1) 100%); height: 100%;"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="text-align: center;">
                    <button class="btn-primary btn-cta-large" onclick="navigateToPage('discover')" style="padding: 16px 48px; font-size: 18px; font-weight: 600;">
                        View All Creators
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="margin-left: 8px; vertical-align: middle;">
                            <path d="M7.5 15l5-5-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Load featured creators after rendering
    loadFeaturedCreators();
}

async function loadFeaturedCreators() {
    try {
        const response = await fetch('/api/creators?limit=4');
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            const creators = data.data.slice(0, 4);
            const grid = document.getElementById('featuredCreatorsGrid');

            if (grid) {
                grid.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
                        ${creators.map(creator => `
                            <div class="card card-lift scroll-fade-in dynamic-light" onclick="navigateToPage('discover')" style="cursor: pointer; padding: 0; overflow: hidden;">
                                <!-- Creator Cover -->
                                <div style="height: 140px; background: linear-gradient(135deg, #9747FF 0%, #6B46FF 100%); position: relative; overflow: hidden;">
                                    ${creator.coverImage ? `
                                        <img src="${creator.coverImage}" alt="${creator.name}" style="width: 100%; height: 100%; object-fit: cover;">
                                    ` : ''}
                                    ${creator.isVerified ? `
                                        <div style="position: absolute; top: 12px; right: 12px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #10b981;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M9 12l2 2 4-4m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/>
                                            </svg>
                                            Verified
                                        </div>
                                    ` : ''}
                                </div>

                                <!-- Creator Info -->
                                <div style="padding: 20px;">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                        <img src="${creator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=9747FF&color=fff&bold=true`}"
                                             alt="${creator.name}"
                                             style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                        <div style="flex: 1;">
                                            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">
                                                ${creator.name}
                                            </h3>
                                            <p style="margin: 0; font-size: 13px; color: var(--text-secondary); text-transform: capitalize;">
                                                ${creator.category || 'Creator'}
                                            </p>
                                        </div>
                                    </div>

                                    ${creator.location?.country || creator.location?.city ? `
                                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: var(--text-secondary); font-size: 13px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/>
                                                <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
                                            </svg>
                                            <span>${creator.location.city || creator.location.country}</span>
                                        </div>
                                    ` : ''}

                                    ${creator.rating?.average ? `
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <div style="display: flex; gap: 2px;">
                                                ${Array.from({ length: 5 }, (_, i) => `
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${i < Math.floor(creator.rating.average) ? '#F59E0B' : 'none'}" stroke="#F59E0B" stroke-width="2">
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                    </svg>
                                                `).join('')}
                                            </div>
                                            <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
                                                ${creator.rating.average.toFixed(1)}
                                            </span>
                                            <span style="font-size: 12px; color: var(--text-secondary);">
                                                (${creator.rating.count})
                                            </span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load featured creators:', error);
        // Keep skeleton loaders if fetch fails
    }
}

