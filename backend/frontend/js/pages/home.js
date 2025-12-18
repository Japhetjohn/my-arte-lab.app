export async function renderHomePage() {
    const mainContent = document.getElementById('mainContent');

    mainContent.innerHTML = `
        <div class="hero-section">
            <div class="hero-content">
                <h1>Built for African creators. Trusted by clients globally.</h1>
                <p>Connect with authentic African photographers and designers.</p>
                <p style="font-weight: 600; margin-top: 8px;">Fast. Fair. Secure.</p>
                <div class="hero-cta">
                    <button class="btn-primary" onclick="navigateToPage('discover')">Explore creators</button>
                </div>
            </div>
        </div>
    `;
}

