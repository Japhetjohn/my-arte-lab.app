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
    `;
}

