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
                <div class="transaction-amount">${booking.currency || 'USDC'} ${booking.amount.toFixed(2)}</div>
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
            const unreadCount = booking.messages?.filter(m =>
                !m.read && m.sender.toString() !== appState.user._id
            ).length || 0;

            // Show booking details modal with messaging
            const modalContent = `
                <div class="modal" onclick="closeModalOnBackdrop(event)">
                    <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                        <div class="modal-header">
                            <h2>Booking Details ${unreadCount > 0 ? `<span class="tag" style="background: #FF6B35; color: white; font-size: 12px; margin-left: 8px;">${unreadCount} new</span>` : ''}</h2>
                            <button class="icon-btn" onclick="closeModal()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>

                        <div style="padding: 20px;">
                            <!-- Status Banner -->
                            ${booking.status === 'pending' && isCreator ? `
                                <div style="background: #FEF3C7; padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
                                    <div style="color: #92400E; font-weight: 600; margin-bottom: 8px;">Action Required</div>
                                    <div style="color: #78350F; font-size: 14px; margin-bottom: 12px;">
                                        Review this booking request and decide whether to accept, reject, or make a counter proposal.
                                    </div>
                                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                        <button class="btn-primary" style="flex: 1; min-width: 120px;" onclick="window.acceptBookingRequest('${booking._id}')">Accept</button>
                                        <button class="btn-secondary" style="flex: 1; min-width: 120px;" onclick="window.showCounterProposalForm('${booking._id}')">Counter Proposal</button>
                                        <button class="btn-ghost" style="color: #EF4444; flex: 1; min-width: 120px;" onclick="window.rejectBookingRequest('${booking._id}')">Reject</button>
                                    </div>
                                </div>
                            ` : ''}

                            ${booking.counterProposal ? `
                                <div style="background: #EFF6FF; padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #3B82F6;">
                                    <div style="color: #1E40AF; font-weight: 600; margin-bottom: 4px;">Counter Proposal</div>
                                    <div style="color: #1E3A8A; font-size: 14px;">
                                        Creator proposed: ${booking.currency} ${booking.counterProposal.amount.toFixed(2)}
                                        <div class="caption">Proposed ${formatDate(booking.counterProposal.proposedAt)}</div>
                                    </div>
                                </div>
                            ` : ''}

                            <div style="background: var(--surface); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                                <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Booking ID</div>
                                <div style="font-weight: 600;">${booking.bookingId}</div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                                <div>
                                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">${isCreator ? 'Client' : 'Creator'}</div>
                                    <div style="font-weight: 600;">${isCreator ? booking.client?.name : booking.creator?.name}</div>
                                </div>
                                <div>
                                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Status</div>
                                    <span class="tag" style="background: ${getStatusColor(booking.status)}; color: white;">
                                        ${formatStatus(booking.status)}
                                    </span>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Service</label>
                                <div style="font-weight: 600;">${booking.serviceTitle}</div>
                                <div class="caption" style="margin-top: 4px;">${booking.serviceDescription}</div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                                <div>
                                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Amount</div>
                                    <div style="font-size: 20px; font-weight: 700; color: var(--primary);">${booking.currency || 'USDC'} ${booking.amount.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Payment</div>
                                    <span class="tag" style="background: ${booking.paymentStatus === 'paid' ? '#10B981' : '#FFA500'}; color: white;">
                                        ${booking.paymentStatus}
                                    </span>
                                </div>
                            </div>

                            ${booking.paymentStatus === 'pending' && booking.escrowWallet?.address && !isCreator && booking.status === 'confirmed' ? `
                                <div style="background: var(--primary); color: white; padding: 16px; border-radius: 12px; margin: 20px 0;">
                                    <div style="font-weight: 600; margin-bottom: 8px;">Pay for this booking</div>
                                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">Send ${booking.currency || 'USDC'} ${booking.amount.toFixed(2)} to:</div>
                                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 13px;">
                                        ${booking.escrowWallet.address}
                                    </div>
                                    <button class="btn-secondary" style="margin-top: 12px; width: 100%; border-color: white; color: white;" onclick="navigator.clipboard.writeText('${booking.escrowWallet.address}').then(() => showToast('Address copied!', 'success'))">
                                        Copy Address
                                    </button>
                                </div>
                            ` : ''}

                            <!-- Messages Section -->
                            <div style="margin: 24px 0;">
                                <h3 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    Messages
                                </h3>
                                <div id="messagesContainer" style="background: var(--surface); border-radius: 12px; padding: 16px; max-height: 300px; overflow-y: auto; margin-bottom: 12px;">
                                    ${booking.messages && booking.messages.length > 0 ?
                                        booking.messages.map(msg => {
                                            const isMine = msg.sender.toString() === appState.user._id;
                                            return `
                                                <div style="display: flex; justify-content: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                                                    <div style="max-width: 70%; background: ${isMine ? 'var(--primary)' : '#f5f5f5'}; color: ${isMine ? 'white' : 'inherit'}; padding: 10px 14px; border-radius: 12px;">
                                                        <div style="font-size: 14px;">${msg.message}</div>
                                                        <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">${formatDate(msg.timestamp)}</div>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')
                                        : '<div class="text-secondary" style="text-align: center; padding: 20px;">No messages yet</div>'
                                    }
                                </div>
                                <form onsubmit="window.sendBookingMessage(event, '${booking._id}')" style="display: flex; gap: 8px;">
                                    <input type="text" id="messageInput" class="form-input" placeholder="Type a message..." required style="flex: 1;">
                                    <button type="submit" class="btn-primary" style="padding: 10px 20px;">Send</button>
                                </form>
                            </div>

                            <!-- Action Buttons -->
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

            // Scroll messages to bottom
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
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

// Send booking message
window.sendBookingMessage = async function(event, bookingId) {
    event.preventDefault();
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    try {
        const response = await api.addBookingMessage(bookingId, message);

        if (response.success) {
            messageInput.value = '';
            // Reload booking details to show new message
            await window.viewBookingDetails(bookingId);
            showToast('Message sent!', 'success');
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        showToast(error.message || 'Failed to send message', 'error');
    }
};

// Accept booking request (creator only)
window.acceptBookingRequest = async function(bookingId) {
    if (!confirm('Accept this booking request?')) return;

    try {
        const response = await api.acceptBooking(bookingId);

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Booking accepted! Client will be notified.', 'success');
        }
    } catch (error) {
        console.error('Failed to accept booking:', error);
        showToast(error.message || 'Failed to accept booking', 'error');
    }
};

// Reject booking request (creator only)
window.rejectBookingRequest = async function(bookingId) {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
        const response = await api.rejectBooking(bookingId, reason);

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Booking rejected. Client has been notified.', 'success');
        }
    } catch (error) {
        console.error('Failed to reject booking:', error);
        showToast(error.message || 'Failed to reject booking', 'error');
    }
};

// Show counter proposal form (creator only)
window.showCounterProposalForm = function(bookingId) {
    const amount = prompt('Enter your counter proposal amount (USDC):');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        if (amount !== null) showToast('Please enter a valid amount', 'error');
        return;
    }

    window.submitCounterProposal(bookingId, parseFloat(amount));
};

// Submit counter proposal (creator only)
window.submitCounterProposal = async function(bookingId, amount) {
    try {
        const response = await api.counterProposal(bookingId, amount);

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Counter proposal sent! Client will be notified.', 'success');
        }
    } catch (error) {
        console.error('Failed to send counter proposal:', error);
        showToast(error.message || 'Failed to send counter proposal', 'error');
    }
};
