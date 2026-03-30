import { appState } from '../state.js';
import { formatDate, showToast } from '../utils.js';
import api from '../services/api.js';

let walletData = null;
let transactions = [];
let escrowProjects = [];

const WALLET_STYLES = `
<style>
    .w-container { max-width: 680px; margin: 0 auto; padding: 32px 20px 60px; display: flex; flex-direction: column; gap: 32px; }
    @media (max-width: 768px) { .w-container { padding: 24px 16px; } }
    
    .w-title { font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .w-subtitle { color: var(--text-secondary); font-size: 15px; margin: 0; }
    
    .w-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 24px; }
    .w-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    
    /* Main Balance Card - Premium Gradient */
    .w-balance-card { 
        background: linear-gradient(135deg, rgba(151, 71, 255, 0.15) 0%, rgba(107, 70, 255, 0.1) 100%); 
        border: 1px solid rgba(151, 71, 255, 0.2); 
        border-radius: 24px; 
        padding: 28px; 
        position: relative; 
        overflow: hidden;
    }
    .w-balance-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .w-balance-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; }
    .w-balance-icon { width: 40px; height: 40px; background: rgba(151, 71, 255, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
    .w-balance-amount { font-size: 36px; font-weight: 800; color: var(--text-primary); margin-bottom: 24px; }
    .w-balance-btn { 
        display: inline-flex; align-items: center; gap: 8px;
        padding: 14px 28px; background: var(--primary); color: white;
        border: none; border-radius: 12px; font-size: 14px; font-weight: 700;
        cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(151, 71, 255, 0.3);
    }
    .w-balance-btn:hover { background: #7c3aed; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(151, 71, 255, 0.4); }
    
    /* Stats Grid */
    .w-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); }
    .w-stat-label { font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; }
    .w-stat-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .w-stat-value.available { color: #10B981; }
    .w-stat-value.escrow { color: #F59E0B; }
    
    /* Escrow Projects */
    .w-list { display: flex; flex-direction: column; gap: 12px; }
    .w-item { 
        display: flex; align-items: center; gap: 16px;
        background: rgba(255,255,255,0.03); 
        border: 1px solid rgba(255,255,255,0.06); 
        border-radius: 16px; 
        padding: 16px;
        cursor: pointer; transition: all 0.2s;
    }
    .w-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(151, 71, 255, 0.2); transform: translateY(-2px); }
    .w-item-icon { 
        width: 48px; height: 48px; border-radius: 14px;
        background: rgba(245, 158, 11, 0.1);
        display: flex; align-items: center; justify-content: center;
        color: #F59E0B; flex-shrink: 0;
    }
    .w-item-info { flex: 1; min-width: 0; }
    .w-item-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .w-item-meta { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; }
    .w-item-meta-dot { width: 4px; height: 4px; background: var(--text-secondary); border-radius: 50%; opacity: 0.4; }
    .w-item-amount { text-align: right; }
    .w-item-price { font-size: 16px; font-weight: 800; color: #F59E0B; margin-bottom: 4px; }
    .w-item-status { font-size: 11px; font-weight: 700; text-transform: capitalize; padding: 4px 10px; border-radius: 20px; background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
    
    /* Transactions */
    .w-tx-list { display: flex; flex-direction: column; gap: 8px; }
    .w-tx-item { 
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px;
        background: rgba(255,255,255,0.02); 
        border: 1px solid rgba(255,255,255,0.04); 
        border-radius: 12px;
        transition: all 0.2s;
    }
    .w-tx-item:hover { background: rgba(255,255,255,0.04); }
    .w-tx-icon { 
        width: 40px; height: 40px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
    }
    .w-tx-icon.income { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .w-tx-icon.expense { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
    .w-tx-info { flex: 1; min-width: 0; }
    .w-tx-desc { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
    .w-tx-date { font-size: 12px; color: var(--text-secondary); }
    .w-tx-amount { font-weight: 700; font-size: 14px; }
    .w-tx-amount.income { color: #10B981; }
    .w-tx-amount.expense { color: #EF4444; }
    .w-tx-status { 
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        padding: 4px 10px; border-radius: 20px;
    }
    .w-tx-status.completed { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .w-tx-status.pending { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
    .w-tx-status.withdrawn { background: rgba(100, 116, 139, 0.1); color: #64748B; }
    
    /* Payout Methods */
    .w-payout-list { display: flex; flex-direction: column; gap: 10px; }
    .w-payout-item { 
        display: flex; align-items: center; gap: 14px;
        background: rgba(255,255,255,0.03); 
        border: 1px solid rgba(255,255,255,0.06); 
        border-radius: 14px; 
        padding: 14px 16px;
        transition: all 0.2s;
    }
    .w-payout-item:hover { background: rgba(255,255,255,0.05); }
    .w-payout-icon { 
        width: 44px; height: 44px; border-radius: 12px;
        background: rgba(255,255,255,0.05);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
    }
    .w-payout-info { flex: 1; }
    .w-payout-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .w-payout-detail { font-size: 12px; color: var(--text-secondary); }
    .w-payout-badge { font-size: 10px; font-weight: 700; color: #10B981; background: rgba(16, 185, 129, 0.1); padding: 4px 10px; border-radius: 20px; }
    .w-payout-add { 
        display: flex; align-items: center; justify-content: center; gap: 8px;
        padding: 14px 16px; margin-top: 12px;
        background: transparent;
        border: 1px dashed rgba(151, 71, 255, 0.3); 
        border-radius: 12px; 
        color: var(--primary);
        font-size: 14px; font-weight: 600;
        cursor: pointer; width: 100%;
        transition: all 0.2s;
    }
    .w-payout-add:hover { border-color: var(--primary); background: rgba(151, 71, 255, 0.05); }
    
    /* Protection Card */
    .w-protection { 
        background: rgba(16, 185, 129, 0.05); 
        border: 1px solid rgba(16, 185, 129, 0.15); 
        border-radius: 16px; 
        padding: 20px;
        display: flex; gap: 16px;
    }
    .w-protection-icon { 
        width: 48px; height: 48px; border-radius: 12px;
        background: rgba(16, 185, 129, 0.1);
        display: flex; align-items: center; justify-content: center;
        color: #10B981; flex-shrink: 0;
    }
    .w-protection-content { flex: 1; }
    .w-protection-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
    .w-protection-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 8px; }
    .w-protection-link { font-size: 13px; color: var(--primary); font-weight: 600; cursor: pointer; }
    .w-protection-link:hover { text-decoration: underline; }
    
    /* Empty State */
    .w-empty { text-align: center; padding: 48px 20px; }
    .w-empty-icon { width: 64px; height: 64px; background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--primary); }
    .w-empty-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
    .w-empty-text { font-size: 14px; color: var(--text-secondary); }
    
    /* Section Header with Link */
    .w-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .w-section-link { font-size: 13px; color: var(--primary); font-weight: 600; cursor: pointer; }
    .w-section-link:hover { text-decoration: underline; }
    
    /* Footer */
    .w-footer { margin-top: 40px; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.06); }
    .w-footer-content { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 40px; }
    @media (max-width: 768px) { .w-footer-content { grid-template-columns: 1fr 1fr; gap: 24px; } }
    @media (max-width: 480px) { .w-footer-content { grid-template-columns: 1fr; } }
    .w-footer-brand { display: flex; flex-direction: column; gap: 16px; }
    .w-footer-logo { font-size: 22px; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .w-footer-tagline { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    .w-footer-social { display: flex; gap: 12px; }
    .w-footer-social a { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.2s; }
    .w-footer-social a:hover { background: var(--primary); color: white; }
    .w-footer-column h4 { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
    .w-footer-column a { display: block; font-size: 13px; color: var(--text-secondary); text-decoration: none; margin-bottom: 10px; transition: all 0.2s; }
    .w-footer-column a:hover { color: var(--primary); }
    .w-footer-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: var(--text-secondary); }
    .w-footer-bottom a { color: var(--text-secondary); text-decoration: none; }
    .w-footer-bottom a:hover { color: var(--primary); }
    .w-footer-dot { margin: 0 8px; opacity: 0.4; }
</style>
`;

function renderFooter() {
    return `
        <footer class="w-footer">
            <div class="w-footer-content">
                <div class="w-footer-brand">
                    <div class="w-footer-logo">MyArteLab</div>
                    <p class="w-footer-tagline">Empowering African creators to showcase their talent and connect with clients worldwide.</p>
                    <div class="w-footer-social">
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
                <div class="w-footer-column">
                    <h4>Platform</h4>
                    <a href="/#/creators">Find Creators</a>
                    <a href="/#/auth?type=creator">Become a Creator</a>
                    <a href="/#/how-it-works">How it Works</a>
                    <a href="/#/pricing">Pricing</a>
                </div>
                <div class="w-footer-column">
                    <h4>Company</h4>
                    <a href="/#/about">About Us</a>
                    <a href="/#/careers">Careers</a>
                    <a href="/#/blog">Blog</a>
                    <a href="/#/press">Press</a>
                </div>
                <div class="w-footer-column">
                    <h4>Support</h4>
                    <a href="/#/help">Help Center</a>
                    <a href="/#/contact">Contact Us</a>
                    <a href="/#/safety">Safety</a>
                </div>
            </div>
            <div class="w-footer-bottom">
                <span>&copy; 2026 MyArteLab. All rights reserved.</span>
                <div>
                    <a href="/#/privacy">Privacy Policy</a>
                    <span class="w-footer-dot">|</span>
                    <a href="/#/terms">Terms of Service</a>
                </div>
            </div>
        </footer>
    `;
}

function renderSkeleton() {
    return `
        <div class="w-container">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px;">
                <div>
                    <div class="skeleton" style="width: 140px; height: 32px; border-radius: 8px; margin-bottom: 8px;"></div>
                    <div class="skeleton" style="width: 220px; height: 16px; border-radius: 6px;"></div>
                </div>
            </div>
            <div class="skeleton" style="height: 220px; border-radius: 24px; margin-bottom: 24px;"></div>
            <div class="skeleton" style="height: 280px; border-radius: 24px; margin-bottom: 24px;"></div>
            <div class="skeleton" style="height: 200px; border-radius: 24px;"></div>
        </div>
    `;
}

export async function renderWalletPage() {
    const mainContent = document.getElementById('mainContent');
    
    if (!appState.user) {
        mainContent.innerHTML = `
            ${WALLET_STYLES}
            <div class="w-container" style="text-align: center; padding-top: 80px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(151,71,255,0.1), rgba(107,70,255,0.1)); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 1px solid rgba(151,71,255,0.15);">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="color: var(--primary);">
                        <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" stroke="currentColor" stroke-width="2"/>
                        <path d="M18 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <h2 style="margin-bottom: 8px; font-size: 22px; color: var(--text-primary);">Your Wallet</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">Sign in to manage your earnings and withdrawals</p>
                <button class="btn-primary" onclick="showAuthModal('signin')" style="height: 48px; padding: 0 32px; border-radius: 12px;">Sign In</button>
            </div>
        `;
        return;
    }
    
    mainContent.innerHTML = WALLET_STYLES + renderSkeleton();
    
    try {
        const [walletRes, txRes, bookingsRes] = await Promise.all([
            api.getHostfiWallet?.() || Promise.resolve({ success: false }),
            api.getHostfiTransactions?.(1, 10) || Promise.resolve({ success: false }),
            api.getMyBookings?.() || Promise.resolve({ success: false })
        ]);
        
        walletData = walletRes.success ? walletRes.data.wallet : { balance: 0, totalEarnings: 0, inEscrow: 0 };
        transactions = txRes.success ? (txRes.data?.transactions || []) : [];
        
        const bookings = bookingsRes.success ? (bookingsRes.data?.bookings || []) : [];
        escrowProjects = bookings.filter(b => ['confirmed', 'in_progress', 'delivered'].includes(b.status));
        
        mainContent.innerHTML = WALLET_STYLES + buildWalletHTML();
    } catch (error) {
        mainContent.innerHTML = WALLET_STYLES + `
            <div class="w-container" style="text-align: center; padding-top: 60px;">
                <div style="width: 64px; height: 64px; background: rgba(239,68,68,0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="color: #EF4444;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <h3 style="margin-bottom: 8px; color: var(--text-primary);">Failed to load wallet</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14px;">${error.message}</p>
                <button class="btn-primary" onclick="window.renderWalletPage()" style="height: 44px; padding: 0 24px; border-radius: 12px;">Try Again</button>
            </div>
        `;
    }
}

function buildWalletHTML() {
    const totalEarnings = walletData?.totalEarnings || 0;
    const available = walletData?.balance || 0;
    const inEscrow = walletData?.inEscrow || escrowProjects.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return `
        <div class="w-container">
            <!-- Header -->
            <div>
                <h1 class="w-title">My Wallet</h1>
                <p class="w-subtitle">Manage your earnings, withdrawals, and transactions</p>
            </div>
            
            <!-- Balance Card -->
            <div class="w-balance-card">
                <div class="w-balance-header">
                    <span class="w-balance-label">Total Earnings</span>
                    <div class="w-balance-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
                <div class="w-balance-amount">$${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style="display: flex; gap: 12px;">
                    <button class="w-balance-btn" onclick="window.showAddFundsModal()" style="flex: 1; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                        Add Funds
                    </button>
                    <button class="w-balance-btn" onclick="window.showWithdrawModal?.() || showToast('Withdraw feature coming soon', 'info')" style="flex: 1;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                        Withdraw
                    </button>
                </div>
                
                <div class="w-stats-grid">
                    <div class="w-stat-item">
                        <div class="w-stat-label">Available Balance</div>
                        <div class="w-stat-value available">$${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div class="w-stat-item">
                        <div class="w-stat-label">In Escrow</div>
                        <div class="w-stat-value escrow">$${inEscrow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                </div>
            </div>
            
            <!-- Active Escrow Projects -->
            <div class="w-section">
                <div class="w-section-header">
                    <h2 class="w-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Active Escrow Projects
                    </h2>
                    ${escrowProjects.length > 0 ? '<span class="w-section-link" onclick="window.navigateToPage(\'bookings\')">View All</span>' : ''}
                </div>
                
                ${escrowProjects.length > 0 ? `
                    <div class="w-list">
                        ${escrowProjects.slice(0, 3).map(p => `
                            <div class="w-item" onclick="window.viewBookingDetails?.('${p._id}')">
                                <div class="w-item-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                </div>
                                <div class="w-item-info">
                                    <div class="w-item-title">${p.serviceTitle || 'Project'}</div>
                                    <div class="w-item-meta">
                                        <span>${p.client?.name || 'Client'}</span>
                                        <span class="w-item-meta-dot"></span>
                                        <span>${formatStatus(p.status)}</span>
                                    </div>
                                </div>
                                <div class="w-item-amount">
                                    <div class="w-item-price">$${(p.amount || 0).toLocaleString()}</div>
                                    <div class="w-item-status">In Escrow</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="w-empty">
                        <div class="w-empty-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </div>
                        <div class="w-empty-title">No Active Projects</div>
                        <div class="w-empty-text">Your escrow projects will appear here</div>
                    </div>
                `}
            </div>
            
            <!-- Recent Transactions -->
            <div class="w-section">
                <div class="w-section-header">
                    <h2 class="w-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        Recent Transactions
                    </h2>
                    <span class="w-section-link">Export CSV</span>
                </div>
                
                ${transactions.length > 0 ? `
                    <div class="w-tx-list">
                        ${transactions.slice(0, 5).map(tx => {
                            const isCredit = ['deposit', 'earning', 'bonus', 'refund', 'escrow_release'].includes(tx.type);
                            const amount = tx.usdEquivalent || tx.amount || 0;
                            const status = tx.status || 'completed';
                            
                            // Clear transaction type labels
                            const typeLabels = {
                                'deposit': 'Wallet Deposit',
                                'earning': 'Job Earning',
                                'bonus': 'Bonus',
                                'refund': 'Refund',
                                'withdrawal': 'Withdrawal',
                                'escrow_deposit': 'Escrow Deposit',
                                'escrow_release': 'Escrow Released',
                                'payment': 'Payment Sent'
                            };
                            
                            const typeLabel = typeLabels[tx.type] || tx.description || 'Transaction';
                            const desc = tx.description && tx.description !== tx.type ? tx.description : typeLabel;
                            
                            return `
                                <div class="w-tx-item">
                                    <div class="w-tx-icon ${isCredit ? 'income' : 'expense'}">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                            ${isCredit 
                                                ? '<path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round"/>' 
                                                : '<path d="M12 5v14M5 12l7 7 7-7" stroke-linecap="round"/>'
                                            }
                                        </svg>
                                    </div>
                                    <div class="w-tx-info">
                                        <div class="w-tx-desc">${desc}</div>
                                        <div class="w-tx-date">${formatShortDate(tx.createdAt)} • USD</div>
                                    </div>
                                    <div class="w-tx-amount ${isCredit ? 'income' : 'expense'}">${isCredit ? '+' : '-'}$${Math.abs(amount).toFixed(2)} USD</div>
                                    <span class="w-tx-status ${status}">${status}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `
                    <div class="w-empty" style="padding: 32px 20px;">
                        <div class="w-empty-icon" style="width: 56px; height: 56px;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                        <div class="w-empty-title">No Transactions Yet</div>
                        <div class="w-empty-text">Your transaction history will appear here</div>
                    </div>
                `}
            </div>
            
            <!-- Payout Methods -->
            <div class="w-section">
                <h2 class="w-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5">
                        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                    Payout Methods
                </h2>
                
                <div class="w-payout-list">
                    <div class="w-payout-item">
                        <div class="w-payout-icon" style="color: #3B82F6;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="2" y1="12" x2="22" y2="12"/>
                            </svg>
                        </div>
                        <div class="w-payout-info">
                            <div class="w-payout-name">Bank Account</div>
                            <div class="w-payout-detail">**** 4291</div>
                        </div>
                        <span class="w-payout-badge">Default</span>
                    </div>
                    
                    <div class="w-payout-item">
                        <div class="w-payout-icon" style="color: #8B5CF6;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="w-payout-info">
                            <div class="w-payout-name">USDC Wallet</div>
                            <div class="w-payout-detail">Crypto</div>
                        </div>
                    </div>
                </div>
                
                <button class="w-payout-add" onclick="showToast('Add payment method coming soon', 'info')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
                    Add Payment Method
                </button>
            </div>
            
            <!-- Escrow Protection -->
            <div class="w-protection">
                <div class="w-protection-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                </div>
                <div class="w-protection-content">
                    <div class="w-protection-title">Escrow Protection</div>
                    <div class="w-protection-text">Your funds are secured in an independent escrow account. Payment is guaranteed once deliverables are approved.</div>
                    <span class="w-protection-link">Learn how it works</span>
                </div>
            </div>
            
            ${renderFooter()}
        </div>
    `;
}

function formatStatus(status) {
    const map = {
        'confirmed': 'Confirmed',
        'in_progress': 'In Progress',
        'delivered': 'Delivered',
        'pending': 'Pending',
        'awaiting_payment': 'Awaiting Payment'
    };
    return map[status] || status;
}

function formatShortDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

window.renderWalletPage = renderWalletPage;

// Wallet polling functions for auto-refresh
let walletPollingInterval = null;

export function startWalletPolling() {
    // Poll wallet data every 30 seconds when on wallet page
    if (walletPollingInterval) clearInterval(walletPollingInterval);
    walletPollingInterval = setInterval(() => {
        // Silent refresh of wallet data
        if (appState.user && typeof api?.getHostfiWallet === 'function') {
            api.getHostfiWallet().then(res => {
                if (res.success) walletData = res.data.wallet;
            }).catch(() => {});
        }
    }, 30000);
}

export function stopWalletPolling() {
    if (walletPollingInterval) {
        clearInterval(walletPollingInterval);
        walletPollingInterval = null;
    }
}
