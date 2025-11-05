// Modal Components
import { appState, setUser } from '../state.js';
import { showToast, closeModal, openModal } from '../utils.js';
import { updateUserMenu } from '../auth.js';
import { navigateToPage } from '../navigation.js';

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

// Settings/Profile Handlers
export function handleProfileUpdate(event) {
    event.preventDefault();

    appState.user.name = document.getElementById('profileName').value;
    appState.user.email = document.getElementById('profileEmail').value;
    appState.user.bio = document.getElementById('profileBio').value;
    appState.user.location = document.getElementById('profileLocation').value;
    appState.user.phone = document.getElementById('profilePhone').value;

    if (appState.user.type === 'creator') {
        appState.user.role = document.getElementById('profileRole').value;
        appState.user.skills = document.getElementById('profileSkills').value;
    }

    updateUserMenu();
    showToast('Profile updated successfully!', 'success');
}

export function handleAvatarUpload() {
    showToast('Avatar upload feature coming soon!', 'success');
}

export function handleCoverUpload() {
    showToast('Cover image upload feature coming soon!', 'success');
}

export function showChangePasswordModal() {
    showToast('Change password feature coming soon!', 'success');
}

export function showTwoFactorModal() {
    showToast('Two-factor authentication setup coming soon!', 'success');
}

export function showDeleteAccountModal() {
    showToast('Account deletion is not available in demo mode', 'success');
}

// Wallet Handlers
export function showWithdrawModal() {
    showToast('Withdraw feature coming soon!', 'success');
}

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
