import { appState } from '../state.js';
import { formatDate, showToast } from '../utils.js';
import api from '../services/api.js';
import { showAddFundsModal, showSwapModal, showWithdrawModal, showTransactionHistory } from '../components/modals.js';

const currencySymbols = {
    'USD': '$', 'USDC': '$', 'USDT': '$', 'NGN': '₦',
    'GHS': '₵', 'KES': 'KSh', 'ZAR': 'R', 'EUR': '€',
    'GBP': '£', 'BTC': '₿', 'ETH': 'Ξ', 'SOL': '◎',
    'BNB': 'BNB', 'DAI': 'DAI'
};

const assetColors = {
    'USDC': ['#2775CA', '#1a4a8a'],
    'USDT': ['#26A17B', '#1a6e52'],
    'BTC': ['#F7931A', '#c47a12'],
    'ETH': ['#627EEA', '#3d5dc5'],
    'SOL': ['#9945FF', '#6e2fc5'],
    'BNB': ['#F3BA2F', '#c99b1e'],
    'default': ['#6B7280', '#4B5563']
};

let walletData = null;
let transactions = [];
let recentBookings = [];
let walletPollingInterval = null;
const POLLING_INTERVAL = 10000; // 10 seconds

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
                    <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">Sign in to manage your earnings, deposits and withdrawals</p>
                    <button class="btn-primary" onclick="showAuthModal('signin')">Sign in to continue</button>
                </div>
            </div>
        `;
        return;
    }

    mainContent.innerHTML = `
        <div style="max-width: 680px; margin: 0 auto; padding: 32px 20px 60px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px;">
                <div>
                    <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 4px;">Wallet</h1>
                    <p style="color: var(--text-secondary); font-size: 14px; margin: 0;">Manage your funds</p>
                </div>
                <button onclick="window.location.reload()" style="display: flex; align-items: center; gap: 6px; background: rgba(151,71,255,0.08); border: 1px solid rgba(151,71,255,0.2); color: var(--primary); padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 1 16 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M4 12l-2-2m2 2l2-2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    Refresh
                </button>
            </div>
            <div id="walletContent" style="display:none;"></div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
            .wallet-action-btn {
                flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
                padding: 16px 12px; background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.25);
                border-radius: 16px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
                color: white; font-size: 13px; font-weight: 700;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .wallet-action-btn:hover { 
                background: rgba(255,255,255,0.25); 
                transform: translateY(-2px);
                border-color: rgba(255,255,255,0.4);
                box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            }
            .wallet-section { animation: fadeIn 0.3s ease; }
            .tx-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); margin-bottom: 8px; transition: all 0.2s ease; cursor: pointer; }
            .tx-item:hover { background: rgba(255,255,255,0.08); transform: translateX(4px); border-color: rgba(151,71,255,0.3); }
            .asset-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); margin-bottom: 8px; }
            .section-header { font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 12px; }
            .hash-link { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: var(--primary); text-decoration: none; opacity: 0.7; transition: opacity 0.2s; display: flex; align-items: center; gap: 4px; margin-top: 4px; }
            .hash-link:hover { opacity: 1; text-decoration: underline; }
        </style>
    `;

    window.showLoadingSpinner();

    try {
        const [walletResponse, transactionsResponse, bookingsResponse] = await Promise.all([
            api.getHostfiWallet(),
            api.getHostfiTransactions(1, 10),
            api.getBookings()
        ]);

        if (walletResponse.success) {
            walletData = walletResponse.data.wallet;
            window.walletData = walletData;
            transactions = transactionsResponse.data?.transactions || [];
            recentBookings = bookingsResponse.data?.bookings || [];

            window.hideLoadingSpinner();
            const content = document.getElementById('walletContent');
            content.style.display = 'block';
            content.innerHTML = buildWalletHTML();
        }
    } catch (error) {
        console.error('Failed to load wallet:', error);
        window.hideLoadingSpinner();
        document.getElementById('walletContent').style.display = 'block';
        document.getElementById('walletContent').innerHTML = `
            <div style="text-align: center; padding: 48px 20px;">
                <div style="width: 56px; height: 56px; background: rgba(239,68,68,0.1); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="color: #EF4444;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <h3 style="margin-bottom: 8px;">Failed to load wallet</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14px;">${error.message}</p>
                <button class="btn-primary" onclick="window.location.reload()">Try again</button>
            </div>
        `;
    }
}

/**
 * Perform a background sync of wallet data without spinners
 * to allow for a seamless "live" update experience.
 */
export async function syncWalletBackground() {
    if (!appState.user || appState.currentPage !== 'wallet') return;

    try {
        const [walletResponse, transactionsResponse] = await Promise.all([
            api.getHostfiWallet(),
            api.getHostfiTransactions(1, 10)
        ]);

        if (walletResponse.success) {
            const newData = walletResponse.data.wallet;
            const newTransactions = transactionsResponse.data?.transactions || [];

            // Detect changes before re-rendering to prevent unnecessary DOM flickering
            const currentTotal = walletData?.balance || 0;
            const newTotal = newData?.balance || 0;

            const currentTxCount = transactions?.length || 0;
            const newTxCount = newTransactions?.length || 0;

            if (currentTotal !== newTotal || currentTxCount !== newTxCount) {
                console.log('[Wallet Polling] Change detected, updating UI...');
                walletData = newData;
                window.walletData = walletData;
                transactions = newTransactions;

                const content = document.getElementById('walletContent');
                if (content && content.style.display === 'block') {
                    content.innerHTML = buildWalletHTML();
                }
            }
        }
    } catch (error) {
        // Silently fail background sync to avoid annoying the user
        console.warn('[Wallet Polling] Background sync failed:', error.message);
    }
}

/**
 * Start 10-second polling for wallet updates
 */
export function startWalletPolling() {
    if (walletPollingInterval) return;

    console.log('[Wallet Polling] Starting...');
    walletPollingInterval = setInterval(syncWalletBackground, POLLING_INTERVAL);
}

/**
 * Stop wallet polling
 */
export function stopWalletPolling() {
    if (walletPollingInterval) {
        console.log('[Wallet Polling] Stopping...');
        clearInterval(walletPollingInterval);
        walletPollingInterval = null;
    }
}

function buildWalletHTML() {
    const balance = walletData.balance || 0;
    const pendingBalance = walletData.pendingBalance || 0;
    const totalEarnings = walletData.totalEarnings || 0;
    const currency = walletData.currency || 'USDC';
    const currencySymbol = currencySymbols[currency] || '$';

    // Group and filter assets
    const groupedAssets = (walletData.assets || []).reduce((acc, asset) => {
        if (!acc[asset.currency]) {
            acc[asset.currency] = { ...asset, balance: 0, usdEquivalent: 0, networks: [] };
        }
        acc[asset.currency].balance += (asset.balance || 0);
        acc[asset.currency].usdEquivalent += (asset.usdEquivalent || 0);
        if (asset.colNetwork && !acc[asset.currency].networks.includes(asset.colNetwork)) {
            acc[asset.currency].networks.push(asset.colNetwork);
        }
        return acc;
    }, {});
    const activeAssets = Object.values(groupedAssets).filter(a => (a.balance || 0) > 0.00001);

    const walletAddr = walletData.address && !walletData.address.startsWith('pending_') ? walletData.address : null;

    return `
        <div class="wallet-section">
            <!-- BALANCE CARD -->
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); border-radius: 24px; padding: 28px; margin-bottom: 16px; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; background: rgba(255,255,255,0.07); border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -60px; left: -20px; width: 200px; height: 200px; background: rgba(255,255,255,0.04); border-radius: 50%;"></div>
                <div style="position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">Available Balance</div>
                            <div style="font-size: 42px; font-weight: 800; color: white; line-height: 1; letter-spacing: -1px;">${currencySymbol}${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div style="font-size: 13px; color: rgba(255,255,255,0.55); margin-top: 6px;">${currency} • Solana Network</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.12); border-radius: 12px; padding: 8px 12px; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9); border: 1px solid rgba(255,255,255,0.15);">Live</div>
                    </div>
                    <div style="display: flex; gap: 10px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.12);">
                        ${pendingBalance > 0 ? `
                        <div style="flex: 1; text-align: center;">
                            <div style="font-size: 11px; color: rgba(255,255,255,0.55); margin-bottom: 2px;">In Escrow</div>
                            <div style="font-size: 15px; font-weight: 700; color: #FBD38D;">${currencySymbol}${pendingBalance.toFixed(2)}</div>
                        </div>
                        <div style="width: 1px; background: rgba(255,255,255,0.12);"></div>
                        ` : ''}
                        <div style="flex: 1; text-align: center;">
                            <div style="font-size: 11px; color: rgba(255,255,255,0.55); margin-bottom: 2px;">Total Earned</div>
                            <div style="font-size: 15px; font-weight: 700; color: #9AE6B4;">${currencySymbol}${totalEarnings.toFixed(2)}</div>
                        </div>
                        ${walletAddr ? `
                        <div style="width: 1px; background: rgba(255,255,255,0.12);"></div>
                        <div style="flex: 1; text-align: center;">
                            <div style="font-size: 11px; color: rgba(255,255,255,0.55); margin-bottom: 2px;">Wallet</div>
                            <div style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); font-family: monospace;">${walletAddr.slice(0, 4)}...${walletAddr.slice(-4)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- ACTION BUTTONS -->
            <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                <button class="wallet-action-btn" onclick="window.fundWallet()">
                    <div style="width: 34px; height: 34px; background: rgba(151,71,255,0.25); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </div>
                    Deposit
                </button>
                <button class="wallet-action-btn" onclick="window.showWithdrawModal()">
                    <div style="width: 34px; height: 34px; background: rgba(251,146,60,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </div>
                    Withdraw
                </button>
                <button class="wallet-action-btn" onclick="showTransactionHistory()">
                    <div style="width: 34px; height: 34px; background: rgba(59,130,246,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M9 3v18" stroke="currentColor" stroke-width="2"/></svg>
                    </div>
                    History
                </button>
            </div>

            ${walletAddr ? `
            <!-- WALLET ADDRESS -->
            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; margin: 16px 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 8px; height: 8px; background: #10B981; border-radius: 50%;"></div>
                        <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">Solana USDC Address</span>
                    </div>
                    <button onclick="window.copyWalletAddress()" style="display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--primary); background: rgba(151,71,255,0.1); border: 1px solid rgba(151,71,255,0.2); padding: 5px 10px; border-radius: 8px; cursor: pointer;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/></svg>
                        Copy
                    </button>
                </div>
                <code id="walletAddress" style="display: block; font-size: 12px; color: var(--text-secondary); word-break: break-all; font-family: 'Courier New', monospace; line-height: 1.6; background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px;">${walletAddr}</code>
            </div>` : `
            <div style="background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.15); border-radius: 16px; padding: 16px; margin: 16px 0; display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; min-width: 36px; background: rgba(251,191,36,0.12); border-radius: 10px; display:flex; align-items:center; justify-content:center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color:#F59E0B;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <div>
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 2px;">Wallet initializing…</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Your Solana USDC address is being set up. Refresh in a moment.</div>
                </div>
            </div>
            `}

            <!-- ASSETS -->
            ${activeAssets.length > 0 ? `
            <div class="section-header">Assets</div>
            ${activeAssets.map(asset => {
        const [c1, c2] = assetColors[asset.currency] || assetColors.default;
        return `
                <div class="asset-row">
                    <div style="width: 40px; height: 40px; min-width: 40px; background: linear-gradient(135deg, ${c1}, ${c2}); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: white;">${asset.currency.slice(0, 2)}</div>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 700;">${asset.currency}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 1px;">${asset.networks.join(' · ') || 'HostFi'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 15px; font-weight: 700;">${(asset.balance || 0).toFixed(4)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">≈ $${(asset.usdEquivalent || asset.balance || 0).toFixed(2)}</div>
                    </div>
                </div>`;
    }).join('')}` : ''}

            <!-- RECENT TRANSACTIONS -->
            <div class="section-header">Recent Transactions</div>
            ${transactions.length > 0 ? `
                ${transactions.slice(0, 8).map(tx => {
        const isCredit = ['deposit', 'earning', 'bonus', 'refund'].includes(tx.type);
        const statusColor = tx.status === 'completed' ? '#10B981' : tx.status === 'failed' ? '#EF4444' : '#F59E0B';
        const amountColor = isCredit ? '#10B981' : '#EF4444';
        const iconBg = isCredit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)';
        return `
                    <div class="tx-item" onclick="window.showTransactionDetail('${tx._id || tx.id}')">
                        <div style="width: 40px; height: 40px; min-width: 40px; background: ${iconBg}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color: ${amountColor};">
                                ${isCredit
                ? '<path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
                : '<path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'}
                            </svg>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tx.description || (tx.type.charAt(0).toUpperCase() + tx.type.slice(1))}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${formatDate(tx.createdAt)}</div>
                            ${tx.transactionHash ? `
                                <a href="https://explorer.solana.com/tx/${tx.transactionHash}" target="_blank" class="hash-link" onclick="event.stopPropagation()">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                                    ${tx.transactionHash.slice(0, 6)}...${tx.transactionHash.slice(-6)}
                                </a>
                            ` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 15px; font-weight: 700; color: ${amountColor};">${isCredit ? '+' : '-'}${currencySymbols[tx.currency] || ''}${Math.abs(tx.amount).toFixed(2)}</div>
                            <div style="font-size: 11px; font-weight: 600; color: ${statusColor}; margin-top: 2px; text-transform: capitalize;">${tx.status}</div>
                        </div>
                    </div>`;
    }).join('')}
                <button onclick="showTransactionHistory()" style="width: 100%; margin-top: 8px; padding: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-secondary); transition: all 0.2s;">View all transactions →</button>
            ` : `
                <div style="text-align: center; padding: 36px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="opacity: 0.25; margin-bottom: 12px;"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="currentColor" stroke-width="2"/></svg>
                    <p style="color: var(--text-secondary); font-size: 14px; margin: 0;">No transactions yet</p>
                </div>
            `}

            <!-- RECENT BOOKINGS -->
            ${recentBookings.length > 0 ? `
            <div class="section-header">Active Bookings</div>
            ${recentBookings.filter(b => b.status !== 'cancelled').slice(0, 4).map(booking => {
        const isCreator = appState.user.role === 'creator';
        const name = isCreator ? booking.client?.name || 'Client' : booking.creator?.name || 'Creator';
        const statusColors = { completed: '#10B981', in_progress: '#3B82F6', confirmed: '#6366F1', awaiting_payment: '#F59E0B', pending: '#9CA3AF' };
        const sColor = statusColors[booking.status] || '#9CA3AF';
        const statusLabel = { completed: 'Completed', in_progress: 'In Progress', confirmed: 'Confirmed', awaiting_payment: 'Awaiting Payment', pending: 'Pending' }[booking.status] || booking.status;
        return `
                <div class="tx-item" onclick="window.location.href='/#/bookings'" style="cursor:pointer;">
                    <div style="width: 40px; height: 40px; min-width: 40px; background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2)); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: #818CF8;">${name.charAt(0).toUpperCase()}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${booking.serviceTitle || 'Booking'}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${name}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 15px; font-weight: 700;">$${(booking.amount || 0).toFixed(2)}</div>
                        <div style="font-size: 11px; font-weight: 600; color: ${sColor}; margin-top: 2px;">${statusLabel}</div>
                    </div>
                </div>`;
    }).join('')}
            <button onclick="window.location.href='/#/bookings'" style="width: 100%; margin-top: 8px; padding: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-secondary); transition: all 0.2s;">View all bookings →</button>
            ` : ''}
        </div>
    `;
}

window.fundWallet = function () { showAddFundsModal(); };
window.showSwapModal = function () { showSwapModal(); };
window.showWithdrawModal = function () { showWithdrawModal(); };
window.showTransactionHistory = function () { showTransactionHistory(); };
window.walletData = walletData;

window.copyWalletAddress = async function () {
    const address = walletData?.address;
    if (!address) return;
    try {
        await navigator.clipboard.writeText(address);
        showToast('Address copied!', 'success');
    } catch {
        const t = document.createElement('textarea');
        t.value = address; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); showToast('Address copied!', 'success'); }
        catch { showToast('Failed to copy', 'error'); }
        document.body.removeChild(t);
    }
};

window.checkTransactionStatus = async function (reference) {
    if (!reference) { showToast('No reference ID available', 'error'); return; }
    try {
        showToast('Checking status...', 'info');
        const response = await api.getHostfiWithdrawalStatus(reference);
        if (!response.success) throw new Error(response.message || 'Failed to get status');
        const withdrawal = response.data.withdrawal;
        if (!withdrawal) throw new Error('No status data returned');
        const status = (withdrawal.status || 'UNKNOWN').toUpperCase();
        showToast(
            `Status: ${status}\nAmount: ${withdrawal.amount} ${withdrawal.currency || 'USDC'}`,
            ['COMPLETED', 'SUCCESS'].includes(status) ? 'success' : (['FAILED', 'REVERSED'].includes(status) ? 'error' : 'info')
        );
        if (['COMPLETED', 'SUCCESS', 'FAILED', 'REVERSED'].includes(status)) {
            setTimeout(() => window.location.reload(), 2000);
        }
    } catch (error) {
        showToast(error.message || 'Failed to check status', 'error');
    }
};

export function getWalletData() { return walletData; }