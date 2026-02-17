import { appState } from '../state.js';
import { formatDate, showToast } from '../utils.js';
import api from '../services/api.js';
import { showAddFundsModal, showSwapModal } from '../components/modals.js';

// Currency symbols mapping
const currencySymbols = {
    'USD': '$',
    'USDC': '$',
    'USDT': '$',
    'NGN': '₦',
    'GHS': '₵',
    'KES': 'KSh',
    'ZAR': 'R',
    'EUR': '€',
    'GBP': '£',
    'BTC': '₿',
    'ETH': 'Ξ',
    'SOL': '◎',
    'BNB': 'BNB',
    'DAI': 'DAI'
};

let walletData = null;
let transactions = [];
let recentBookings = [];

export async function renderWalletPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px;">
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

                <div class="glass-effect" style="padding: 24px; border-radius: 20px; margin-bottom: 24px;">
                    <div class="skeleton-loader" style="height: 150px; border-radius: 16px; margin-bottom: 24px; opacity: 0.5;"></div>
                    <div style="margin-top: 32px;">
                        <div class="skeleton-loader" style="height: 32px; width: 150px; margin-bottom: 16px; opacity: 0.5;"></div>
                        <div class="skeleton-loader" style="height: 80px; border-radius: 12px; margin-bottom: 12px; opacity: 0.5;"></div>
                        <div class="skeleton-loader" style="height: 80px; border-radius: 12px; margin-bottom: 12px; opacity: 0.5;"></div>
                        <div class="skeleton-loader" style="height: 80px; border-radius: 12px; opacity: 0.5;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        const [walletResponse, transactionsResponse, bookingsResponse] = await Promise.all([
            api.getHostfiWallet(),
            api.getHostfiTransactions(1, 10),
            api.getBookings()
        ]);

        if (walletResponse.success) {
            walletData = walletResponse.data.wallet;
            window.walletData = walletData;

            console.log('Wallet data loaded:', {
                balance: walletData.balance,
                currency: walletData.currency,
                address: walletData.address,
                totalEarnings: walletData.totalEarnings
            });

            transactions = transactionsResponse.data?.transactions || [];
            recentBookings = bookingsResponse.data?.bookings || [];
            renderWalletContent();
        }
    } catch (error) {
        console.error('Failed to load wallet:', error);
        mainContent.innerHTML = `
            <div class="section">
                <div class="container">
                    <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px; border-color: rgba(239, 68, 68, 0.3);">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; color: var(--error);">
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
    console.log('Rendering wallet address:', wallet.address);

    if (!wallet || !wallet.address || wallet.address.startsWith('pending_')) {
        return `
            <div class="wallet-address-card glass-effect" style="border-radius: 16px;">
                <div class="wallet-address-label">Solana Wallet Address</div>
                <div class="wallet-address-status">
                    <span class="status-badge pending" style="background: rgba(255, 165, 0, 0.2); backdrop-filter: blur(4px);">Initializing...</span>
                    <p class="text-secondary">Your Solana USDC wallet is being created</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="wallet-address-card glass-effect" style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.5);">
            <div class="wallet-address-label">
                <span style="color: var(--text-primary); font-weight: 600;">Your Solana Address (USDC)</span>
                <span class="network-badge" style="background: rgba(151, 71, 255, 0.15); backdrop-filter: blur(4px); border: 1px solid rgba(151, 71, 255, 0.2);">Solana</span>
            </div>
            <div class="wallet-address-display">
                <code class="wallet-address" id="walletAddress" style="background: rgba(255,255,255,0.4); border-color: rgba(255,255,255,0.6); backdrop-filter: blur(4px);">${wallet.address}</code>
                <button class="copy-btn" onclick="window.copyWalletAddress()" style="background: rgba(151, 71, 255, 0.8); backdrop-filter: blur(4px);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Copy
                </button>
            </div>
            <p class="wallet-address-hint" style="color: var(--text-secondary); font-weight: 500;">Send USDC on Solana network to this address to fund your wallet</p>
        </div>
    `;
}

function renderWalletContent() {
    const mainContent = document.getElementById('mainContent');

    const balance = walletData.balance || 0;
    const pendingBalance = walletData.pendingBalance || 0;
    const totalEarnings = walletData.totalEarnings || 0;

    const currency = walletData.currency || 'USD';
    const currencySymbol = currencySymbols[currency] || '$';

    const assets = walletData.assets || [];

    // Group assets by currency to avoid showing duplicate entries (e.g., multiple USDC on different networks)
    const groupedAssets = assets.reduce((acc, asset) => {
        if (!acc[asset.currency]) {
            acc[asset.currency] = {
                ...asset,
                balance: 0,
                usdEquivalent: 0,
                networks: []
            };
        }
        acc[asset.currency].balance += (asset.balance || 0);
        acc[asset.currency].usdEquivalent += (asset.usdEquivalent || 0);
        if (asset.colNetwork && !acc[asset.currency].networks.includes(asset.colNetwork)) {
            acc[asset.currency].networks.push(asset.colNetwork);
        }
        return acc;
    }, {});

    const cryptoAssets = Object.values(groupedAssets);

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <h1 class="mb-lg">My Wallet</h1>

                <div class="spot-balance-card" style="background: linear-gradient(135deg, rgba(151, 71, 255, 0.75) 0%, rgba(107, 70, 255, 0.75) 100%); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 12px 40px rgba(151, 71, 255, 0.2);">
                    <div class="balance-header">
                        <span class="balance-label" style="font-weight: 600;">Total Balance</span>
                        <button class="icon-btn" onclick="window.location.reload()" title="Refresh balance" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M4 12a8 8 0 1 1 16 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <path d="M4 12l-2-2m2 2l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>

                    <div class="balance-main">
                        <div class="balance-amount">
                            <span class="currency-symbol">${currencySymbol}</span>
                            <span class="amount-value">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div class="balance-actions">
                        <button class="action-btn primary" onclick="window.fundWallet()" style="background: rgba(255,255,255,0.9);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Deposit
                        </button>
                        <button class="action-btn" onclick="window.showBankWithdrawal()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Withdraw
                        </button>
                        <button class="action-btn" onclick="window.location.href='#/transactions'" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                                <path d="M3 9h18" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            History
                        </button>
                    </div>
                </div>

                <div class="crypto-assets-section">
                    <h2 class="section-title">Crypto Assets</h2>
                    ${cryptoAssets.length > 0 ? cryptoAssets.map(asset => `
                        <div class="crypto-asset-item glass-effect" style="border-radius: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.5);">
                            <div class="asset-icon" style="background: rgba(255,255,255,0.5);">
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                    <circle cx="16" cy="16" r="16" fill="${asset.currency === 'USDC' ? '#2775CA' : '#26A17B'}"/>
                                    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="14" font-weight="600">${asset.currency[0]}</text>
                                </svg>
                            </div>
                            <div class="asset-info">
                                <div class="asset-name" style="color: var(--text-primary); font-weight: 700;">${asset.currency}</div>
                                <div class="asset-network" style="color: var(--text-secondary); font-weight: 500;">${asset.networks.join(', ') || asset.colNetwork || 'HostFi'}</div>
                            </div>
                            <div class="asset-balance">
                                <div class="balance-value" style="color: var(--text-primary);">${(asset.balance || 0).toFixed(4)}</div>
                                <div class="balance-usd" style="font-weight: 500;">$${(asset.balance || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="text-secondary text-center glass-effect" style="padding: 20px; border-radius: 16px;">No crypto assets found</div>
                    `}
                </div>

                ${renderWalletAddress(walletData)}

                <div class="wallet-stats-grid">
                    <div class="stat-card glass-effect" style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.5);">
                        <div class="stat-card-content-with-icon">
                            <div class="stat-icon-wrapper earnings" style="background: rgba(34, 197, 94, 0.15); backdrop-filter: blur(4px);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="stat-details">
                                <div class="stat-label" style="font-weight: 600;">Total Earnings</div>
                                <div class="stat-value" style="color: var(--text-primary);">$${totalEarnings.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="stat-card glass-effect" style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.5);">
                        <div class="stat-card-content-with-icon">
                            <div class="stat-icon-wrapper pending" style="background: rgba(251, 146, 60, 0.15); backdrop-filter: blur(4px);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="stat-details">
                                <div class="stat-label" style="font-weight: 600;">In Escrow</div>
                                <div class="stat-value" style="color: var(--text-primary);">$${pendingBalance.toFixed(2)}</div>
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
                                <div class="transaction-item glass-effect" style="cursor: pointer; border-radius: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.5);" onclick="window.location.href='/#/bookings'">
                                    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                        <img src="${otherPartyAvatar}" alt="${otherPartyName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.6);">
                                        <div class="transaction-info">
                                            <div class="transaction-title" style="color: var(--text-primary);">${booking.serviceTitle}</div>
                                            <div class="transaction-date" style="font-weight: 500;">${otherPartyName} • ${formatDate(booking.createdAt)}</div>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <span class="tag" style="background: ${booking.status === 'completed' ? '#10B981' : booking.status === 'in_progress' ? '#3B82F6' : '#FFA500'}dd; backdrop-filter: blur(4px); color: white; padding: 4px 10px; font-size: 12px; margin-bottom: 4px; border: none;">
                                            ${booking.status === 'completed' ? 'Completed' : booking.status === 'in_progress' ? 'In Progress' : booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                                        </span>
                                        <div class="transaction-amount" style="color: var(--primary); font-weight: 700;">USDC ${booking.amount.toFixed(2)}</div>
                                    </div>
                                </div>
                            `}).join('')}
                    </div>
                    <div class="text-center mt-md">
                        <button class="btn-ghost glass-effect" style="border: 1px solid rgba(255,255,255,0.4);" onclick="window.location.href='/#/bookings'">View all bookings</button>
                    </div>
                ` : `
                    <div class="empty-state glass-effect" style="padding: 40px 20px; border-radius: 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
                            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                            <path d="M3 10h18" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <p class="text-secondary" style="font-weight: 500;">No bookings yet</p>
                        ${appState.user.role === 'client' ? '<button class="btn-primary" onclick="window.location.href=\'/#/discover\'">Find creators</button>' : ''}
                    </div>
                `}

                <h2 class="mb-md mt-lg">Recent transactions</h2>
                ${transactions.length > 0 ? `
                    <div class="transaction-list">
                        ${transactions.slice(0, 5).map(transaction => {
            const isCredit = ['deposit', 'earning', 'bonus', 'refund'].includes(transaction.type);
            const icon = isCredit ? '↓' : '↑';
            const color = isCredit ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            const iconColor = isCredit ? '#10B981' : '#EF4444';

            return `
                            <div class="transaction-item glass-effect" style="border-radius: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.5);">
                                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                    <div style="width: 44px; height: 44px; border-radius: 50%; background: ${color}; backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; font-size: 20px; color: ${iconColor}; font-weight: bold; border: 1px solid rgba(255,255,255,0.3);">
                                        ${icon}
                                    </div>
                                    <div class="transaction-info">
                                        <div class="transaction-title" style="color: var(--text-primary);">${transaction.description || transaction.type}</div>
                                        <div class="transaction-date" style="font-weight: 500;">${transaction.transactionId} • ${formatDate(transaction.createdAt)}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    ${transaction.status === 'pending' ? `<div class="caption" style="color: #FFA500; font-weight: 600; margin-bottom: 4px;">Pending</div>` : ''}
                                    ${transaction.status === 'processing' ? `<div class="caption" style="color: #3B82F6; font-weight: 600; margin-bottom: 4px;">Processing</div>` : ''}
                                    ${transaction.status === 'failed' ? `<div class="caption" style="color: #EF4444; font-weight: 600; margin-bottom: 4px;">Failed</div>` : ''}
                                    <div class="transaction-amount ${isCredit ? 'positive' : 'negative'}" style="font-weight: 700;">
                                        ${isCredit ? '+' : '-'}${currencySymbols[transaction.currency] || transaction.currency} ${Math.abs(transaction.amount).toFixed(2)}
                                    </div>
                                    ${(transaction.status === 'pending' || transaction.status === 'processing') && transaction.reference ? `
                                        <button class="btn-ghost" style="font-size: 12px; padding: 4px 8px; margin-top: 4px; background: rgba(255,255,255,0.3);" onclick="window.checkTransactionStatus('${transaction.reference}')">
                                            Check Status
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                    <div class="text-center mt-md">
                        <button class="btn-ghost glass-effect" style="border: 1px solid rgba(255,255,255,0.4);" onclick="showTransactionHistory()">View all transactions</button>
                    </div>
                ` : `
                    <div class="empty-state glass-effect" style="padding: 40px 20px; border-radius: 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <p class="text-secondary" style="font-weight: 500;">No transactions yet</p>
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