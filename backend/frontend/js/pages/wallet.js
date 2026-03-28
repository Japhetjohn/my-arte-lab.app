import { appState } from '../state.js';
import { formatDate, showToast } from '../utils.js';
import api from '../services/api.js';

let walletData = null;
let transactions = [];
let escrowProjects = [];

const WALLET_STYLES = `
<style>
    .w-container { max-width: 900px; margin: 0 auto; padding: 24px 16px 60px; }
    @media (min-width: 768px) { .w-container { padding: 32px 24px 60px; } }
    
    /* Header Stats Grid */
    .w-stats-grid { display: grid; gap: 16px; margin-bottom: 32px; }
    @media (min-width: 640px) { .w-stats-grid { grid-template-columns: 1.2fr 1fr; } }
    
    /* Main Earnings Card */
    .w-earnings-card { 
        background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%); 
        border-radius: 20px; 
        padding: 28px; 
        color: white;
        position: relative;
        overflow: hidden;
    }
    .w-earnings-card::before {
        content: '';
        position: absolute;
        top: -30%;
        right: -20%;
        width: 200px;
        height: 200px;
        background: rgba(255,255,255,0.08);
        border-radius: 50%;
    }
    .w-earnings-label { font-size: 12px; font-weight: 600; text-transform: uppercase; opacity: 0.8; margin-bottom: 8px; }
    .w-earnings-amount { font-size: 36px; font-weight: 800; margin-bottom: 20px; }
    .w-earnings-btn { 
        display: inline-flex; align-items: center; gap: 8px;
        padding: 12px 24px; background: white; color: #7C3AED;
        border: none; border-radius: 10px; font-size: 14px; font-weight: 700;
        cursor: pointer; transition: all 0.2s;
    }
    .w-earnings-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
    
    /* Side Stats */
    .w-side-stats { display: grid; gap: 12px; }
    @media (min-width: 640px) { .w-side-stats { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 768px) { .w-side-stats { grid-template-rows: 1fr 1fr; } }
    
    .w-stat-card { 
        background: rgba(255,255,255,0.03); 
        border: 1px solid rgba(255,255,255,0.06); 
        border-radius: 16px; 
        padding: 20px;
        display: flex; flex-direction: column; justify-content: center;
    }
    .w-stat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .w-stat-dot { width: 8px; height: 8px; border-radius: 50%; }
    .w-stat-dot.available { background: #10B981; }
    .w-stat-dot.escrow { background: #F59E0B; }
    .w-stat-label { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
    .w-stat-value { font-size: 24px; font-weight: 800; color: var(--text-primary); }
    .w-stat-sub { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
    
    /* Section Headers */
    .w-section { margin-bottom: 32px; }
    .w-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .w-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .w-section-link { font-size: 13px; color: var(--primary); font-weight: 600; cursor: pointer; }
    .w-section-link:hover { text-decoration: underline; }
    
    /* Escrow Projects */
    .w-escrow-list { display: flex; flex-direction: column; gap: 12px; }
    .w-escrow-item { 
        display: flex; align-items: center; gap: 16px;
        background: rgba(255,255,255,0.02); 
        border: 1px solid rgba(255,255,255,0.05); 
        border-radius: 16px; 
        padding: 16px 20px;
    }
    .w-escrow-icon { 
        width: 44px; height: 44px; border-radius: 12px;
        background: rgba(245, 158, 11, 0.1);
        display: flex; align-items: center; justify-content: center;
        color: #F59E0B; flex-shrink: 0;
    }
    .w-escrow-info { flex: 1; min-width: 0; }
    .w-escrow-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .w-escrow-meta { font-size: 12px; color: var(--text-secondary); }
    .w-escrow-amount { text-align: right; }
    .w-escrow-value { font-size: 16px; font-weight: 800; color: #F59E0B; }
    .w-escrow-status { font-size: 11px; color: var(--text-secondary); }
    
    /* Payout Methods */
    .w-payout-list { display: flex; flex-direction: column; gap: 10px; }
    .w-payout-item { 
        display: flex; align-items: center; gap: 14px;
        background: rgba(255,255,255,0.02); 
        border: 1px solid rgba(255,255,255,0.05); 
        border-radius: 12px; 
        padding: 14px 16px;
    }
    .w-payout-icon { 
        width: 40px; height: 40px; border-radius: 10px;
        background: rgba(255,255,255,0.05);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
    }
    .w-payout-info { flex: 1; }
    .w-payout-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .w-payout-detail { font-size: 12px; color: var(--text-secondary); }
    .w-payout-add { 
        display: flex; align-items: center; gap: 8px;
        padding: 12px 16px; margin-top: 12px;
        background: transparent;
        border: 1px dashed rgba(255,255,255,0.15); 
        border-radius: 12px; 
        color: var(--text-secondary);
        font-size: 14px; font-weight: 600;
        cursor: pointer; width: 100%;
    }
    .w-payout-add:hover { border-color: var(--primary); color: var(--primary); }
    
    /* Transactions Table */
    .w-tx-table { width: 100%; }
    .w-tx-header { 
        display: grid; grid-template-columns: 100px 1fr 100px 80px;
        gap: 12px; padding: 12px 16px;
        font-size: 11px; font-weight: 700; color: var(--text-secondary);
        text-transform: uppercase; letter-spacing: 0.05em;
        border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .w-tx-row { 
        display: grid; grid-template-columns: 100px 1fr 100px 80px;
        gap: 12px; padding: 16px;
        font-size: 14px;
        border-bottom: 1px solid rgba(255,255,255,0.04);
        align-items: center;
    }
    .w-tx-row:hover { background: rgba(255,255,255,0.02); }
    .w-tx-date { color: var(--text-secondary); font-size: 13px; }
    .w-tx-desc { color: var(--text-primary); font-weight: 500; }
    .w-tx-amount { font-weight: 700; }
    .w-tx-amount.positive { color: #10B981; }
    .w-tx-amount.negative { color: #EF4444; }
    .w-tx-status { 
        display: inline-block; padding: 4px 10px; border-radius: 20px;
        font-size: 11px; font-weight: 700; text-transform: uppercase;
    }
    .w-tx-status.released { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .w-tx-status.pending { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
    .w-tx-status.withdrawn { background: rgba(100, 116, 139, 0.1); color: #64748B; }
    
    /* Escrow Protection Box */
    .w-protection { 
        background: rgba(255,255,255,0.02); 
        border: 1px solid rgba(255,255,255,0.06); 
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
    
    /* Two Column Layout */
    .w-two-col { display: grid; gap: 24px; }
    @media (min-width: 768px) { .w-two-col { grid-template-columns: 1fr 320px; } }
    
    /* Empty State */
    .w-empty { text-align: center; padding: 40px 20px; }
    .w-empty-icon { width: 56px; height: 56px; background: rgba(255,255,255,0.05); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--text-secondary); }
</style>
`;

function renderSkeleton() {
    return `
        <div class="w-container">
            <div class="w-stats-grid">
                <div class="skeleton" style="height: 180px; border-radius: 20px;"></div>
                <div style="display: grid; gap: 12px;">
                    <div class="skeleton" style="height: 84px; border-radius: 16px;"></div>
                    <div class="skeleton" style="height: 84px; border-radius: 16px;"></div>
                </div>
            </div>
            <div class="skeleton" style="height: 200px; border-radius: 16px; margin-bottom: 24px;"></div>
            <div class="skeleton" style="height: 150px; border-radius: 16px;"></div>
        </div>
    `;
}

export async function renderWalletPage() {
    const mainContent = document.getElementById('mainContent');
    
    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="w-container" style="text-align: center; padding-top: 80px;">
                <div style="width: 72px; height: 72px; background: rgba(139,92,246,0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="color: #8B5CF6;"><path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" stroke="currentColor" stroke-width="2"/><path d="M18 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Your Wallet</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">Sign in to manage your funds</p>
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
        
        // Get active escrow projects from bookings
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
                <p style="color: var(--text-secondary); margin-bottom: 20px;">${error.message}</p>
                <button class="btn-primary" onclick="window.renderWalletPage()">Try Again</button>
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
            <!-- Stats Grid -->
            <div class="w-stats-grid">
                <!-- Main Earnings Card -->
                <div class="w-earnings-card">
                    <div style="position: relative; z-index: 1;">
                        <div class="w-earnings-label">Total Earnings</div>
                        <div class="w-earnings-amount">$${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <button class="w-earnings-btn" onclick="window.showWithdrawModal?.() || showToast('Withdraw feature coming soon', 'info')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                            Withdraw Funds
                        </button>
                    </div>
                </div>
                
                <!-- Side Stats -->
                <div class="w-side-stats">
                    <div class="w-stat-card">
                        <div class="w-stat-header">
                            <div class="w-stat-dot available"></div>
                            <span class="w-stat-label">Available</span>
                        </div>
                        <div class="w-stat-value">$${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div class="w-stat-sub">Ready for withdrawal</div>
                    </div>
                    <div class="w-stat-card">
                        <div class="w-stat-header">
                            <div class="w-stat-dot escrow"></div>
                            <span class="w-stat-label">In Escrow</span>
                        </div>
                        <div class="w-stat-value" style="color: #F59E0B;">$${inEscrow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div class="w-stat-sub">Funds secured</div>
                    </div>
                </div>
            </div>
            
            <!-- Two Column Layout -->
            <div class="w-two-col">
                <div>
                    <!-- Active Escrow Projects -->
                    <div class="w-section">
                        <div class="w-section-header">
                            <h3 class="w-section-title">Active Escrow Projects</h3>
                            ${escrowProjects.length > 0 ? `<span class="w-section-link" onclick="window.navigateToPage('bookings')">View All</span>` : ''}
                        </div>
                        
                        ${escrowProjects.length > 0 ? `
                            <div class="w-escrow-list">
                                ${escrowProjects.slice(0, 3).map(p => `
                                    <div class="w-escrow-item" onclick="window.viewBookingDetails?.('${p._id}')" style="cursor: pointer;">
                                        <div class="w-escrow-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                        </div>
                                        <div class="w-escrow-info">
                                            <div class="w-escrow-title">${p.serviceTitle || 'Project'}</div>
                                            <div class="w-escrow-meta">${p.client?.name || 'Client'} • ${formatStatus(p.status)}</div>
                                        </div>
                                        <div class="w-escrow-amount">
                                            <div class="w-escrow-value">$${(p.amount || 0).toLocaleString()}</div>
                                            <div class="w-escrow-status">In Escrow</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="w-empty">
                                <div class="w-empty-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                </div>
                                <div style="font-size: 14px; color: var(--text-secondary);">No active escrow projects</div>
                            </div>
                        `}
                    </div>
                    
                    <!-- Recent Transactions -->
                    <div class="w-section">
                        <div class="w-section-header">
                            <h3 class="w-section-title">Recent Transactions</h3>
                            <span class="w-section-link">Export CSV</span>
                        </div>
                        
                        ${transactions.length > 0 ? `
                            <div class="w-tx-table">
                                <div class="w-tx-header">
                                    <div>Date</div>
                                    <div>Description</div>
                                    <div>Amount</div>
                                    <div>Status</div>
                                </div>
                                ${transactions.slice(0, 5).map(tx => {
                                    const isCredit = ['deposit', 'earning', 'bonus', 'refund'].includes(tx.type);
                                    const amount = tx.usdEquivalent || tx.amount || 0;
                                    const status = tx.status || 'completed';
                                    return `
                                        <div class="w-tx-row">
                                            <div class="w-tx-date">${formatShortDate(tx.createdAt)}</div>
                                            <div class="w-tx-desc">${tx.description || tx.type}</div>
                                            <div class="w-tx-amount ${isCredit ? 'positive' : 'negative'}">${isCredit ? '+' : '-'}$${Math.abs(amount).toFixed(2)}</div>
                                            <div><span class="w-tx-status ${status}">${status}</span></div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="w-empty">
                                <div class="w-empty-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" stroke-width="2"/></svg>
                                </div>
                                <div style="font-size: 14px; color: var(--text-secondary);">No transactions yet</div>
                            </div>
                        `}
                    </div>
                </div>
                
                <!-- Right Column -->
                <div>
                    <!-- Payout Methods -->
                    <div class="w-section">
                        <h3 class="w-section-title" style="margin-bottom: 16px;">Payout Methods</h3>
                        
                        <div class="w-payout-list">
                            <div class="w-payout-item">
                                <div class="w-payout-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="color: #3B82F6;"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M6 8h.01M2 12h20" stroke="currentColor" stroke-width="2"/></svg>
                                </div>
                                <div class="w-payout-info">
                                    <div class="w-payout-name">Bank Account</div>
                                    <div class="w-payout-detail">**** 4291</div>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            </div>
                            
                            <div class="w-payout-item">
                                <div class="w-payout-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="color: #8B5CF6;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                                </div>
                                <div class="w-payout-info">
                                    <div class="w-payout-name">USDC Wallet</div>
                                    <div class="w-payout-detail">Crypto</div>
                                </div>
                            </div>
                        </div>
                        
                        <button class="w-payout-add">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
                            Add Payment Method
                        </button>
                    </div>
                    
                    <!-- Escrow Protection -->
                    <div class="w-protection">
                        <div class="w-protection-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <div class="w-protection-content">
                            <div class="w-protection-title">Escrow Protection</div>
                            <div class="w-protection-text">Your funds are secured in an independent escrow account. Payment is guaranteed once deliverables are approved.</div>
                            <span class="w-protection-link">Learn how it works →</span>
                        </div>
                    </div>
                </div>
            </div>
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

// Window exports
window.renderWalletPage = renderWalletPage;
