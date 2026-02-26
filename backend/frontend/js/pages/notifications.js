import { appState } from '../state.js';
import { formatDate } from '../utils.js';
import api from '../services/api.js';

let notifications = [];
let unreadCount = 0;

export async function renderNotificationsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h3>Sign in to view notifications</h3>
                <p>Stay updated on your bookings and activities</p>
                <button class="btn-primary" onclick="showAuthModal('signin')">Sign in</button>
            </div>
        `;
        return;
    }

    mainContent.innerHTML = `
        <div class="section">
            <div class="container glass-effect" style="border-radius: 20px; padding: 24px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h1 style="margin: 0; display: flex; align-items: center; gap: 12px;">
                        Notifications
                    </h1>
                    <button class="btn-secondary" onclick="window.markAllNotificationsRead()">Mark all as read</button>
                </div>
            </div>
        </div>
    `;

    window.showLoadingSpinner('Loading notifications...');

    try {
        const response = await api.getNotifications();

        if (response.success) {
            notifications = response.data.notifications || [];
            unreadCount = response.data.unreadCount || 0;
            window.hideLoadingSpinner();
            renderNotificationsList();
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
        window.hideLoadingSpinner();
        mainContent.innerHTML = `
        < div class="section" >
            <div class="container">
                <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px; border-color: rgba(239, 68, 68, 0.3);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; color: var(--error);">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
                        <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    <h3>Failed to load notifications</h3>
                    <p>${error.message}</p>
                    <button class="btn-primary" onclick="window.location.reload()">Try again</button>
                </div>
            </div>
            </div >
        `;
    }
}

function renderNotificationsList() {
    const mainContent = document.getElementById('mainContent');

    const unreadNotifications = notifications.filter(n => !n.read);
    const readNotifications = notifications.filter(n => n.read);

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <div class="glass-effect" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 24px; border-radius: 20px;">
                    <h1 style="margin: 0;">Notifications ${unreadCount > 0 ? `<span class="tag" style="background: #FF6B35; color: white; font-size: 14px; margin-left: 8px; border: none;">${unreadCount} new</span>` : ''}</h1>
                    <div style="display: flex; gap: 12px;">
                        ${notifications.length > 0 ? '<button class="btn-ghost" onclick="window.deleteAllReadNotifications()">Clear read</button>' : ''}
                        ${unreadCount > 0 ? '<button class="btn-secondary" onclick="window.markAllNotificationsRead()">Mark all as read</button>' : ''}
                    </div>
                </div>

                ${unreadNotifications.length > 0 ? `
                    <h3 class="mb-md" style="padding-left: 8px;">New</h3>
                    <div class="notification-list mb-lg">
                        ${unreadNotifications.map(notification => renderNotificationCard(notification)).join('')}
                    </div>
                ` : ''}

                ${readNotifications.length > 0 ? `
                    <h3 class="mb-md" style="padding-left: 8px;">Earlier</h3>
                    <div class="notification-list">
                        ${readNotifications.map(notification => renderNotificationCard(notification)).join('')}
                    </div>
                ` : ''}

                ${notifications.length === 0 ? `
                    <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>No notifications yet</h3>
                        <p>You will be notified about bookings and updates here</p>
                    </div>
                ` : ''}
            </div>
        </div >
        `;
}

function renderNotificationCard(notification) {
    const iconMap = {
        booking_request: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2"/></svg>',
        booking_accepted: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2"/></svg>',
        booking_rejected: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg>',
        payment_deducted: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2"/></svg>',
        payment_received: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2"/></svg>',
        insufficient_balance: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2"/></svg>',
        counter_proposal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2"/></svg>',
        message: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/></svg>',
        project_application_received: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="2"/></svg>',
        project_application_accepted: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2"/></svg>',
        project_application_rejected: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg>',
        project_started: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M10 8l6 4-6 4z" fill="currentColor"/></svg>',
        project_completed: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2"/></svg>',
        project_cancelled: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/></svg>',
        system: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2"/></svg>'
    };

    const colorMap = {
        booking_request: '#3B82F6',
        booking_accepted: '#10B981',
        booking_rejected: '#EF4444',
        payment_deducted: '#F59E0B',
        payment_received: '#10B981',
        insufficient_balance: '#EF4444',
        counter_proposal: '#8B5CF6',
        message: '#3B82F6',
        project_application_received: '#9747FF',
        project_application_accepted: '#10B981',
        project_application_rejected: '#EF4444',
        project_started: '#3B82F6',
        project_completed: '#10B981',
        project_cancelled: '#6B7280',
        system: '#6B7280'
    };

    const icon = iconMap[notification.type] || iconMap.system;
    const color = colorMap[notification.type] || colorMap.system;

    return `
        < div class="notification-card glass-effect ${!notification.read ? 'unread' : ''}"
    onclick = "window.handleNotificationClick('${notification._id}', '${notification.link || '#'}')"
    style = "cursor: pointer; margin-bottom: 12px; border-radius: 16px; 
                    ${!notification.read ? 'background: rgba(151, 71, 255, 0.15); border-left: 4px solid var(--primary);' : ''} ">
        < div style = "display: flex; gap: 16px; align-items: start; padding: 4px;" >
                <div style="flex-shrink: 0; width: 44px; height: 44px; background: rgba(255,255,255,0.5); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${color}; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    ${icon}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 4px;">
                        <h4 style="font-size: 15px; font-weight: 600; margin: 0; color: var(--text-primary);">${notification.title}</h4>
                        ${!notification.read ? '<div style="width: 8px; height: 8px; background: #FF6B35; border-radius: 50%; flex-shrink: 0; margin-top: 6px; box-shadow: 0 0 8px rgba(255,107,53,0.5);"></div>' : ''}
                    </div>
                    <p style="color: var(--text-secondary); font-size: 14px; margin: 0 0 8px 0; line-height: 1.5;">${notification.message}</p>
                    <div style="font-size: 12px; font-weight: 500; color: var(--primary); opacity: 0.8;">${formatDate(notification.createdAt)}</div>
                </div>
            </div >
        </div >
        `;
}

window.handleNotificationClick = async function (notificationId, link) {
    try {
        await api.markNotificationAsRead(notificationId);

        // Update badge count immediately
        if (window.updateNotificationBadge) {
            window.updateNotificationBadge();
        }

        if (link && link !== '#') {
            window.navigateToPage(link.replace('/', ''));
        } else {
            await renderNotificationsPage();
        }
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
};

window.markAllNotificationsRead = async function () {
    try {
        await api.markAllNotificationsAsRead();
        await renderNotificationsPage();

        // Update badge count immediately
        if (window.updateNotificationBadge) {
            window.updateNotificationBadge();
        }

        showToast('All notifications marked as read', 'success');
    } catch (error) {
        console.error('Failed to mark all as read:', error);
        showToast('Failed to mark notifications as read', 'error');
    }
};

window.deleteAllReadNotifications = async function () {
    if (!confirm('Delete all read notifications?')) return;

    try {
        await api.deleteAllReadNotifications();
        await renderNotificationsPage();
        showToast('Read notifications deleted', 'success');
    } catch (error) {
        console.error('Failed to delete notifications:', error);
        showToast('Failed to delete notifications', 'error');
    }
};

export async function getUnreadNotificationCount() {
    try {
        const response = await api.getUnreadNotificationCount();
        if (response.success) {
            return response.data.unreadCount || 0;
        }
    } catch (error) {
        console.error('Failed to get unread count:', error);
    }
    return 0;
}