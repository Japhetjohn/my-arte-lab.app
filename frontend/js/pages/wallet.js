// Wallet Page Module
import { appState } from '../state.js';
import { formatDate, showToast } from '../utils.js';
import api from '../services/api.js';

let walletData = null;
let transactions = [];

export async function renderWalletPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                    <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" stroke="currentColor" stroke-width="2"/>
                    <path d="M18 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h3>Sign in to view your wallet</h3>
                <p>Manage your earnings and payouts</p>
                <button class="btn-primary" onclick="showAuthModal('signin')">Sign in</button>
            </div>
        `;
        return;
    }

    // Show loading state
    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <h1 class="mb-lg">Wallet</h1>
                <div class="text-center" style="padding: 60px 20px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" stroke="currentColor" stroke-width="2"/>
                        <path d="M18 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p class="text-secondary">Loading wallet data...</p>
                </div>
            </div>
        </div>
    `;

    try {
        // Load wallet data from API
        const [walletResponse, transactionsResponse] = await Promise.all([
            api.getWallet(),
            api.getTransactions(1, 10)
        ]);

        if (walletResponse.success) {
            walletData = walletResponse.data.wallet;
            transactions = transactionsResponse.data?.transactions || [];
            renderWalletContent();
        }
    } catch (error) {
        console.error('Failed to load wallet:', error);
        mainContent.innerHTML = `
            <div class="section">
                <div class="container">
                    <div class="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>Failed to load wallet</h3>
                        <p>${error.message}</p>
                        <button class="btn-primary" onclick="window.location.reload()">Try again</button>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderWalletContent() {
    const mainContent = document.getElementById('mainContent');

    // Calculate totals from wallet data
    const balance = walletData.balance || 0;
    const pendingBalance = walletData.pendingBalance || 0;
    const totalEarnings = walletData.totalEarnings || 0;
    const withdrawn = totalEarnings - balance - pendingBalance;

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <h1 class="mb-lg">Wallet</h1>

                <!-- Wallet Address Card -->
                <div style="background: var(--surface); border-radius: 16px; padding: 20px; margin-bottom: 24px; border: 1px solid var(--border);">
                    <div class="caption" style="margin-bottom: 8px; color: var(--text-secondary);">Your Solana Wallet Address (${walletData.currency || 'USDC'})</div>
                    ${walletData.address && !walletData.address.startsWith('pending_') ? `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <code id="walletAddress" style="flex: 1; background: var(--background); padding: 12px; border-radius: 8px; font-size: 14px; overflow-x: auto; white-space: nowrap;">${walletData.address}</code>
                            <button class="btn-secondary" onclick="window.copyWalletAddress()" style="padding: 10px 16px; white-space: nowrap;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="margin-right: 6px; vertical-align: middle;">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Copy
                            </button>
                        </div>
                        <div class="caption" style="margin-top: 8px; color: var(--text-secondary);">
                            Network: ${walletData.network || 'Solana'} • Send ${walletData.currency || 'USDC'} to this address to fund your wallet
                        </div>
                    ` : `
                        <div style="background: #FEF3C7; padding: 16px; border-radius: 8px; border-left: 4px solid #F59E0B;">
                            <div style="color: #92400E; font-weight: 600; margin-bottom: 4px;">Wallet Being Created</div>
                            <div style="color: #78350F; font-size: 14px;">
                                Your Solana wallet is being set up. This usually takes a few moments. Please refresh the page in a minute.
                            </div>
                        </div>
                    `}
                </div>

                <div class="balance-card">
                    <div class="balance-label">Available balance</div>
                    <div class="balance-amount">${walletData.currency || 'USDC'} ${balance.toFixed(2)}</div>
                    <div class="balance-actions">
                        ${appState.user.role === 'creator' ? `
                        <button class="btn-primary" style="background: white; color: var(--primary);" onclick="showWithdrawModal()">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="margin-right: 8px; vertical-align: middle;">
                                <path d="M10 14V6M7 9l3-3 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <rect x="3" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Withdraw
                        </button>
                        ` : ''}
                        <button class="btn-secondary" style="border-color: white; color: white;" onclick="window.location.reload()">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="margin-right: 8px; vertical-align: middle;">
                                <path d="M4 10a6 6 0 1 1 12 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <path d="M4 10l-2-2m2 2l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="wallet-cards-grid mt-lg">
                    <div class="wallet-card-item">
                        <div class="wallet-card-icon" style="background: rgba(151, 71, 255, 0.1);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="#9747FF" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="wallet-card-label">Total earnings</div>
                        <div class="wallet-card-value">${walletData.currency || 'USDC'} ${totalEarnings.toFixed(2)}</div>
                    </div>

                    <div class="wallet-card-item">
                        <div class="wallet-card-icon" style="background: rgba(255, 165, 0, 0.1);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="#FFA500" stroke-width="2"/>
                                <path d="M12 6v6l4 2" stroke="#FFA500" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="wallet-card-label">Pending</div>
                        <div class="wallet-card-value" style="color: #FFA500;">${walletData.currency || 'USDC'} ${pendingBalance.toFixed(2)}</div>
                    </div>

                    <div class="wallet-card-item">
                        <div class="wallet-card-icon" style="background: rgba(16, 185, 129, 0.1);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="wallet-card-label">Withdrawn</div>
                        <div class="wallet-card-value" style="color: var(--success);">${walletData.currency || 'USDC'} ${withdrawn.toFixed(2)}</div>
                    </div>
                </div>

                ${appState.user.role === 'creator' ? `
                <div class="mt-lg">
                    <h3 class="mb-md">Quick actions</h3>
                    <div class="quick-actions-grid">
                        <button class="quick-action-btn" onclick="showWithdrawModal()">
                            <div class="quick-action-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M12 2l4 4m-4-4L8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <div class="quick-action-label">Withdraw</div>
                        </button>
                        <button class="quick-action-btn" onclick="showTransactionHistory()">
                            <div class="quick-action-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 3v18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M18 17l-5-5-3 3-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="quick-action-label">History</div>
                        </button>
                        <button class="quick-action-btn" onclick="window.location.reload()">
                            <div class="quick-action-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="quick-action-label">Refresh</div>
                        </button>
                        <button class="quick-action-btn" onclick="window.copyWalletAddress()">
                            <div class="quick-action-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <div class="quick-action-label">Copy Address</div>
                        </button>
                    </div>
                </div>
                ` : ''}

                <h2 class="mb-md mt-lg">Recent transactions</h2>
                ${transactions.length > 0 ? `
                    <div class="transaction-list">
                        ${transactions.slice(0, 5).map(transaction => {
                            const isCredit = ['deposit', 'earning', 'bonus', 'refund'].includes(transaction.type);
                            const icon = isCredit ? '↓' : '↑';
                            const color = isCredit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

                            return `
                            <div class="transaction-item">
                                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                    <div style="width: 40px; height: 40px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                        ${icon}
                                    </div>
                                    <div class="transaction-info">
                                        <div class="transaction-title">${transaction.description || transaction.type}</div>
                                        <div class="transaction-date">${transaction.transactionId} • ${formatDate(transaction.createdAt)}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    ${transaction.status === 'pending' ? `<div class="caption" style="color: #FFA500; margin-bottom: 4px;">Pending</div>` : ''}
                                    ${transaction.status === 'processing' ? `<div class="caption" style="color: #3B82F6; margin-bottom: 4px;">Processing</div>` : ''}
                                    ${transaction.status === 'failed' ? `<div class="caption" style="color: #EF4444; margin-bottom: 4px;">Failed</div>` : ''}
                                    <div class="transaction-amount ${isCredit ? 'positive' : 'negative'}">
                                        ${isCredit ? '+' : '-'}${transaction.currency || 'USDC'} ${Math.abs(transaction.amount).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                    <div class="text-center mt-md">
                        <button class="btn-ghost" onclick="showTransactionHistory()">View all transactions</button>
                    </div>
                ` : `
                    <div class="empty-state" style="padding: 40px 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <p class="text-secondary">No transactions yet</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

// Copy wallet address to clipboard
window.copyWalletAddress = async function() {
    const address = walletData?.address;
    if (!address) return;

    try {
        await navigator.clipboard.writeText(address);
        showToast('Wallet address copied to clipboard!', 'success');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            showToast('Wallet address copied!', 'success');
        } catch (err) {
            showToast('Failed to copy address', 'error');
        }

        document.body.removeChild(textArea);
    }
};

// Export wallet data for use in modals
export function getWalletData() {
    return walletData;
}
