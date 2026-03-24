import { appState } from '../state.js';
import { formatDate, showToast } from '../utils.js';
import api from '../services/api.js';
import { showAddFundsModal, showWithdrawModal } from '../components/modals.js';

let walletData = null;
let transactions = [];
let walletPollingInterval = null;
const POLLING_INTERVAL = 10000;

export async function renderWalletPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px;">
                <div style="text-align: center; max-width: 400px;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(151,71,255,0.15), rgba(107,70,255,0.15)); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 1px solid rgba(151,71,255,0.2);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="color: var(--primary);">
                            <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" stroke="currentColor" stroke-width="2"/>
                            <path d="M18 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <h2 style="margin-bottom: 8px; font-size: 22px;">Your Wallet</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">Sign in to manage your funds</p>
                    <button class="btn-primary" onclick="showAuthModal('signin')">Sign in to continue</button>
                </div>
            </div>
        `;
        return;
    }

    // Show skeleton while loading
    mainContent.innerHTML = renderWalletSkeleton();

    try {
        const [walletResponse, transactionsResponse] = await Promise.all([
            api.getHostfiWallet(),
            api.getHostfiTransactions(1, 20)
        ]);

        if (walletResponse.success) {
            walletData = walletResponse.data.wallet;
            window.walletData = walletData;
            transactions = transactionsResponse.data?.transactions || [];
            mainContent.innerHTML = buildWalletHTML();
        }
    } catch (error) {
        console.error('Failed to load wallet:', error);
        mainContent.innerHTML = `
            <div style="max-width: 480px; margin: 0 auto; padding: 32px 20px;">
                <div style="text-align: center; padding: 48px 20px;">
                    <div style="width: 56px; height: 56px; background: rgba(239,68,68,0.1); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="color: #EF4444;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </div>
                    <h3 style="margin-bottom: 8px;">Failed to load wallet</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14px;">${error.message}</p>
                    <button class="btn-primary" onclick="window.location.reload()">Try again</button>
                </div>
            </div>
        `;
    }
}

function renderWalletSkeleton() {
    return `
        <div style="max-width: 480px; margin: 0 auto; padding: 32px 20px 60px;">
            <!-- Skeleton Balance Card -->
            <div class="skeleton" style="height: 180px; border-radius: 24px; margin-bottom: 24px;"></div>
            
            <!-- Skeleton Action Buttons -->
            <div style="display: flex; gap: 12px; margin-bottom: 32px;">
                <div class="skeleton" style="flex: 1; height: 72px; border-radius: 16px;"></div>
                <div class="skeleton" style="flex: 1; height: 72px; border-radius: 16px;"></div>
                <div class="skeleton" style="flex: 1; height: 72px; border-radius: 16px;"></div>
            </div>
            
            <!-- Skeleton History Header -->
            <div class="skeleton" style="height: 20px; width: 120px; margin-bottom: 16px;"></div>
            
            <!-- Skeleton History Items -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div class="skeleton" style="height: 64px; border-radius: 14px;"></div>
                <div class="skeleton" style="height: 64px; border-radius: 14px;"></div>
                <div class="skeleton" style="height: 64px; border-radius: 14px;"></div>
                <div class="skeleton" style="height: 64px; border-radius: 14px;"></div>
            </div>
        </div>
    `;
}

function buildWalletHTML() {
    const balance = walletData?.balance || 0;
    const totalEarnings = walletData?.totalEarnings || 0;
    
    return `
        <div style="max-width: 480px; margin: 0 auto; padding: 32px 20px 100px;">
            <style>
                @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                .wallet-container { animation: fadeIn 0.3s ease; }
                .balance-card {
                    background: linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%);
                    border-radius: 24px;
                    padding: 28px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(245, 158, 11, 0.3);
                }
                .balance-card::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -30%;
                    width: 200px;
                    height: 200px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 50%;
                }
                .action-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    padding: 16px;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: var(--text-primary);
                    font-size: 13px;
                    font-weight: 600;
                }
                .action-btn:hover {
                    background: rgba(151,71,255,0.08);
                    border-color: rgba(151,71,255,0.2);
                    transform: translateY(-2px);
                }
                .action-btn .icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }
                .tx-item {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 16px;
                    border-radius: 16px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06);
                    margin-bottom: 10px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                .tx-item:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(151,71,255,0.2);
                }
                .section-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 32px 0 16px;
                }
            </style>

            <div class="wallet-container">
                <!-- BALANCE CARD -->
                <div class="balance-card">
                    <div style="position: relative; z-index: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8);">Main Balance</span>
                            <span style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 20px;">USDC</span>
                        </div>
                        <div style="font-size: 40px; font-weight: 800; color: white; line-height: 1; margin-bottom: 8px;">
                            $${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.7);">
                            <span style="color: #86EFAC;">+${totalEarnings > 0 ? ((balance/totalEarnings)*100).toFixed(1) : 0}%</span>
                            <span>lifetime earnings</span>
                        </div>
                        
                        <!-- Fund & Withdraw Buttons inside card -->
                        <div style="display: flex; gap: 10px; margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.15);">
                            <button onclick="window.showFundModal()" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: rgba(255,255,255,0.95); border: none; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 700; color: #92400E; transition: all 0.2s;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                Fund
                            </button>
                            <button onclick="window.showWithdrawModal()" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 700; color: white; transition: all 0.2s;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                Withdraw
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ACTION BUTTONS -->
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button class="action-btn" onclick="window.showFundModal()">
                        <div class="icon" style="color: var(--primary);">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        Send
                    </button>
                    <button class="action-btn" onclick="window.showWithdrawModal()">
                        <div class="icon" style="color: #F59E0B;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="2" stroke-linecap="round" transform="rotate(45 12 12)"/></svg>
                        </div>
                        Receive
                    </button>
                    <button class="action-btn" onclick="window.toggleHistory()">
                        <div class="icon" style="color: #3B82F6;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        </div>
                        More
                    </button>
                </div>

                <!-- HISTORY SECTION -->
                <div class="section-title">History</div>
                
                ${transactions.length > 0 ? `
                    <div id="historyList">
                        ${transactions.slice(0, 5).map(tx => {
                            const isCredit = ['deposit', 'earning', 'bonus', 'refund'].includes(tx.type);
                            const amountUsd = tx.usdEquivalent || tx.amount || 0;
                            return `
                                <div class="tx-item" onclick="window.showTxDetail('${tx._id || tx.id}')">
                                    <div style="width: 44px; height: 44px; min-width: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: ${isCredit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)'};">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="color: ${isCredit ? '#10B981' : '#EF4444'};">
                                            ${isCredit 
                                                ? '<path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' 
                                                : '<path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'}
                                        </svg>
                                    </div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">${tx.description || (tx.type.charAt(0).toUpperCase() + tx.type.slice(1))}</div>
                                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${formatDate(tx.createdAt)}</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 16px; font-weight: 700; color: ${isCredit ? '#10B981' : '#EF4444'};">
                                            ${isCredit ? '+' : '-'}$${Math.abs(amountUsd).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    ${transactions.length > 5 ? `
                        <button onclick="window.loadMoreHistory()" id="loadMoreBtn" style="width: 100%; margin-top: 12px; padding: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--text-secondary); transition: all 0.2s;">
                            View all transactions
                        </button>
                    ` : ''}
                ` : `
                    <div style="text-align: center; padding: 48px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px;">
                        <div style="width: 56px; height: 56px; background: rgba(151,71,255,0.08); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="color: var(--primary); opacity: 0.6;">
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 15px; margin: 0;">No transactions yet</p>
                        <p style="color: var(--text-secondary); font-size: 13px; opacity: 0.7; margin-top: 6px;">Your history will appear here</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

// Window functions for interactivity
window.showFundModal = function() { showAddFundsModal(); };
window.showWithdrawModal = function() { showWithdrawModal(); };
window.walletData = walletData;

window.toggleHistory = function() {
    const historyList = document.getElementById('historyList');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (historyList) {
        historyList.style.display = historyList.style.display === 'none' ? 'block' : 'none';
        if (loadMoreBtn) loadMoreBtn.style.display = historyList.style.display;
    }
};

window.loadMoreHistory = async function() {
    showToast('Loading more transactions...', 'info');
    try {
        const response = await api.getHostfiTransactions(1, 50);
        if (response.success) {
            transactions = response.data?.transactions || [];
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML = buildWalletHTML();
            }
        }
    } catch (e) {
        showToast('Failed to load more', 'error');
    }
};

window.showTxDetail = function(txId) {
    const tx = transactions.find(t => (t._id || t.id) === txId);
    if (!tx) return;
    
    const isCredit = ['deposit', 'earning', 'bonus', 'refund'].includes(tx.type);
    const amountUsd = tx.usdEquivalent || tx.amount || 0;
    
    // Simple alert/modal for now - can be enhanced
    showToast(`${tx.description || tx.type}: $${Math.abs(amountUsd).toFixed(2)}`, isCredit ? 'success' : 'info');
};

// Background sync
export async function syncWalletBackground() {
    if (!appState.user || appState.currentPage !== 'wallet') return;
    try {
        const [walletResponse, transactionsResponse] = await Promise.all([
            api.getHostfiWallet(),
            api.getHostfiTransactions(1, 20)
        ]);
        if (walletResponse.success) {
            const newBalance = walletResponse.data.wallet?.balance || 0;
            const newTxCount = transactionsResponse.data?.transactions?.length || 0;
            if ((walletData?.balance || 0) !== newBalance || transactions.length !== newTxCount) {
                walletData = walletResponse.data.wallet;
                window.walletData = walletData;
                transactions = transactionsResponse.data?.transactions || [];
                const mainContent = document.getElementById('mainContent');
                if (mainContent && mainContent.querySelector('.wallet-container')) {
                    mainContent.innerHTML = buildWalletHTML();
                }
            }
        }
    } catch (error) {
        console.warn('[Wallet] Background sync failed:', error.message);
    }
}

export function startWalletPolling() {
    if (walletPollingInterval) return;
    walletPollingInterval = setInterval(syncWalletBackground, POLLING_INTERVAL);
}

export function stopWalletPolling() {
    if (walletPollingInterval) {
        clearInterval(walletPollingInterval);
        walletPollingInterval = null;
    }
}

export function getWalletData() { return walletData; }
