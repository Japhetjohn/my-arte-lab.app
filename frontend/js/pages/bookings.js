// Bookings Page Module
import { appState } from '../state.js';
import { formatDate, formatStatus, getStatusColor } from '../utils.js';

export function renderBookingsPage() {
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

    const activeBookings = appState.bookings.filter(b => b.status !== 'completed');
    const completedBookings = appState.bookings.filter(b => b.status === 'completed');

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <h1 class="mb-lg">Bookings</h1>

                <h2 class="mb-md">Active bookings</h2>
                ${activeBookings.length > 0 ? `
                    <div class="transaction-list mb-lg">
                        ${activeBookings.map(booking => `
                            <div class="transaction-item">
                                <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                                    <img src="${booking.creatorAvatar}" alt="${booking.creatorName}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                                    <div class="transaction-info">
                                        <div class="transaction-title">${booking.service}</div>
                                        <div class="transaction-date">${booking.creatorName} • ${formatDate(booking.date)}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="margin-bottom: 8px;">
                                        <span class="tag" style="background: ${getStatusColor(booking.status)}; color: white;">
                                            ${formatStatus(booking.status)}
                                        </span>
                                    </div>
                                    <div class="transaction-amount">$${booking.amount}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <h3>No active bookings</h3>
                        <p>Your active jobs will appear here</p>
                    </div>
                `}

                <h2 class="mb-md mt-lg">Booking history</h2>
                ${completedBookings.length > 0 ? `
                    <div class="transaction-list">
                        ${completedBookings.map(booking => `
                            <div class="transaction-item">
                                <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                                    <img src="${booking.creatorAvatar}" alt="${booking.creatorName}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                                    <div class="transaction-info">
                                        <div class="transaction-title">${booking.service}</div>
                                        <div class="transaction-date">${booking.creatorName} • ${formatDate(booking.date)}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="margin-bottom: 8px;">
                                        <span class="tag" style="background: ${getStatusColor(booking.status)}; color: white;">
                                            ${formatStatus(booking.status)}
                                        </span>
                                    </div>
                                    <div class="transaction-amount">$${booking.amount}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>No booking history yet</h3>
                        <p>Your completed jobs will appear here</p>
                        <button class="btn-primary" onclick="navigateToPage('discover')">Find creators</button>
                    </div>
                `}
            </div>
        </div>
    `;
}
