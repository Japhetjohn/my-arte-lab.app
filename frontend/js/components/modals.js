// Modal Components
import { appState, setUser } from '../state.js';
import { showToast, closeModal, openModal } from '../utils.js';
import { updateUserMenu } from '../auth.js';
import { navigateToPage } from '../navigation.js';
import api from '../services/api.js';

// Booking Modal
export async function showBookingModal(creatorId, serviceIndex = 0) {
    // Try to find creator in appState first
    let creator = appState.creators?.find(c => c.id === creatorId);

    // If not found, fetch from API
    if (!creator) {
        try {
            const response = await api.getCreatorProfile(creatorId);
            if (response.success) {
                const apiCreator = response.data.creator;
                creator = {
                    id: apiCreator._id || apiCreator.id,
                    name: apiCreator.name || 'Unknown Creator',
                    avatar: apiCreator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiCreator.name || 'User')}&background=9747FF&color=fff&bold=true`,
                    role: apiCreator.category ? apiCreator.category.charAt(0).toUpperCase() + apiCreator.category.slice(1) : 'Creator',
                    location: apiCreator.location ?
                        (typeof apiCreator.location === 'object' ?
                            `${apiCreator.location.city || ''}${apiCreator.location.city && apiCreator.location.country ? ', ' : ''}${apiCreator.location.country || ''}`.trim()
                            : apiCreator.location)
                        : 'Nigeria',
                    rating: apiCreator.rating?.average?.toFixed(1) || '0.0',
                    reviewCount: apiCreator.rating?.count || 0,
                    verified: apiCreator.isVerified || false,
                    services: apiCreator.services || [],
                    portfolio: apiCreator.portfolio || [],
                    _id: apiCreator._id,
                    category: apiCreator.category
                };

                // Add to appState so handleBookingSubmit can find it
                if (!appState.creators) {
                    appState.creators = [];
                }
                appState.creators.push(creator);
            }
        } catch (error) {
            console.error('Failed to load creator:', error);
            showToast('Failed to load creator details', 'error');
            return;
        }
    }

    if (!creator) {
        console.error('Creator not found:', creatorId);
        showToast('Creator not found', 'error');
        return;
    }

    // Check if creator has services
    if (!creator.services || creator.services.length === 0) {
        showToast('This creator has not set up any services yet', 'info');
        return;
    }

    const service = creator.services[serviceIndex];

    // Use uploaded avatar if available, otherwise use default with initials
    const avatarUrl = creator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || 'User')}&background=9747FF&color=fff&bold=true`;

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
                        <div class="step-label">Request</div>
                    </div>
                    <div class="step">
                        <div class="step-circle">2</div>
                        <div class="step-label">Approval</div>
                    </div>
                    <div class="step">
                        <div class="step-circle">3</div>
                        <div class="step-label">Payment</div>
                    </div>
                </div>

                <div style="background: var(--background-alt); padding: 16px; border-radius: var(--radius); margin-bottom: 24px;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%;" alt="${creator.name}">
                        <div>
                            <div style="font-weight: 600;">${creator.name}</div>
                            <div class="caption">${service.title}</div>
                        </div>
                    </div>
                </div>

                <div style="background: #FEF3C7; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
                    <div style="color: #92400E; font-size: 14px; font-weight: 500; margin-bottom: 8px;">
                        📋 How it works:
                    </div>
                    <ol style="color: #92400E; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>Submit your booking request with your proposed budget</li>
                        <li>The creator reviews and accepts/rejects/counter-proposes</li>
                        <li>Once accepted, you'll receive a payment link via email</li>
                        <li>Complete payment to confirm the booking</li>
                    </ol>
                </div>

                <form id="bookingForm" data-creator-id="${creatorId}" data-service-index="${serviceIndex}">
                    <div class="form-group">
                        <label class="form-label">Your Budget (USDC)</label>
                        <input type="number" id="proposedPrice" name="proposedPrice" class="form-input" required min="1" step="0.01" placeholder="e.g., 500">
                        <div class="caption mt-sm">Enter the amount you're willing to pay for this service</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Select date</label>
                        <input type="date" id="bookingDate" name="bookingDate" class="form-input" required min="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Preferred time</label>
                        <input type="time" id="bookingTime" name="bookingTime" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Project brief (300 characters)</label>
                        <textarea id="projectBrief" name="projectBrief" class="form-textarea" maxlength="300" placeholder="Tell us about your project..." required></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Attach files (optional)</label>
                        <input type="file" class="form-input" multiple>
                    </div>

                    <div class="alert alert-success">
                        <strong>No payment required yet!</strong> The creator will review your request first. Payment is only processed after they accept.
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn-primary" id="submitBookingBtn">Send Booking Request</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    // Attach form submit handler after modal is rendered
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const creatorId = this.dataset.creatorId;
            const serviceIndex = parseInt(this.dataset.serviceIndex);
            handleBookingSubmit(e, creatorId, serviceIndex);
            return false;
        });
    }
}

export async function handleBookingSubmit(event, creatorId, serviceIndex) {
    event.preventDefault();
    event.stopPropagation();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating booking...';

        // Find creator in appState
        const creator = appState.creators?.find(c => c.id === creatorId);

        if (!creator) {
            throw new Error('Creator not found. Please try again.');
        }

        if (!creator.services || !creator.services[serviceIndex]) {
            throw new Error('Service not found. Please try again.');
        }

        const service = creator.services[serviceIndex];

        const bookingData = {
            creatorId: creator._id || creator.id,
            serviceTitle: service.title,
            serviceDescription: service.description || '',
            category: creator.category || 'other',
            amount: parseFloat(document.getElementById('proposedPrice').value),
            currency: 'USDC',
            startDate: document.getElementById('bookingDate').value,
            preferredTime: document.getElementById('bookingTime').value,
            projectBrief: document.getElementById('projectBrief').value
        };

        console.log('📤 Submitting booking:', bookingData);

        const response = await api.createBooking(bookingData);

        console.log('📥 Booking response:', response);

        if (response.success) {
            closeModal();
            showToast('✅ Booking request sent to creator! You will be notified when they respond.', 'success');
            setTimeout(() => navigateToPage('bookings'), 2000);
        } else {
            throw new Error(response.message || 'Failed to send booking request');
        }
    } catch (error) {
        console.error('❌ Booking submission failed:', error);
        showToast(error.message || 'Failed to create booking request', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
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
                // Fetch fresh user data from the API to ensure we have the latest
                const freshUserData = await api.getMe();
                if (freshUserData.success) {
                    setUser(freshUserData.data.user);
                    updateUserMenu();
                }

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
                // Fetch fresh user data from the API to ensure we have the latest
                const freshUserData = await api.getMe();
                if (freshUserData.success) {
                    setUser(freshUserData.data.user);
                    updateUserMenu();
                }

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
                        <label class="form-label">Amount (USDC)</label>
                        <input type="number" id="withdrawAmount" class="form-input" required min="20" step="0.01" placeholder="Minimum: 20 USDC">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Wallet Address (Solana)</label>
                        <input type="text" id="withdrawAddress" class="form-input" required placeholder="Enter your Solana wallet address">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Currency</label>
                        <select id="withdrawCurrency" class="form-select">
                            <option value="USDC" selected>USDC</option>
                            <option value="USDT">USDT</option>
                            <option value="DAI">DAI</option>
                        </select>
                    </div>

                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 16px;">
                        💡 Minimum withdrawal: 20 USDC. Funds will be sent to your Solana wallet within 24-48 hours.
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
        showToast('Minimum withdrawal amount is 20 USDC', 'error');
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
