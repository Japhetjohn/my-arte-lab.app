// Wallet Page Module
import { appState } from '../state.js';
import { formatDate } from '../utils.js';

export function renderWalletPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
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

                <div class="balance-card">
                    <div class="balance-label">Available balance</div>
                    <div class="balance-amount">$${appState.wallet.balance.toFixed(2)}</div>
                    <div class="balance-actions">
                        <button class="btn-primary" style="background: white; color: var(--primary);" onclick="showWithdrawModal()">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="margin-right: 8px; vertical-align: middle;">
                                <path d="M10 14V6M7 9l3-3 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <rect x="3" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Withdraw
                        </button>
                        <button class="btn-secondary" style="border-color: white; color: white;" onclick="showAddFundsModal()">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="margin-right: 8px; vertical-align: middle;">
                                <path d="M10 6v8M6 10h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Add funds
                        </button>
                    </div>
                </div>

                <div class="wallet-cards-grid mt-lg">
                    <div class="wallet-card-item">
                        <div class="wallet-card-icon" style="background: rgba(151, 71, 255, 0.1);">
                            💰
                        </div>
                        <div class="wallet-card-label">Total earnings</div>
                        <div class="wallet-card-value">$${appState.wallet.totalEarnings.toFixed(2)}</div>
                    </div>

                    <div class="wallet-card-item">
                        <div class="wallet-card-icon" style="background: rgba(255, 165, 0, 0.1);">
                            ⏳
                        </div>
                        <div class="wallet-card-label">Pending</div>
                        <div class="wallet-card-value" style="color: #FFA500;">$${appState.wallet.pending.toFixed(2)}</div>
                    </div>

                    <div class="wallet-card-item">
                        <div class="wallet-card-icon" style="background: rgba(16, 185, 129, 0.1);">
                            ✓
                        </div>
                        <div class="wallet-card-label">Withdrawn</div>
                        <div class="wallet-card-value" style="color: var(--success);">$${appState.wallet.withdrawn.toFixed(2)}</div>
                    </div>
                </div>

                <div class="mt-lg">
                    <h3 class="mb-md">Quick actions</h3>
                    <div class="quick-actions-grid">
                        <button class="quick-action-btn" onclick="showWithdrawModal()">
                            <div class="quick-action-icon">💸</div>
                            <div class="quick-action-label">Withdraw</div>
                        </button>
                        <button class="quick-action-btn" onclick="showPayoutSettings()">
                            <div class="quick-action-icon">🏦</div>
                            <div class="quick-action-label">Payout methods</div>
                        </button>
                        <button class="quick-action-btn" onclick="showTransactionHistory()">
                            <div class="quick-action-icon">📊</div>
                            <div class="quick-action-label">History</div>
                        </button>
                        <button class="quick-action-btn" onclick="showEarningsReport()">
                            <div class="quick-action-icon">📈</div>
                            <div class="quick-action-label">Reports</div>
                        </button>
                    </div>
                </div>

                <h2 class="mb-md mt-lg">Recent transactions</h2>
                <div class="transaction-list">
                    ${appState.wallet.transactions.slice(0, 5).map(transaction => `
                        <div class="transaction-item">
                            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${transaction.type === 'credit' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                    ${transaction.type === 'credit' ? '↓' : '↑'}
                                </div>
                                <div class="transaction-info">
                                    <div class="transaction-title">${transaction.title}</div>
                                    <div class="transaction-date">${transaction.description} • ${formatDate(transaction.date)}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                ${transaction.status === 'pending' ? `<div class="caption" style="color: #FFA500; margin-bottom: 4px;">Pending</div>` : ''}
                                <div class="transaction-amount ${transaction.type === 'credit' ? 'positive' : 'negative'}">
                                    ${transaction.amount > 0 ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="text-center mt-md">
                    <button class="btn-ghost" onclick="showTransactionHistory()">View all transactions</button>
                </div>
            </div>
        </div>
    `;
}
