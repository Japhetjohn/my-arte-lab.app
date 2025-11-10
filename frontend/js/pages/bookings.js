// Bookings Page Module
import { appState } from '../state.js';
import { formatDate, formatStatus, getStatusColor } from '../utils.js';
import api from '../services/api.js';

let bookings = [];

export async function renderBookingsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <h3>Sign in to view your bookings</h3>
                <p>Keep track of all your active and completed jobs</p>
                <button class="btn-primary" onclick="showAuthModal('signin')">Sign in</button>
            </div>
        `;
        return;
    }

    // Show loading state
    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <h1 class="mb-lg">Bookings</h1>
                <div class="text-center" style="padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
                    <p class="text-secondary">Loading bookings...</p>
                </div>
            </div>
        </div>
    `;

    try {
        // Load bookings from API
        const response = await api.getBookings();

        if (response.success) {
            bookings = response.data.bookings || [];
            renderBookingsList();
        }
    } catch (error) {
        console.error('Failed to load bookings:', error);
        mainContent.innerHTML = `
            <div class="section">
                <div class="container">
                    <div class="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>Failed to load bookings</h3>
                        <p>${error.message}</p>
                        <button class="btn-primary" onclick="window.location.reload()">Try again</button>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderBookingsList() {
    const mainContent = document.getElementById('mainContent');

    const activeBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status));
    const completedBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <h1 class="mb-lg">Bookings</h1>

                <h2 class="mb-md">Active bookings</h2>
                ${activeBookings.length > 0 ? `
                    <div class="transaction-list mb-lg">
                        ${activeBookings.map(booking => renderBookingCard(booking)).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <h3>No active bookings</h3>
                        <p>Your active jobs will appear here</p>
                        ${appState.user.role === 'client' ? '<button class="btn-primary" onclick="navigateToPage(\'discover\')">Find creators</button>' : ''}
                    </div>
                `}

                <h2 class="mb-md mt-lg">Booking history</h2>
                ${completedBookings.length > 0 ? `
                    <div class="transaction-list">
                        ${completedBookings.map(booking => renderBookingCard(booking)).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>No booking history yet</h3>
                        <p>Your completed jobs will appear here</p>
                        ${appState.user.role === 'client' ? '<button class="btn-primary" onclick="navigateToPage(\'discover\')">Find creators</button>' : ''}
                    </div>
                `}
            </div>
        </div>
    `;
}

function renderBookingCard(booking) {
    // Get the other party's info based on user role
    const isCreator = appState.user.role === 'creator';
    const otherPartyName = isCreator ? booking.client?.name || 'Client' : booking.creator?.name || 'Creator';
    const otherPartyAvatar = isCreator
        ? booking.client?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
        : booking.creator?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop';

    return `
        <div class="transaction-item" style="cursor: pointer;" onclick="window.viewBookingDetails('${booking._id}')">
            <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                <img src="${otherPartyAvatar}" alt="${otherPartyName}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                <div class="transaction-info">
                    <div class="transaction-title">${booking.serviceTitle}</div>
                    <div class="transaction-date">${otherPartyName} • ${formatDate(booking.startDate)}</div>
                    ${booking.bookingId ? `<div class="caption" style="color: var(--text-secondary);">${booking.bookingId}</div>` : ''}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="margin-bottom: 8px;">
                    <span class="tag" style="background: ${getStatusColor(booking.status)}; color: white;">
                        ${formatStatus(booking.status)}
                    </span>
                    ${booking.paymentStatus === 'pending' ? `
                        <span class="tag" style="background: #FFA500; color: white; margin-left: 4px;">
                            Payment Pending
                        </span>
                    ` : ''}
                    ${booking.paymentStatus === 'paid' ? `
                        <span class="tag" style="background: #10B981; color: white; margin-left: 4px;">
                            Paid
                        </span>
                    ` : ''}
                </div>
                <div class="transaction-amount">${booking.currency || 'USDT'} ${booking.amount.toFixed(2)}</div>
            </div>
        </div>
    `;
}

// View booking details
window.viewBookingDetails = async function(bookingId) {
    try {
        const response = await api.getBookingDetails(bookingId);

        if (response.success) {
            const booking = response.data.booking;
            const isCreator = appState.user.role === 'creator';

            // Show booking details modal
            const modalContent = `
                <div class="modal" onclick="closeModalOnBackdrop(event)">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2>Booking Details</h2>
                            <button class="icon-btn" onclick="closeModal()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>

                        <div style="padding: 20px;">
                            <div style="background: var(--surface); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                                <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Booking ID</div>
                                <div style="font-weight: 600;">${booking.bookingId}</div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Service</label>
                                <div>${booking.serviceTitle}</div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <div class="text-secondary">${booking.serviceDescription}</div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">${isCreator ? 'Client' : 'Creator'}</label>
                                <div>${isCreator ? booking.client?.name : booking.creator?.name}</div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                                <div class="form-group">
                                    <label class="form-label">Start Date</label>
                                    <div>${formatDate(booking.startDate)}</div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">End Date</label>
                                    <div>${formatDate(booking.endDate)}</div>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                                <div class="form-group">
                                    <label class="form-label">Amount</label>
                                    <div style="font-size: 20px; font-weight: 600;">${booking.currency || 'USDT'} ${booking.amount.toFixed(2)}</div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Payment Status</label>
                                    <div>
                                        <span class="tag" style="background: ${booking.paymentStatus === 'paid' ? '#10B981' : '#FFA500'}; color: white;">
                                            ${booking.paymentStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            ${booking.paymentStatus === 'pending' && booking.escrowWallet?.address ? `
                                <div style="background: var(--primary); color: white; padding: 16px; border-radius: 12px; margin: 20px 0;">
                                    <div style="font-weight: 600; margin-bottom: 8px;">Pay for this booking</div>
                                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">Send ${booking.currency || 'USDT'} ${booking.amount.toFixed(2)} to:</div>
                                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 13px;">
                                        ${booking.escrowWallet.address}
                                    </div>
                                    <button class="btn-secondary" style="margin-top: 12px; width: 100%; border-color: white; color: white;" onclick="navigator.clipboard.writeText('${booking.escrowWallet.address}').then(() => showToast('Address copied!', 'success'))">
                                        Copy Address
                                    </button>
                                </div>
                            ` : ''}

                            ${isCreator && booking.status === 'in_progress' ? `
                                <button class="btn-primary" style="width: 100%; margin-top: 16px;" onclick="window.completeBooking('${booking._id}')">
                                    Mark as Completed
                                </button>
                            ` : ''}

                            ${!isCreator && booking.status === 'completed' && !booking.fundsReleased ? `
                                <button class="btn-primary" style="width: 100%; margin-top: 16px;" onclick="window.releasePayment('${booking._id}')">
                                    Release Payment to Creator
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modalsContainer').innerHTML = modalContent;
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('Failed to load booking details:', error);
        alert('Failed to load booking details');
    }
};

// Complete booking (creator only)
window.completeBooking = async function(bookingId) {
    if (!confirm('Are you sure you want to mark this booking as completed?')) return;

    try {
        const response = await api.completeBooking(bookingId);

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Booking marked as completed!', 'success');
        }
    } catch (error) {
        console.error('Failed to complete booking:', error);
        showToast(error.message || 'Failed to complete booking', 'error');
    }
};

// Release payment (client only)
window.releasePayment = async function(bookingId) {
    if (!confirm('Are you sure you want to release payment to the creator?')) return;

    try {
        const response = await api.releasePayment(bookingId);

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Payment released successfully!', 'success');
        }
    } catch (error) {
        console.error('Failed to release payment:', error);
        showToast(error.message || 'Failed to release payment', 'error');
    }
};
