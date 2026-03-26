import { appState } from '../state.js';
import { formatDate, formatStatus, getStatusColor } from '../utils.js';
import api from '../services/api.js';

let bookings = [];
let currentFilter = 'all'; // all, active, completed

const BOOKINGS_STYLES = `
<style>
    .bk-container { max-width: 680px; margin: 0 auto; padding: 32px 20px 60px; display: flex; flex-direction: column; gap: 32px; }
    @media (max-width: 768px) { .bk-container { padding: 24px 16px; } }
    
    .bk-title { font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .bk-subtitle { color: var(--text-secondary); font-size: 15px; margin: 0; }
    
    .bk-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 24px; }
    .bk-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    
    /* Stats Card */
    .bk-stats-card { background: linear-gradient(135deg, rgba(151, 71, 255, 0.15) 0%, rgba(107, 70, 255, 0.1) 100%); border: 1px solid rgba(151, 71, 255, 0.2); border-radius: 24px; padding: 24px; position: relative; overflow: hidden; }
    .bk-stats-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .bk-stats-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; }
    .bk-stats-total { font-size: 32px; font-weight: 800; color: var(--text-primary); }
    .bk-stats-grid { display: flex; gap: 16px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); }
    .bk-stat-item { flex: 1; }
    .bk-stat-label { font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; }
    .bk-stat-value { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .bk-stat-value.pending { color: #F59E0B; }
    .bk-stat-value.completed { color: #10B981; }
    
    /* Filter Tabs */
    .bk-filter-tabs { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
    .bk-filter-tab { padding: 10px 18px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: transparent; border: 1px solid rgba(255,255,255,0.08); color: var(--text-secondary); }
    .bk-filter-tab:hover { background: rgba(255,255,255,0.05); }
    .bk-filter-tab.active { background: var(--primary); color: white; border-color: var(--primary); }
    
    /* Booking Items */
    .bk-list { display: flex; flex-direction: column; gap: 12px; }
    .bk-item { display: flex; align-items: center; gap: 16px; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; cursor: pointer; transition: all 0.2s; }
    .bk-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(151, 71, 255, 0.2); transform: translateY(-2px); }
    .bk-item-avatar { width: 48px; height: 48px; border-radius: 14px; overflow: hidden; border: 1.5px solid rgba(151,71,255,0.1); flex-shrink: 0; }
    .bk-item-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .bk-item-info { flex: 1; min-width: 0; }
    .bk-item-title { font-size: 14px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
    .bk-item-meta { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; }
    .bk-item-meta-dot { width: 4px; height: 4px; background: var(--text-secondary); border-radius: 50%; opacity: 0.4; }
    .bk-item-amount { text-align: right; }
    .bk-item-price { font-size: 16px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
    .bk-item-status { font-size: 11px; font-weight: 700; text-transform: capitalize; padding: 4px 10px; border-radius: 20px; }
    .bk-item-status.pending { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
    .bk-item-status.awaiting_payment { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
    .bk-item-status.confirmed { background: rgba(99, 102, 241, 0.1); color: #6366F1; }
    .bk-item-status.in_progress { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .bk-item-status.delivered { background: rgba(139, 92, 246, 0.1); color: #8B5CF6; }
    .bk-item-status.completed { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .bk-item-status.cancelled { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
    
    /* Empty State */
    .bk-empty { text-align: center; padding: 48px 20px; }
    .bk-empty-icon { width: 64px; height: 64px; background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--primary); }
    .bk-empty-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
    .bk-empty-text { font-size: 14px; color: var(--text-secondary); }
    
    /* Modal Styles - Matching Settings/Profile */
    .bk-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 36, 0.6); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .bk-modal { background: var(--surface); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; max-width: 600px; width: 100%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
    [data-theme="dark"] .bk-modal { background: #1E293B; }
    .bk-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .bk-modal-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .bk-modal-close { width: 36px; height: 36px; border-radius: 10px; border: none; background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .bk-modal-close:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .bk-modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    
    /* Journey Tracker */
    .bk-journey { background: rgba(151, 71, 255, 0.03); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 20px; padding: 20px; margin-bottom: 24px; }
    .bk-journey-title { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; text-align: center; margin-bottom: 20px; }
    .bk-journey-track { display: flex; align-items: center; justify-content: space-between; position: relative; }
    .bk-journey-line { position: absolute; top: 14px; left: 10%; right: 10%; height: 2px; background: rgba(255,255,255,0.08); z-index: 0; }
    .bk-journey-line-progress { position: absolute; top: 14px; left: 10%; height: 2px; background: var(--primary); z-index: 0; transition: width 0.3s; }
    .bk-journey-step { display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 1; }
    .bk-journey-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: var(--text-secondary); }
    .bk-journey-step.completed .bk-journey-dot { background: var(--primary); border-color: var(--primary); color: white; }
    .bk-journey-step.active .bk-journey-dot { background: var(--primary); border-color: var(--primary); color: white; box-shadow: 0 0 0 4px rgba(151, 71, 255, 0.2); }
    .bk-journey-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); }
    .bk-journey-step.completed .bk-journey-label, .bk-journey-step.active .bk-journey-label { color: var(--text-primary); }
    
    /* Info Cards in Modal */
    .bk-info-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 20px; }
    .bk-info-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .bk-info-row { display: flex; align-items: center; gap: 12px; }
    .bk-info-avatar { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
    .bk-info-name { font-weight: 700; color: var(--text-primary); font-size: 14px; }
    .bk-info-sub { font-size: 12px; color: var(--text-secondary); }
    .bk-info-amount { font-size: 24px; font-weight: 800; color: var(--primary); }
    .bk-info-amount-sec { font-size: 12px; color: var(--text-secondary); }
    
    /* Action Cards */
    .bk-action-card { background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.15); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
    .bk-action-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .bk-action-icon { width: 36px; height: 36px; background: rgba(151, 71, 255, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
    .bk-action-title { font-weight: 700; color: var(--text-primary); font-size: 14px; }
    .bk-action-text { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5; }
    .bk-action-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .bk-btn { padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
    .bk-btn-primary { background: var(--primary); color: white; }
    .bk-btn-primary:hover { background: #7c3aed; transform: translateY(-1px); }
    .bk-btn-secondary { background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); }
    .bk-btn-secondary:hover { background: rgba(255,255,255,0.08); }
    .bk-btn-success { background: #10B981; color: white; }
    .bk-btn-success:hover { background: #059669; }
    .bk-btn-danger { background: #EF4444; color: white; }
    .bk-btn-danger:hover { background: #DC2626; }
    .bk-btn-full { width: 100%; }
    
    /* Messages */
    .bk-messages { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; }
    .bk-messages-list { max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; padding-right: 8px; }
    .bk-message { display: flex; flex-direction: column; }
    .bk-message-sent { align-items: flex-end; }
    .bk-message-received { align-items: flex-start; }
    .bk-message-bubble { max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 13px; line-height: 1.5; }
    .bk-message-sent .bk-message-bubble { background: rgba(151, 71, 255, 0.15); color: var(--text-primary); border: 1px solid rgba(151, 71, 255, 0.2); border-bottom-right-radius: 4px; }
    .bk-message-received .bk-message-bubble { background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.08); border-bottom-left-radius: 4px; }
    .bk-message-time { font-size: 10px; color: var(--text-secondary); margin-top: 4px; opacity: 0.6; }
    .bk-message-form { display: flex; gap: 10px; }
    .bk-message-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 16px; color: var(--text-primary); font-size: 13px; outline: none; }
    .bk-message-input:focus { border-color: var(--primary); }
    .bk-message-send { width: 44px; height: 44px; background: var(--primary); border: none; border-radius: 12px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .bk-message-send:hover { background: #7c3aed; }
    
    /* Form Elements */
    .bk-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 16px; color: var(--text-primary); font-size: 14px; outline: none; transition: all 0.2s; margin-bottom: 12px; }
    .bk-input:focus { border-color: var(--primary); background: rgba(255,255,255,0.05); }
    .bk-textarea { min-height: 80px; resize: vertical; }
    
    /* Footer */
    .bk-footer { margin-top: 40px; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.06); }
    .bk-footer-content { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 40px; }
    @media (max-width: 768px) { .bk-footer-content { grid-template-columns: 1fr 1fr; gap: 24px; } }
    @media (max-width: 480px) { .bk-footer-content { grid-template-columns: 1fr; } }
    .bk-footer-brand { display: flex; flex-direction: column; gap: 16px; }
    .bk-footer-logo { font-size: 22px; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .bk-footer-tagline { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    .bk-footer-social { display: flex; gap: 12px; }
    .bk-footer-social a { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.2s; }
    .bk-footer-social a:hover { background: var(--primary); color: white; }
    .bk-footer-column h4 { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
    .bk-footer-column a { display: block; font-size: 13px; color: var(--text-secondary); text-decoration: none; margin-bottom: 10px; transition: all 0.2s; }
    .bk-footer-column a:hover { color: var(--primary); }
    .bk-footer-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: var(--text-secondary); }
    .bk-footer-bottom a { color: var(--text-secondary); text-decoration: none; }
    .bk-footer-bottom a:hover { color: var(--primary); }
    .bk-footer-dot { margin: 0 8px; opacity: 0.4; }
</style>
`;

function renderFooter() {
    return `
        <footer class="bk-footer">
            <div class="bk-footer-content">
                <div class="bk-footer-brand">
                    <div class="bk-footer-logo">MyArteLab</div>
                    <p class="bk-footer-tagline">Empowering African creators to showcase their talent and connect with clients worldwide.</p>
                    <div class="bk-footer-social">
                        <a href="https://x.com/myartelab" target="_blank" rel="noopener" aria-label="X (Twitter)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                        <a href="https://www.instagram.com/myartelab_" target="_blank" rel="noopener" aria-label="Instagram">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        </a>
                        <a href="https://linkedin.com/company/myartelab" target="_blank" rel="noopener" aria-label="LinkedIn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        </a>
                    </div>
                </div>
                <div class="bk-footer-column">
                    <h4>Platform</h4>
                    <a href="/#/creators">Find Creators</a>
                    <a href="/#/auth?type=creator">Become a Creator</a>
                    <a href="/#/how-it-works">How it Works</a>
                    <a href="/#/pricing">Pricing</a>
                </div>
                <div class="bk-footer-column">
                    <h4>Company</h4>
                    <a href="/#/about">About Us</a>
                    <a href="/#/careers">Careers</a>
                    <a href="/#/blog">Blog</a>
                    <a href="/#/press">Press</a>
                </div>
                <div class="bk-footer-column">
                    <h4>Support</h4>
                    <a href="/#/help">Help Center</a>
                    <a href="/#/contact">Contact Us</a>
                    <a href="/#/safety">Safety</a>
                </div>
            </div>
            <div class="bk-footer-bottom">
                <span>&copy; 2026 MyArteLab. All rights reserved.</span>
                <div>
                    <a href="/#/privacy">Privacy Policy</a>
                    <span class="bk-footer-dot">•</span>
                    <a href="/#/terms">Terms of Service</a>
                </div>
            </div>
        </footer>
    `;
}

function renderSkeleton() {
    return `
        <div class="bk-container">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px;">
                <div>
                    <div class="skeleton" style="width: 180px; height: 32px; border-radius: 8px; margin-bottom: 8px;"></div>
                    <div class="skeleton" style="width: 240px; height: 16px; border-radius: 6px;"></div>
                </div>
            </div>
            <div class="skeleton" style="height: 160px; border-radius: 24px; margin-bottom: 24px;"></div>
            <div style="display: flex; gap: 8px; margin-bottom: 24px;">
                <div class="skeleton" style="width: 80px; height: 36px; border-radius: 20px;"></div>
                <div class="skeleton" style="width: 100px; height: 36px; border-radius: 20px;"></div>
                <div class="skeleton" style="width: 90px; height: 36px; border-radius: 20px;"></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${Array(4).fill(0).map(() => `
                    <div class="skeleton" style="height: 80px; border-radius: 16px;"></div>
                `).join('')}
            </div>
        </div>
    `;
}

export async function renderBookingsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            ${BOOKINGS_STYLES}
            <div class="bk-container" style="text-align: center; padding-top: 80px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(151,71,255,0.1), rgba(107,70,255,0.1)); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 1px solid rgba(151,71,255,0.15);">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="color: var(--primary);">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <h2 style="margin-bottom: 8px; font-size: 22px; color: var(--text-primary);">Your Bookings</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">Sign in to view and manage your collaborations</p>
                <button class="btn-primary" onclick="showAuthModal('signin')" style="height: 48px; padding: 0 32px; border-radius: 12px;">Sign In</button>
            </div>
        `;
        return;
    }

    mainContent.innerHTML = BOOKINGS_STYLES + renderSkeleton();

    try {
        const [bookingsResp, projectsResp] = await Promise.all([
            api.getBookings(),
            api.getMyProjects()
        ]);

        const regularBookings = bookingsResp.success ? (bookingsResp.data.bookings || []) : [];
        const myProjects = projectsResp.success ? (projectsResp.data.projects || []) : [];
        const activeProjects = myProjects.filter(p => ['awaiting_payment', 'in_progress', 'delivered', 'completed'].includes(p.status));

        const projectsAsJobs = activeProjects.map(p => ({
            ...p,
            _type: 'project',
            serviceTitle: p.title,
            status: p.status,
            amount: p.acceptedAmount || p.budget?.min || 0,
            client: p.clientId,
            creator: p.selectedCreatorId
        }));

        bookings = [...regularBookings, ...projectsAsJobs];
        renderBookingsList();
    } catch (error) {
        console.error('Failed to load bookings:', error);
        mainContent.innerHTML = BOOKINGS_STYLES + `
            <div class="bk-container" style="text-align: center; padding-top: 60px;">
                <div style="width: 64px; height: 64px; background: rgba(239,68,68,0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="color: #EF4444;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <h3 style="margin-bottom: 8px; color: var(--text-primary);">Failed to load bookings</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14px;">${error.message}</p>
                <button class="btn-primary" onclick="window.location.reload()" style="height: 44px; padding: 0 24px; border-radius: 12px;">Try again</button>
            </div>
        `;
    }
}

function renderBookingsList() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    const activeBookings = bookings.filter(b => !['completed', 'cancelled', 'completed_with_escrow'].includes(b.status));
    const completedBookings = bookings.filter(b => ['completed', 'completed_with_escrow'].includes(b.status));

    const totalInEscrow = activeBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

    let displayBookings = bookings;
    if (currentFilter === 'active') {
        displayBookings = activeBookings;
    } else if (currentFilter === 'completed') {
        displayBookings = completedBookings;
    }

    mainContent.innerHTML = BOOKINGS_STYLES + `
        <div class="bk-container">
            <!-- Header -->
            <div>
                <h1 class="bk-title">My Bookings</h1>
                <p class="bk-subtitle">Track and manage your creative collaborations</p>
            </div>

            <!-- Stats Card -->
            <div class="bk-stats-card">
                <div class="bk-stats-header">
                    <div>
                        <div class="bk-stats-label">Total Volume</div>
                        <div class="bk-stats-total">$${(totalEarnings + totalInEscrow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="color: var(--primary); opacity: 0.5;">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="bk-stats-grid">
                    <div class="bk-stat-item">
                        <div class="bk-stat-label">In Progress</div>
                        <div class="bk-stat-value pending">$${totalInEscrow.toFixed(2)}</div>
                    </div>
                    <div class="bk-stat-item">
                        <div class="bk-stat-label">Completed</div>
                        <div class="bk-stat-value completed">$${totalEarnings.toFixed(2)}</div>
                    </div>
                    <div class="bk-stat-item">
                        <div class="bk-stat-label">Total Jobs</div>
                        <div class="bk-stat-value">${bookings.length}</div>
                    </div>
                </div>
            </div>

            <!-- Filter Tabs -->
            <div class="bk-filter-tabs">
                <div class="bk-filter-tab ${currentFilter === 'all' ? 'active' : ''}" onclick="window.filterBookings('all')">All History</div>
                <div class="bk-filter-tab ${currentFilter === 'active' ? 'active' : ''}" onclick="window.filterBookings('active')">In Progress</div>
                <div class="bk-filter-tab ${currentFilter === 'completed' ? 'active' : ''}" onclick="window.filterBookings('completed')">Completed</div>
            </div>

            <!-- Bookings List -->
            ${displayBookings.length > 0 ? `
                <div class="bk-list">
                    ${displayBookings.map(b => buildBookingItemHTML(b)).join('')}
                </div>
            ` : `
                <div class="bk-empty">
                    <div class="bk-empty-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    </div>
                    <div class="bk-empty-title">No bookings found</div>
                    <div class="bk-empty-text">${currentFilter === 'all' ? 'Start by finding a creator or accepting a project' : `No ${currentFilter} bookings yet`}</div>
                </div>
            `}

            ${renderFooter()}
        </div>
    `;
}

function buildBookingItemHTML(booking) {
    const isCreator = appState.user.role === 'creator';
    const otherParty = isCreator ? booking.client : booking.creator;
    const name = otherParty?.name || (isCreator ? 'Client' : 'Creator');
    const avatar = otherParty?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=9747FF&color=fff`;

    const statusClasses = {
        completed: 'completed', in_progress: 'in_progress', confirmed: 'confirmed',
        awaiting_payment: 'awaiting_payment', pending: 'pending', cancelled: 'cancelled',
        delivered: 'delivered'
    };
    const statusClass = statusClasses[booking.status] || 'pending';
    const statusLabel = formatStatus(booking.status);

    return `
        <div class="bk-item" onclick="window.viewBookingDetails('${booking._id}')">
            <div class="bk-item-avatar">
                <img src="${avatar}" alt="${name}">
            </div>
            <div class="bk-item-info">
                <div class="bk-item-title">${booking.serviceTitle || 'Project Collaboration'}</div>
                <div class="bk-item-meta">
                    <span>${name}</span>
                    <span class="bk-item-meta-dot"></span>
                    <span>${formatDate(booking.createdAt)}</span>
                </div>
            </div>
            <div class="bk-item-amount">
                <div class="bk-item-price">$${(booking.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div class="bk-item-status ${statusClass}">${statusLabel}</div>
            </div>
        </div>
    `;
}

window.filterBookings = function (filter) {
    currentFilter = filter;
    renderBookingsList();
};

window.viewBookingDetails = async function (bookingId) {
    try {
        const localItem = bookings.find(b => b._id === bookingId);
        const type = localItem ? localItem._type : 'booking';

        let response;
        if (type === 'project') {
            response = await api.getProject(bookingId);
        } else {
            response = await api.getBookingDetails(bookingId);
        }

        if (response.success) {
            const booking = type === 'project' ? response.data.project : response.data.booking;
            booking._type = type;

            const isCreator = appState.user.role === 'creator';
            const unreadCount = booking.messages?.filter(m => !m.read && m.sender.toString() !== appState.user._id).length || 0;

            // Calculate journey progress
            const journeySteps = ['pending', 'awaiting_payment', 'confirmed', 'delivered', 'completed'];
            const currentIdx = journeySteps.indexOf(booking.status);
            const progressWidth = currentIdx >= 0 ? (currentIdx / (journeySteps.length - 1)) * 80 + 10 : 10;

            const modalContent = `
                <div class="bk-modal-overlay" onclick="if(event.target === this) window.closeBookingModal()">
                    <div class="bk-modal">
                        <div class="bk-modal-header">
                            <span class="bk-modal-title">Booking Details</span>
                            <button class="bk-modal-close" onclick="window.closeBookingModal()">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        
                        <div class="bk-modal-body">
                            <!-- Journey Tracker -->
                            <div class="bk-journey">
                                <div class="bk-journey-title">Project Progress</div>
                                <div class="bk-journey-track">
                                    <div class="bk-journey-line"></div>
                                    <div class="bk-journey-line-progress" style="width: ${progressWidth}%;"></div>
                                    ${[
                                        { key: 'pending', label: 'Request' },
                                        { key: 'awaiting_payment', label: 'Accept' },
                                        { key: 'confirmed', label: 'Pay' },
                                        { key: 'delivered', label: 'Deliver' },
                                        { key: 'completed', label: 'Finish' }
                                    ].map((step, i) => {
                                        const stepIdx = journeySteps.indexOf(step.key);
                                        const isCompleted = stepIdx < currentIdx;
                                        const isActive = step.key === booking.status;
                                        return `
                                            <div class="bk-journey-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
                                                <div class="bk-journey-dot">${isCompleted ? '✓' : i + 1}</div>
                                                <div class="bk-journey-label">${step.label}</div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>

                            <!-- Action Banner -->
                            <div id="bookingActionContainer">
                                ${renderBookingActionBanner(booking, isCreator)}
                            </div>

                            <!-- Info Grid -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                                <div class="bk-info-card">
                                    <div class="bk-info-label">${isCreator ? 'Client' : 'Creator'}</div>
                                    <div class="bk-info-row">
                                        <img src="${(isCreator ? booking.client?.avatar : booking.creator?.avatar) || 'https://ui-avatars.com/api/?name=User'}" class="bk-info-avatar">
                                        <div>
                                            <div class="bk-info-name">${isCreator ? (booking.client?.name || 'Client') : (booking.creator?.name || 'Creator')}</div>
                                            <div class="bk-info-sub">Verified Partner</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="bk-info-card">
                                    <div class="bk-info-label">Amount</div>
                                    <div class="bk-info-amount">$${booking.amount ? booking.amount.toFixed(2) : '0.00'}</div>
                                    <div class="bk-info-amount-sec">Secured in escrow</div>
                                </div>
                            </div>

                            <!-- Service Details -->
                            <div class="bk-info-card" style="margin-bottom: 20px;">
                                <div class="bk-info-label">Service</div>
                                <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 8px 0 4px;">${booking.serviceTitle || 'Project Collaboration'}</h3>
                                <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">${booking.serviceDescription || 'No description provided.'}</p>
                            </div>

                            <!-- Messages -->
                            <div>
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                    <span class="bk-info-label" style="margin: 0;">Messages</span>
                                    ${unreadCount > 0 ? `<span style="background: var(--primary); color: white; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">${unreadCount} NEW</span>` : ''}
                                </div>
                                <div class="bk-messages">
                                    <div class="bk-messages-list" id="messagesContainer">
                                        ${booking.messages && booking.messages.length > 0 ?
                                            booking.messages.map(msg => {
                                                const isMine = msg.sender.toString() === appState.user._id;
                                                return `
                                                    <div class="bk-message ${isMine ? 'bk-message-sent' : 'bk-message-received'}">
                                                        <div class="bk-message-bubble">${msg.message}</div>
                                                        <div class="bk-message-time">${formatDate(msg.createdAt)}</div>
                                                    </div>
                                                `;
                                            }).join('') :
                                            '<div style="text-align: center; padding: 40px; color: var(--text-secondary); font-size: 13px;">No messages yet. Start the conversation!</div>'
                                        }
                                    </div>
                                    <form class="bk-message-form" onsubmit="window.sendBookingMessage(event, '${booking._id}', '${booking._type}')">
                                        <input type="text" id="messageInput" class="bk-message-input" placeholder="Type your message..." required>
                                        <button type="submit" class="bk-message-send">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalContent);
            document.body.style.overflow = 'hidden';

            // Scroll to bottom of messages
            const msgContainer = document.getElementById('messagesContainer');
            if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    } catch (e) {
        console.error('Error viewing details:', e);
        showToast('Failed to load details', 'error');
    }
};

window.closeBookingModal = function () {
    const modal = document.querySelector('.bk-modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
};

function renderBookingActionBanner(booking, isCreator) {
    if (booking.status === 'pending' && isCreator) {
        return `
            <div class="bk-action-card">
                <div class="bk-action-header">
                    <div class="bk-action-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div class="bk-action-title">Awaiting Your Response</div>
                </div>
                <p class="bk-action-text">Review the job details. Once accepted, the client will deposit funds into escrow.</p>
                <div class="bk-action-buttons" id="actionButtons">
                    <button class="bk-btn bk-btn-primary" onclick="window.acceptBookingRequest('${booking._id}')">Accept Job</button>
                    <button class="bk-btn bk-btn-secondary" onclick="window.showCounterProposalForm('${booking._id}')">Counter Offer</button>
                </div>
            </div>
        `;
    }

    if (booking.status === 'awaiting_payment' && !isCreator) {
        return `
            <div class="bk-action-card" style="background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.15);">
                <div class="bk-action-header">
                    <div class="bk-action-icon" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    </div>
                    <div class="bk-action-title">Creator Accepted!</div>
                </div>
                <p class="bk-action-text">The creator is ready to start. Deposit funds to secure them in escrow.</p>
                <button class="bk-btn bk-btn-primary bk-btn-full" style="height: 48px;" onclick="window.processBookingPayment('${booking._id}', '${booking._type}')">
                    Pay $${booking.amount.toFixed(2)}
                </button>
            </div>
        `;
    }

    if (booking.status === 'in_progress' && isCreator) {
        return `
            <div class="bk-action-card" style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.15);">
                <div class="bk-action-header">
                    <div class="bk-action-icon" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    </div>
                    <div class="bk-action-title">Job In Progress</div>
                </div>
                <p class="bk-action-text">Funds are secured in escrow. Submit your work link when finished.</p>
                <div style="margin-bottom: 12px;">
                    <input type="url" id="deliverableUrl" class="bk-input" placeholder="Work URL (Google Drive/Dropbox link)">
                    <textarea id="deliverableNotes" class="bk-input bk-textarea" placeholder="Additional notes for the client..."></textarea>
                </div>
                <button class="bk-btn bk-btn-success bk-btn-full" style="height: 44px;" onclick="window.submitDeliverable('${booking._id}', '${booking._type}')">
                    Submit Work
                </button>
            </div>
        `;
    }

    if (booking.status === 'delivered' && !isCreator) {
        return `
            <div class="bk-action-card" style="background: rgba(139, 92, 246, 0.05); border-color: rgba(139, 92, 246, 0.15);">
                <div class="bk-action-header">
                    <div class="bk-action-icon" style="background: rgba(139, 92, 246, 0.1); color: #8B5CF6;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    </div>
                    <div class="bk-action-title">Work Submitted!</div>
                </div>
                <p class="bk-action-text">The creator has finished. Review and approve to release escrowed funds.</p>
                <div class="bk-action-buttons">
                    <a href="${booking.attachments?.[0]?.url || '#'}" target="_blank" class="bk-btn bk-btn-secondary" style="text-decoration: none;">Review Work</a>
                    <button class="bk-btn bk-btn-success" onclick="window.releasePayment('${booking._id}', '${booking._type}')">Release Payment</button>
                </div>
            </div>
        `;
    }

    return '';
}

window.completeBooking = async function (bookingId) {
    if (!confirm('Are you sure you want to mark this booking as completed?')) return;

    try {
        const response = await api.completeBooking(bookingId);

        if (response.success) {
            window.closeBookingModal();
            await renderBookingsPage();
            showToast('Booking completed!', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to complete booking', 'error');
    }
};

window.releasePayment = async function (bookingId, type = 'booking') {
    if (!confirm('Release payment to the creator?')) return;

    try {
        let response;
        if (type === 'project') {
            response = await api.releaseProjectFunds(bookingId);
        } else {
            response = await api.releasePayment(bookingId);
        }

        if (response.success) {
            window.closeBookingModal();
            await renderBookingsPage();
            showToast('Payment released!', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to release payment', 'error');
    }
};

window.processBookingPayment = async function (bookingId, type = 'booking') {
    try {
        showToast('Processing payment...', 'info');

        let response;
        if (type === 'project') {
            response = await api.payProject(bookingId);
        } else {
            response = await api.payBooking(bookingId);
        }

        if (response.success) {
            window.closeBookingModal();
            await renderBookingsPage();
            showToast('Payment successful! Creator can start work.', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Payment failed. Check your wallet balance.', 'error');
    }
};

window.submitDeliverable = async function (bookingId, type = 'booking') {
    const url = document.getElementById('deliverableUrl').value.trim();
    const message = document.getElementById('deliverableNotes').value.trim();

    if (!url) {
        showToast('Please provide a work link', 'error');
        return;
    }

    try {
        let response;
        if (type === 'project') {
            response = await api.submitProjectDeliverable(bookingId, { url, message });
        } else {
            response = await api.submitBookingDeliverable(bookingId, { url, message });
        }

        if (response.success) {
            window.closeBookingModal();
            await renderBookingsPage();
            showToast('Work submitted!', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to submit work', 'error');
    }
};

window.sendBookingMessage = async function (event, bookingId, type = 'booking') {
    event.preventDefault();
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    try {
        let response;
        if (type === 'project') {
            response = await api.addProjectMessage(bookingId, message);
        } else {
            response = await api.addBookingMessage(bookingId, message);
        }

        if (response.success) {
            await window.viewBookingDetails(bookingId);
            showToast('Message sent!', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to send message', 'error');
    }
};

window.acceptBookingRequest = async function (bookingId) {
    if (!confirm('Accept this booking?')) return;

    try {
        const response = await api.acceptBooking(bookingId);

        if (response.success) {
            window.closeBookingModal();
            await renderBookingsPage();
            showToast('Booking accepted! Client notified.', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to accept booking', 'error');
    }
};

window.showRejectForm = function (bookingId) {
    document.getElementById('rejectForm')?.remove();
    document.getElementById('counterProposalForm')?.remove();

    document.getElementById('actionButtons').style.display = 'none';
    const rejectHtml = `
        <div id="rejectForm" style="margin-top: 16px; padding: 20px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 16px;">
            <div style="font-weight: 700; color: #EF4444; margin-bottom: 8px;">Decline Booking</div>
            <textarea id="rejectReason" class="bk-input bk-textarea" placeholder="Reason for declining (optional)" style="margin-bottom: 12px;"></textarea>
            <div class="bk-action-buttons">
                <button class="bk-btn bk-btn-danger" onclick="window.submitRejection('${bookingId}', document.getElementById('rejectReason').value)">Confirm Decline</button>
                <button class="bk-btn bk-btn-secondary" onclick="document.getElementById('rejectForm').remove(); document.getElementById('actionButtons').style.display='grid';">Cancel</button>
            </div>
        </div>
    `;
    document.getElementById('actionButtons').insertAdjacentHTML('afterend', rejectHtml);
};

window.submitRejection = async function (bookingId, reason) {
    try {
        const response = await api.rejectBooking(bookingId, reason || '');

        if (response.success) {
            window.closeBookingModal();
            await renderBookingsPage();
            showToast('Booking declined', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to decline', 'error');
    }
};

window.showCounterProposalForm = function (bookingId) {
    document.getElementById('rejectForm')?.remove();
    document.getElementById('counterProposalForm')?.remove();

    document.getElementById('actionButtons').style.display = 'none';
    const counterHtml = `
        <div id="counterProposalForm" style="margin-top: 16px; padding: 20px; background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.15); border-radius: 16px;">
            <div style="font-weight: 700; color: var(--primary); margin-bottom: 8px;">Counter Offer</div>
            <div style="position: relative; margin-bottom: 12px;">
                <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-weight: 600;">$</span>
                <input type="number" id="counterAmount" class="bk-input" placeholder="0.00" style="padding-left: 32px; height: 48px; font-size: 16px; font-weight: 700;">
            </div>
            <div class="bk-action-buttons">
                <button class="bk-btn bk-btn-primary" onclick="window.submitCounterProposal('${bookingId}', document.getElementById('counterAmount').value)">Send Offer</button>
                <button class="bk-btn bk-btn-secondary" onclick="document.getElementById('counterProposalForm').remove(); document.getElementById('actionButtons').style.display='grid';">Cancel</button>
            </div>
        </div>
    `;
    document.getElementById('actionButtons').insertAdjacentHTML('afterend', counterHtml);
    setTimeout(() => document.getElementById('counterAmount').focus(), 100);
};

window.submitCounterProposal = async function (bookingId, amount) {
    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        const response = await api.counterProposal(bookingId, parsedAmount);

        if (response.success) {
            window.closeBookingModal();
            await renderBookingsPage();
            showToast('Counter offer sent!', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to send offer', 'error');
    }
};
