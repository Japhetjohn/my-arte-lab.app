// Modal Components
import { appState, setUser } from '../state.js';
import { showToast, closeModal, openModal } from '../utils.js';
import { updateUserMenu } from '../auth.js';
import { navigateToPage } from '../navigation.js';
import api from '../services/api.js';

// Booking Modal
export function showBookingModal(creatorId, serviceIndex = 0) {
    const creator = appState.creators.find(c => c.id === creatorId);
    if (!creator) return;

    const service = creator.services[serviceIndex];

    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Request booking</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div class="booking-stepper mb-lg">
                    <div class="step active">
                        <div class="step-circle">1</div>
                        <div class="step-label">Details</div>
                    </div>
                    <div class="step">
                        <div class="step-circle">2</div>
                        <div class="step-label">Payment</div>
                    </div>
                    <div class="step">
                        <div class="step-circle">3</div>
                        <div class="step-label">Confirm</div>
                    </div>
                </div>

                <div style="background: var(--background-alt); padding: 16px; border-radius: var(--radius); margin-bottom: 24px;">
                    <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 8px;">
                        <img src="${creator.avatar}" style="width: 40px; height: 40px; border-radius: 50%;" alt="${creator.name}">
                        <div>
                            <div style="font-weight: 600;">${creator.name}</div>
                            <div class="caption">${service.title}</div>
                        </div>
                    </div>
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary);">${service.price}</div>
                </div>

                <form onsubmit="handleBookingSubmit(event, ${creatorId}, ${serviceIndex})">
                    <div class="form-group">
                        <label class="form-label">Select date</label>
                        <input type="date" class="form-input" required min="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Preferred time</label>
                        <input type="time" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Project brief (300 characters)</label>
                        <textarea class="form-textarea" maxlength="300" placeholder="Tell us about your project..." required></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Attach files (optional)</label>
                        <input type="file" class="form-input" multiple>
                    </div>

                    <div class="alert alert-success">
                        <strong>Escrow protection:</strong> Your payment is held securely until you confirm delivery.
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Continue to payment</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

export function handleBookingSubmit(event, creatorId, serviceIndex) {
    event.preventDefault();
    closeModal();
    showToast('Booking request sent successfully!', 'success');
    setTimeout(() => navigateToPage('bookings'), 1500);
}

export function handleBookNow(creatorId) {
    if (!appState.user) {
        window.showAuthModal('signin');
    } else {
        showBookingModal(creatorId);
    }
}

export function openLightbox(creatorId, imageIndex) {
    const creator = appState.creators.find(c => c.id === creatorId);
    if (!creator) return;

    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 900px; padding: 0; background: transparent; box-shadow: none;">
                <button class="icon-btn" onclick="closeModal()" style="position: absolute; top: 20px; right: 20px; background: white; z-index: 10;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <img src="${creator.portfolio[imageIndex]}" style="width: 100%; border-radius: var(--radius);" alt="Portfolio image">
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

// Make functions available globally for inline onclick handlers
window.handleBookNow = handleBookNow;
window.handleBookingSubmit = handleBookingSubmit;
window.openLightbox = openLightbox;
window.showBookingModal = showBookingModal;

// Settings/Profile Handlers
export async function handleProfileUpdate(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const profileData = {
            name: document.getElementById('profileName').value,
            email: document.getElementById('profileEmail').value,
            bio: document.getElementById('profileBio').value,
            location: {
                city: document.getElementById('profileLocation')?.value
            }
        };

        // Add creator-specific fields
        if (appState.user.role === 'creator') {
            const skills = document.getElementById('profileSkills')?.value;
            if (skills) {
                profileData.skills = skills.split(',').map(s => s.trim());
            }
            if (document.getElementById('profileCategory')) {
                profileData.category = document.getElementById('profileCategory').value;
            }
        }

        const response = await api.updateProfile(profileData);

        if (response.success) {
            setUser(response.data.user);
            updateUserMenu();
            showToast('Profile updated successfully!', 'success');
        }
    } catch (error) {
        console.error('Profile update failed:', error);
        showToast(error.message || 'Failed to update profile', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

export function handleAvatarUpload() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }

        try {
            showToast('Uploading avatar...', 'info');

            const response = await api.uploadAvatar(file);

            if (response.success) {
                // Update user state
                appState.user.avatar = response.data.avatar;
                setUser(appState.user);
                updateUserMenu();

                showToast('Avatar updated successfully!', 'success');

                // Refresh the settings page if we're on it
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            console.error('Avatar upload failed:', error);
            showToast(error.message || 'Failed to upload avatar', 'error');
        }
    };

    input.click();
}

export function handleCoverUpload() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }

        try {
            showToast('Uploading cover image...', 'info');

            const response = await api.uploadCover(file);

            if (response.success) {
                // Update user state
                appState.user.coverImage = response.data.coverImage;
                setUser(appState.user);

                showToast('Cover image updated successfully!', 'success');

                // Refresh the page to show new cover
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            console.error('Cover upload failed:', error);
            showToast(error.message || 'Failed to upload cover image', 'error');
        }
    };

    input.click();
}

export function showChangePasswordModal() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Change Password</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <form onsubmit="handlePasswordChange(event)" style="padding: 20px;">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <input type="password" id="currentPassword" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="newPassword" class="form-input" required minlength="8">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" id="confirmPassword" class="form-input" required minlength="8">
                    </div>

                    <button type="submit" class="btn-primary" style="width: 100%; margin-top: 16px;">
                        Change Password
                    </button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

window.handlePasswordChange = async function(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Changing...';

        const response = await api.updatePassword({
            currentPassword,
            newPassword
        });

        if (response.success) {
            closeModal();
            showToast('Password changed successfully!', 'success');
        }
    } catch (error) {
        console.error('Password change failed:', error);
        showToast(error.message || 'Failed to change password', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

export function showTwoFactorModal() {
    showToast('Two-factor authentication setup coming soon!', 'success');
}

export function showDeleteAccountModal() {
    showToast('Account deletion is not available in demo mode', 'success');
}

// Wallet Handlers
export function showWithdrawModal() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Withdraw Funds</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <form onsubmit="handleWithdrawal(event)" style="padding: 20px;">
                    <div class="form-group">
                        <label class="form-label">Amount (USDT)</label>
                        <input type="number" id="withdrawAmount" class="form-input" required min="20" step="0.01" placeholder="Minimum: 20 USDT">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Wallet Address (Solana)</label>
                        <input type="text" id="withdrawAddress" class="form-input" required placeholder="Enter your Solana wallet address">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Currency</label>
                        <select id="withdrawCurrency" class="form-select">
                            <option value="USDT">USDT</option>
                            <option value="USDC">USDC</option>
                            <option value="DAI">DAI</option>
                        </select>
                    </div>

                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 16px;">
                        💡 Minimum withdrawal: 20 USDT. Funds will be sent to your Solana wallet within 24-48 hours.
                    </div>

                    <button type="submit" class="btn-primary" style="width: 100%;">
                        Request Withdrawal
                    </button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

window.handleWithdrawal = async function(event) {
    event.preventDefault();

    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const address = document.getElementById('withdrawAddress').value;
    const currency = document.getElementById('withdrawCurrency').value;

    if (amount < 20) {
        showToast('Minimum withdrawal amount is 20 USDT', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        const response = await api.requestWithdrawal({
            amount,
            externalAddress: address,
            currency
        });

        if (response.success) {
            closeModal();
            showToast('Withdrawal request submitted successfully!', 'success');

            // Reload wallet page to show updated balance
            setTimeout(() => window.location.reload(), 1500);
        }
    } catch (error) {
        console.error('Withdrawal failed:', error);
        showToast(error.message || 'Failed to process withdrawal', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

export function showAddFundsModal() {
    showToast('Add funds feature coming soon!', 'success');
}

export function showPayoutSettings() {
    showToast('Payout settings coming soon!', 'success');
}

export function showTransactionHistory() {
    showToast('Full transaction history coming soon!', 'success');
}

export function showEarningsReport() {
    showToast('Earnings reports coming soon!', 'success');
}
