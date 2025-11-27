/**
 * Onramp Modal Component
 * Handles fiat deposits via bank transfer and mobile money
 */

import api from '../services/api.js';
import { showToast } from '../utils/toast.js';

/**
 * Show main onramp modal with deposit options
 */
export function showOnrampModal() {
    const modalHTML = `
        <div class="modal fade" id="onrampModal" tabindex="-1" aria-labelledby="onrampModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="onrampModalLabel">Fund Wallet</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-4">Choose your preferred deposit method</p>

                        <div class="d-grid gap-3">
                            <!-- Bank Transfer Option -->
                            <div class="card deposit-option" onclick="window.showBankTransferDeposit()" style="cursor: pointer;">
                                <div class="card-body d-flex align-items-center">
                                    <div class="deposit-icon me-3">
                                        <i class="bi bi-bank2 fs-2 text-primary"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <h6 class="mb-1">Bank Transfer</h6>
                                        <small class="text-muted">Deposit from your bank account</small>
                                    </div>
                                    <i class="bi bi-chevron-right text-muted"></i>
                                </div>
                            </div>

                            <!-- Mobile Money Option -->
                            <div class="card deposit-option" onclick="window.showMobileMoneyDeposit()" style="cursor: pointer;">
                                <div class="card-body d-flex align-items-center">
                                    <div class="deposit-icon me-3">
                                        <i class="bi bi-phone fs-2 text-success"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <h6 class="mb-1">Mobile Money</h6>
                                        <small class="text-muted">MTN, Airtel, Glo, 9mobile</small>
                                    </div>
                                    <i class="bi bi-chevron-right text-muted"></i>
                                </div>
                            </div>

                            <!-- Crypto Option (Existing) -->
                            <div class="card deposit-option" onclick="window.showCryptoDeposit()" style="cursor: pointer;">
                                <div class="card-body d-flex align-items-center">
                                    <div class="deposit-icon me-3">
                                        <i class="bi bi-currency-bitcoin fs-2 text-warning"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <h6 class="mb-1">Crypto (Direct)</h6>
                                        <small class="text-muted">Send USDC to your wallet address</small>
                                    </div>
                                    <i class="bi bi-chevron-right text-muted"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('onrampModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = new bootstrap.Modal(document.getElementById('onrampModal'));
    modal.show();
}

/**
 * Show bank transfer deposit form
 */
export function showBankTransferDeposit() {
    const modalHTML = `
        <div class="modal fade" id="bankTransferModal" tabindex="-1" aria-labelledby="bankTransferModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="bankTransferModalLabel">
                            <i class="bi bi-bank2 me-2"></i>Bank Transfer Deposit
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="bankTransferForm">
                            <div class="mb-3">
                                <label for="amountNGN" class="form-label">Amount (NGN)</label>
                                <div class="input-group">
                                    <span class="input-group-text">₦</span>
                                    <input type="number" class="form-control" id="amountNGN" min="1000" step="100" required>
                                </div>
                                <small class="text-muted">Minimum: ₦1,000</small>
                            </div>

                            <div id="exchangeRateDisplay" class="alert alert-info" style="display: none;">
                                <div class="d-flex justify-content-between">
                                    <span>You will receive:</span>
                                    <strong id="usdcEquivalent">0.00 USDC</strong>
                                </div>
                                <small class="text-muted">Rate: ₦<span id="exchangeRate">0</span> = 1 USDC</small>
                            </div>

                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-arrow-right-circle me-2"></i>Continue
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('bankTransferModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.getElementById('onrampModal')?.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = new bootstrap.Modal(document.getElementById('bankTransferModal'));
    modal.show();

    const amountInput = document.getElementById('amountNGN');
    let debounceTimer;

    amountInput.addEventListener('input', async (e) => {
        clearTimeout(debounceTimer);
        const amount = parseFloat(e.target.value);

        if (amount >= 1000) {
            debounceTimer = setTimeout(async () => {
                try {
                    const rateData = await api.getExchangeRate('NGN', 'USDC', amount);
                    document.getElementById('exchangeRateDisplay').style.display = 'block';
                    document.getElementById('usdcEquivalent').textContent = `${rateData.convertedAmount.toFixed(2)} USDC`;
                    document.getElementById('exchangeRate').textContent = rateData.rate.toLocaleString();
                } catch (error) {
                    console.error('Failed to fetch exchange rate:', error);
                }
            }, 500);
        } else {
            document.getElementById('exchangeRateDisplay').style.display = 'none';
        }
    });

    document.getElementById('bankTransferForm').addEventListener('submit', handleBankTransferDeposit);
}

/**
 * Show mobile money deposit form
 */
export function showMobileMoneyDeposit() {
    const modalHTML = `
        <div class="modal fade" id="mobileMoneyModal" tabindex="-1" aria-labelledby="mobileMoneyModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="mobileMoneyModalLabel">
                            <i class="bi bi-phone me-2"></i>Mobile Money Deposit
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="mobileMoneyForm">
                            <div class="mb-3">
                                <label for="mobileProvider" class="form-label">Provider</label>
                                <select class="form-select" id="mobileProvider" required>
                                    <option value="">Select provider</option>
                                    <option value="MTN">MTN Mobile Money</option>
                                    <option value="AIRTEL">Airtel Money</option>
                                    <option value="GLO">Glo Mobile Money</option>
                                    <option value="9MOBILE">9mobile Money</option>
                                </select>
                            </div>

                            <div class="mb-3">
                                <label for="phoneNumber" class="form-label">Phone Number</label>
                                <input type="tel" class="form-control" id="phoneNumber" placeholder="08012345678" required>
                            </div>

                            <div class="mb-3">
                                <label for="mobileAmountNGN" class="form-label">Amount (NGN)</label>
                                <div class="input-group">
                                    <span class="input-group-text">₦</span>
                                    <input type="number" class="form-control" id="mobileAmountNGN" min="1000" step="100" required>
                                </div>
                                <small class="text-muted">Minimum: ₦1,000</small>
                            </div>

                            <div id="mobileExchangeRateDisplay" class="alert alert-info" style="display: none;">
                                <div class="d-flex justify-content-between">
                                    <span>You will receive:</span>
                                    <strong id="mobileUsdcEquivalent">0.00 USDC</strong>
                                </div>
                                <small class="text-muted">Rate: ₦<span id="mobileExchangeRate">0</span> = 1 USDC</small>
                            </div>

                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-arrow-right-circle me-2"></i>Continue
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('mobileMoneyModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.getElementById('onrampModal')?.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = new bootstrap.Modal(document.getElementById('mobileMoneyModal'));
    modal.show();

    const amountInput = document.getElementById('mobileAmountNGN');
    let debounceTimer;

    amountInput.addEventListener('input', async (e) => {
        clearTimeout(debounceTimer);
        const amount = parseFloat(e.target.value);

        if (amount >= 1000) {
            debounceTimer = setTimeout(async () => {
                try {
                    const rateData = await api.getExchangeRate('NGN', 'USDC', amount);
                    document.getElementById('mobileExchangeRateDisplay').style.display = 'block';
                    document.getElementById('mobileUsdcEquivalent').textContent = `${rateData.convertedAmount.toFixed(2)} USDC`;
                    document.getElementById('mobileExchangeRate').textContent = rateData.rate.toLocaleString();
                } catch (error) {
                    console.error('Failed to fetch exchange rate:', error);
                }
            }, 500);
        } else {
            document.getElementById('mobileExchangeRateDisplay').style.display = 'none';
        }
    });

    document.getElementById('mobileMoneyForm').addEventListener('submit', handleMobileMoneyDeposit);
}

/**
 * Show crypto (Solana) deposit - existing wallet address
 */
export function showCryptoDeposit() {
    const walletData = window.walletData || {};
    const address = walletData.wallet?.address || 'Loading...';

    const modalHTML = `
        <div class="modal fade" id="cryptoDepositModal" tabindex="-1" aria-labelledby="cryptoDepositModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="cryptoDepositModalLabel">
                            <i class="bi bi-currency-bitcoin me-2"></i>Crypto Deposit
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted">Send USDC to your Solana wallet address:</p>

                        <div class="card bg-light">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <code class="text-break" id="walletAddressDisplay">${address}</code>
                                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="window.copyWalletAddress()">
                                        <i class="bi bi-clipboard"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="alert alert-warning mt-3">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            <strong>Important:</strong> Only send USDC on the Solana network to this address.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('cryptoDepositModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.getElementById('onrampModal')?.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = new bootstrap.Modal(document.getElementById('cryptoDepositModal'));
    modal.show();
}

/**
 * Handle bank transfer deposit submission
 */
async function handleBankTransferDeposit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

    try {
        const amountNGN = parseFloat(document.getElementById('amountNGN').value);

        const response = await api.initiateBankTransferOnramp(amountNGN);

        document.getElementById('bankTransferModal')?.remove();

        renderPaymentInstructions(response.data, 'bank');

        showToast('Bank transfer initiated successfully!', 'success');

    } catch (error) {
        console.error('Bank transfer failed:', error);
        showToast(error.message || 'Failed to initiate bank transfer', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

/**
 * Handle mobile money deposit submission
 */
async function handleMobileMoneyDeposit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

    try {
        const provider = document.getElementById('mobileProvider').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        const amountNGN = parseFloat(document.getElementById('mobileAmountNGN').value);

        const response = await api.initiateMobileMoneyOnramp({
            provider,
            phoneNumber,
            amountNGN
        });

        document.getElementById('mobileMoneyModal')?.remove();

        renderPaymentInstructions(response.data, 'mobile');

        showToast('Mobile money deposit initiated successfully!', 'success');

    } catch (error) {
        console.error('Mobile money deposit failed:', error);
        showToast(error.message || 'Failed to initiate mobile money deposit', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

/**
 * Render payment instructions after initiating deposit
 */
function renderPaymentInstructions(data, type) {
    const { paymentInstructions, amountNGN, amountUSDC, exchangeRate } = data;

    let instructionsHTML = '';

    if (type === 'bank') {
        instructionsHTML = `
            <div class="card">
                <div class="card-body">
                    <h6 class="mb-3">Bank Account Details</h6>
                    <div class="mb-2">
                        <small class="text-muted">Account Number</small>
                        <div class="d-flex justify-content-between align-items-center">
                            <strong>${paymentInstructions.accountNumber}</strong>
                            <button class="btn btn-sm btn-outline-primary" onclick="navigator.clipboard.writeText('${paymentInstructions.accountNumber}')">
                                <i class="bi bi-clipboard"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">Account Name</small>
                        <p class="mb-0"><strong>${paymentInstructions.accountName}</strong></p>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">Bank Name</small>
                        <p class="mb-0"><strong>${paymentInstructions.bankName}</strong></p>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">Reference</small>
                        <div class="d-flex justify-content-between align-items-center">
                            <code>${paymentInstructions.reference}</code>
                            <button class="btn btn-sm btn-outline-primary" onclick="navigator.clipboard.writeText('${paymentInstructions.reference}')">
                                <i class="bi bi-clipboard"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'mobile') {
        instructionsHTML = `
            <div class="card">
                <div class="card-body">
                    <h6 class="mb-3">Payment Instructions</h6>
                    ${paymentInstructions.ussdCode ? `
                        <div class="mb-2">
                            <small class="text-muted">USSD Code</small>
                            <div class="d-flex justify-content-between align-items-center">
                                <code class="fs-5">${paymentInstructions.ussdCode}</code>
                                <button class="btn btn-sm btn-outline-primary" onclick="navigator.clipboard.writeText('${paymentInstructions.ussdCode}')">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            </div>
                        </div>
                    ` : ''}
                    <div class="mb-2">
                        <small class="text-muted">Phone Number</small>
                        <p class="mb-0"><strong>${paymentInstructions.phoneNumber}</strong></p>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">Reference</small>
                        <p class="mb-0"><code>${paymentInstructions.reference}</code></p>
                    </div>
                </div>
            </div>
        `;
    }

    const modalHTML = `
        <div class="modal fade" id="paymentInstructionsModal" tabindex="-1" aria-labelledby="paymentInstructionsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="paymentInstructionsModalLabel">
                            <i class="bi bi-check-circle text-success me-2"></i>Payment Instructions
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <div class="d-flex justify-content-between mb-2">
                                <span>Amount:</span>
                                <strong>₦${amountNGN.toLocaleString()}</strong>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span>You will receive:</span>
                                <strong>${amountUSDC.toFixed(2)} USDC</strong>
                            </div>
                            <small class="text-muted">Rate: ₦${exchangeRate.toLocaleString()} = 1 USDC</small>
                        </div>

                        ${instructionsHTML}

                        <div class="alert alert-warning mt-3">
                            <i class="bi bi-clock me-2"></i>
                            Your wallet will be credited automatically once payment is confirmed (usually within 5-15 minutes).
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = new bootstrap.Modal(document.getElementById('paymentInstructionsModal'));
    modal.show();

    document.getElementById('paymentInstructionsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
        if (window.renderWalletPage) {
            window.renderWalletPage();
        }
    });
}

// Export functions to window for onclick handlers
window.showOnrampModal = showOnrampModal;
window.showBankTransferDeposit = showBankTransferDeposit;
window.showMobileMoneyDeposit = showMobileMoneyDeposit;
window.showCryptoDeposit = showCryptoDeposit;
