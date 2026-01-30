import { appState } from '../state.js';
import { formatDate, showToast } from '../utils.js';
import api from '../services/api.js';
import { showAddFundsModal, showSwapModal } from '../components/modals.js';

let walletData = null;
let transactions = [];
let recentBookings = [];

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
        const [walletResponse, transactionsResponse, bookingsResponse, addressResponse] = await Promise.all([
            api.getWallet(),
            api.getTransactions(1, 10),
            api.getBookings(),
            api.getHostfiCryptoAddresses()
        ]);

        if (walletResponse.success) {
            walletData = walletResponse.data.wallet;
            if (addressResponse.success && addressResponse.data.addresses && addressResponse.data.addresses.length > 0) {
                walletData.address = addressResponse.data.addresses[0].address;
                walletData.network = addressResponse.data.addresses[0].network;
            }
            transactions = transactionsResponse.data?.transactions || [];
            recentBookings = bookingsResponse.data?.bookings || [];
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

function renderWalletAddress(wallet) {
    if (!wallet.address || wallet.address.startsWith('pending_')) {
        return `
            <div class="wallet-address-card">
                <div class="wallet-address-label">Solana Wallet Address</div>
                <div class="wallet-address-status">
                    <span class="status-badge pending">Initializing...</span>
                    <p class="text-secondary">Your Solana USDC wallet is being created</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="wallet-address-card">
            <div class="wallet-address-label">
                <span>Your Solana Address (USDC)</span>
                <span class="network-badge">Solana</span>
            </div>
            <div class="wallet-address-display">
                <code class="wallet-address" id="walletAddress">${wallet.address}</code>
                <button class="copy-btn" onclick="window.copyWalletAddress()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Copy
                </button>
            </div>
            <p class="wallet-address-hint">Send USDC on Solana network to this address to fund your wallet</p>
        </div>
    `;
}

function renderWalletContent() {
    const mainContent = document.getElementById('mainContent');

    const balance = walletData.balance || 0;
    const pendingBalance = walletData.pendingBalance || 0;
    const totalEarnings = walletData.totalEarnings || 0;

    // Calculate USD value (USDC is 1:1 with USD)
    const usdValue = balance * 1.0;

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <h1 class="mb-lg">My Wallet</h1>

                <!-- Spot Balance Card -->
                <div class="spot-balance-card">
                    <div class="balance-header">
                        <span class="balance-label">Spot Balance</span>
                        <button class="icon-btn" onclick="window.location.reload()" title="Refresh balance">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M4 12a8 8 0 1 1 16 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <path d="M4 12l-2-2m2 2l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>

                    <div class="balance-main">
                        <div class="balance-amount">
                            <span class="amount-value">${balance.toFixed(2)}</span>
                            <span class="currency-symbol">$</span>
                        </div>
                        <div class="balance-usd">≈ $${usdValue.toFixed(2)} USD</div>
                    </div>

                    <div class="balance-actions">
                        <button class="action-btn primary" onclick="window.fundWallet()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Deposit
                        </button>
                        <button class="action-btn" onclick="window.showBankWithdrawal()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Withdraw
                        </button>
                        <button class="action-btn" onclick="window.location.href='#/transactions'">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                                <path d="M3 9h18" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            History
                        </button>
                    </div>
                </div>

                <!-- USDC Asset Card -->
                <div class="crypto-assets-section">
                    <h2 class="section-title">Assets</h2>

                    <div class="crypto-asset-item">
                        <div class="asset-icon">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <circle cx="16" cy="16" r="16" fill="#2775CA"/>
                                <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="14" font-weight="600">$</text>
                            </svg>
                        </div>
                        <div class="asset-info">
                            <div class="asset-name">USDC</div>
                            <div class="asset-network">Solana</div>
                        </div>
                        <div class="asset-balance">
                            <div class="balance-value">${balance.toFixed(4)}</div>
                            <div class="balance-usd">$${usdValue.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <!-- Wallet Address Section -->
                ${renderWalletAddress(walletData)}

                <!-- Stats Cards -->
                <div class="wallet-stats-grid">
                    <div class="stat-card">
                        <div class="stat-card-content-with-icon">
                            <div class="stat-icon-wrapper earnings">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="stat-details">
                                <div class="stat-label">Total Earnings</div>
                                <div class="stat-value">$${totalEarnings.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-content-with-icon">
                            <div class="stat-icon-wrapper pending">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="stat-details">
                                <div class="stat-label">Pending</div>
                                <div class="stat-value">$${pendingBalance.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <h2 class="mb-md mt-lg">Recent bookings</h2>
                ${recentBookings.length > 0 ? `
                    <div class="transaction-list">
                        ${recentBookings.slice(0, 5).map(booking => {
        const isCreator = appState.user.role === 'creator';
        const otherPartyName = isCreator ? booking.client?.name || 'Client' : booking.creator?.name || 'Creator';
        const otherPartyAvatar = isCreator
            ? booking.client?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
            : booking.creator?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop';

        return `
                            <div class="transaction-item" style="cursor: pointer;" onclick="window.location.href='/#/bookings'">
                                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                    <img src="${otherPartyAvatar}" alt="${otherPartyName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                                    <div class="transaction-info">
                                        <div class="transaction-title">${booking.serviceTitle}</div>
                                        <div class="transaction-date">${otherPartyName} • ${formatDate(booking.createdAt)}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <span class="tag" style="background: ${booking.status === 'completed' ? '#10B981' : booking.status === 'in_progress' ? '#3B82F6' : '#FFA500'}; color: white; padding: 4px 10px; font-size: 12px; margin-bottom: 4px;">
                                        ${booking.status === 'completed' ? 'Completed' : booking.status === 'in_progress' ? 'In Progress' : booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                                    </span>
                                    <div class="transaction-amount" style="color: var(--primary);">USDC ${booking.amount.toFixed(2)}</div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                    <div class="text-center mt-md">
                        <button class="btn-ghost" onclick="window.location.href='/#/bookings'">View all bookings</button>
                    </div>
                ` : `
                    <div class="empty-state" style="padding: 40px 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
                            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                            <path d="M3 10h18" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <p class="text-secondary">No bookings yet</p>
                        ${appState.user.role === 'client' ? '<button class="btn-primary" onclick="window.location.href=\'/#/discover\'">Find creators</button>' : ''}
                    </div>
                `}

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
                                        ${isCredit ? '+' : '-'}USDC ${Math.abs(transaction.amount).toFixed(2)}
                                    </div>
                                    ${(transaction.status === 'pending' || transaction.status === 'processing') && transaction.reference ? `
                                        <button class="btn-ghost" style="font-size: 12px; padding: 4px 8px; margin-top: 4px;" onclick="window.checkTransactionStatus('${transaction.reference}')">
                                            Check Status
                                        </button>
                                    ` : ''}
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

window.fundWallet = function () {
    showAddFundsModal();
};

window.showSwapModal = function () {
    showSwapModal();
};

window.walletData = walletData;

window.copyWalletAddress = async function () {
    const address = walletData?.address;
    if (!address) return;

    try {
        await navigator.clipboard.writeText(address);
        showToast('Wallet address copied to clipboard!', 'success');
    } catch (error) {
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

window.checkTransactionStatus = async function (reference) {
    if (!reference) {
        showToast('No reference ID available', 'error');
        return;
    }

    try {
        showToast('Checking transaction status...', 'info');

        const response = await api.getHostfiWithdrawalStatus(reference);

        if (!response.success) {
            throw new Error(response.message || 'Failed to get status');
        }

        // HostFi returns { withdrawal } in data
        const withdrawal = response.data.withdrawal;
        if (!withdrawal) throw new Error('No status data returned');

        const status = withdrawal.status ? withdrawal.status.toUpperCase() : 'UNKNOWN';
        const startCaseStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

        showToast(
            `Status: ${startCaseStatus}\nAmount: ${withdrawal.amount} ${withdrawal.currency || 'USDC'}`,
            ['COMPLETED', 'SUCCESS'].includes(status) ? 'success' : (['FAILED', 'REVERSED'].includes(status) ? 'error' : 'info')
        );

        if (['COMPLETED', 'SUCCESS', 'FAILED', 'REVERSED'].includes(status)) {
            setTimeout(() => window.location.reload(), 2000);
        }
    } catch (error) {
        console.error('Failed to check transaction status:', error);
        showToast(error.message || 'Failed to check transaction status', 'error');
    }
};

export function getWalletData() {
    return walletData;
}
