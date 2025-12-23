export async function renderHomePage() {
    const mainContent = document.getElementById('mainContent');

    mainContent.innerHTML = `
        <div class="hero-section" style="
            background: linear-gradient(135deg, rgba(151, 71, 255, 0.95) 0%, rgba(107, 70, 255, 0.95) 100%),
            url('/image.png');
            background-size: cover;
            background-position: center;
            background-blend-mode: multiply;
            min-height: 500px;
            display: flex;
            align-items: center;
        ">
            <div class="hero-content" style="max-width: 800px; margin: 0 auto;">
                <h1 style="font-size: 48px; font-weight: 700; margin-bottom: 24px; line-height: 1.2;">
                    Built for African creators. Trusted by clients globally.
                </h1>
                <p style="font-size: 20px; margin-bottom: 12px; opacity: 0.95;">
                    Connect with authentic African photographers and designers.
                </p>
                <p style="font-weight: 600; font-size: 18px; margin-bottom: 32px; opacity: 0.9;">
                    Fast. Fair. Secure.
                </p>
                <div class="hero-cta">
                    <button class="btn-primary" onclick="navigateToPage('discover')" style="
                        padding: 16px 48px;
                        font-size: 18px;
                        font-weight: 600;
                        background: white;
                        color: var(--primary);
                        border: none;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    ">Explore creators</button>
                </div>
            </div>
        </div>

        <div class="section" style="padding: 80px 20px; background: var(--background);">
            <div class="container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px; margin-top: 40px;">
                    <div class="card-lift scroll-fade-in" style="padding: 32px; background: var(--surface); border-radius: 16px; box-shadow: var(--shadow-sm);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; color: var(--primary);">
                            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 12px;">Secure Payments</h3>
                        <p style="color: var(--text-secondary); line-height: 1.6;">
                            Pay with USDC on Solana blockchain. Fast, transparent, and secure transactions.
                        </p>
                    </div>

                    <div class="card-lift scroll-fade-in scroll-fade-in-delay-1" style="padding: 32px; background: var(--surface); border-radius: 16px; box-shadow: var(--shadow-sm);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; color: var(--primary);">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 12px;">Verified Creators</h3>
                        <p style="color: var(--text-secondary); line-height: 1.6;">
                            Work with vetted African creatives. Quality guaranteed on every project.
                        </p>
                    </div>

                    <div class="card-lift scroll-fade-in scroll-fade-in-delay-2" style="padding: 32px; background: var(--surface); border-radius: 16px; box-shadow: var(--shadow-sm);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; color: var(--primary);">
                            <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 12px;">Fast Booking</h3>
                        <p style="color: var(--text-secondary); line-height: 1.6;">
                            Book creators instantly. Get responses within 24 hours or less.
                        </p>
                    </div>
                </div>

                <div style="margin-top: 60px;">
                    <button class="btn-primary" onclick="navigateToPage('discover')" style="padding: 14px 40px; font-size: 16px;">
                        Browse Creators
                    </button>
                </div>
            </div>
        </div>
    `;
}

