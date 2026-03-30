/**
 * Messaging/DM System
 * Real-time messaging with polling and localStorage caching
 */

import { api } from '../services/api.js';
import { appState } from '../state.js';
import { showToast } from './toast.js';

// Current DM state
let currentDMInterval = null;
let currentDMUserId = null;
let conversationsCache = null;

/**
 * Initialize messaging system
 */
export function initMessaging() {
    // Make functions globally available
    window.openDM = openDM;
    window.startDM = startDM;
    window.closeDMModal = closeDMModal;
    window.sendDM = sendDM;
    window.showConversationsList = showConversationsList;
    window.closeConversationsModal = closeConversationsModal;
    
    // Start unread count polling
    startUnreadPolling();
}

/**
 * Start DM with a specific user (called from profile Message button)
 */
export function startDM(userId, userName, userAvatar) {
    if (!appState.user) {
        showToast('Please sign in to send messages', 'error');
        // Trigger auth modal
        const authBtn = document.querySelector('[data-auth-action="signin"]');
        if (authBtn) authBtn.click();
        return;
    }
    
    // Don't allow messaging yourself
    if (userId === appState.user.id || userId === appState.user._id) {
        showToast('You cannot message yourself', 'error');
        return;
    }
    
    openDM(userId, userName, userAvatar);
}

/**
 * Open DM modal with a specific user
 */
export async function openDM(userId, userName, userAvatar) {
    currentDMUserId = userId;
    
    // Close any existing modal
    closeDMModal();
    
    const modalHTML = `
        <div class="dm-modal-overlay" id="dmModal" onclick="if(event.target === this) closeDMModal()">
            <div class="dm-modal">
                <div class="dm-header">
                    <div class="dm-user">
                        <img src="${userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'U')}`}" alt="${userName || 'User'}">
                        <div>
                            <div class="dm-name">${userName || 'User'}</div>
                            <div class="dm-status" id="dmStatus">Online</div>
                        </div>
                    </div>
                    <button class="dm-close" onclick="closeDMModal()">×</button>
                </div>
                <div class="dm-messages" id="dmMessages">
                    <div class="dm-loading">Loading messages...</div>
                </div>
                <div class="dm-input-area">
                    <input type="text" id="dmInput" placeholder="Type a message..." onkeypress="if(event.key==='Enter')sendDM()" maxlength="1000">
                    <button onclick="sendDM()" id="dmSendBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Focus input
    setTimeout(() => {
        const input = document.getElementById('dmInput');
        if (input) input.focus();
    }, 100);
    
    // Load messages
    await loadMessages(userId, userName);
    
    // Start polling for new messages
    startDMRefresh(userId);
}

/**
 * Close DM modal
 */
export function closeDMModal() {
    const modal = document.getElementById('dmModal');
    if (modal) {
        modal.remove();
    }
    
    // Stop polling
    if (currentDMInterval) {
        clearInterval(currentDMInterval);
        currentDMInterval = null;
    }
    currentDMUserId = null;
}

/**
 * Load messages for a conversation
 */
async function loadMessages(userId, userName) {
    const container = document.getElementById('dmMessages');
    if (!container) return;
    
    try {
        // Try cache first
        const cacheKey = `dm_${appState.user.id}_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const messages = JSON.parse(cached);
            renderMessages(messages, userId);
        }
        
        // Fetch from API
        const res = await api.getMessages(userId);
        if (res.success && res.messages) {
            renderMessages(res.messages, userId);
            // Update cache
            localStorage.setItem(cacheKey, JSON.stringify(res.messages));
            
            // Mark as read
            api.markMessagesAsRead(userId);
        }
    } catch (err) {
        console.error('Failed to load messages:', err);
        if (!container.querySelector('.dm-message')) {
            container.innerHTML = '<div class="dm-empty">Failed to load messages</div>';
        }
    }
}

/**
 * Render messages in the container
 */
function renderMessages(messages, otherUserId) {
    const container = document.getElementById('dmMessages');
    if (!container) return;
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="dm-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>No messages yet</p>
                <span>Send a message to start the conversation</span>
            </div>
        `;
        return;
    }
    
    const currentUserId = appState.user.id || appState.user._id;
    
    container.innerHTML = messages.map(msg => {
        const isMe = msg.senderId === currentUserId || msg.senderId?._id === currentUserId;
        const time = formatTime(msg.createdAt || msg.timestamp);
        return `
            <div class="dm-message ${isMe ? 'dm-message-me' : 'dm-message-them'}">
                <div class="dm-bubble">${escapeHtml(msg.content)}</div>
                <div class="dm-time">${time}</div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

/**
 * Send a message
 */
export async function sendDM() {
    const input = document.getElementById('dmInput');
    const sendBtn = document.getElementById('dmSendBtn');
    const container = document.getElementById('dmMessages');
    
    if (!input || !currentDMUserId) return;
    
    const content = input.value.trim();
    if (!content) return;
    
    // Disable input while sending
    input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    
    // Optimistically add message to UI
    const tempId = 'temp_' + Date.now();
    const currentUserId = appState.user.id || appState.user._id;
    
    // Remove empty state if present
    const emptyState = container.querySelector('.dm-empty, .dm-loading');
    if (emptyState) emptyState.remove();
    
    const messageHTML = `
        <div class="dm-message dm-message-me" id="${tempId}">
            <div class="dm-bubble">${escapeHtml(content)}</div>
            <div class="dm-time">Sending...</div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', messageHTML);
    container.scrollTop = container.scrollHeight;
    
    // Clear input
    input.value = '';
    
    try {
        const res = await api.sendMessage(currentDMUserId, content);
        
        if (res.success && res.message) {
            // Update the temp message with real data
            const tempEl = document.getElementById(tempId);
            if (tempEl) {
                tempEl.id = '';
                tempEl.querySelector('.dm-time').textContent = formatTime(res.message.createdAt);
            }
            
            // Update cache
            const cacheKey = `dm_${currentUserId}_${currentDMUserId}`;
            const cached = localStorage.getItem(cacheKey);
            let messages = cached ? JSON.parse(cached) : [];
            messages.push(res.message);
            localStorage.setItem(cacheKey, JSON.stringify(messages));
        } else {
            throw new Error('Failed to send');
        }
    } catch (err) {
        console.error('Failed to send message:', err);
        const tempEl = document.getElementById(tempId);
        if (tempEl) {
            tempEl.querySelector('.dm-time').textContent = 'Failed to send';
            tempEl.classList.add('dm-failed');
        }
        showToast('Failed to send message', 'error');
    } finally {
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
}

/**
 * Start polling for new messages
 */
function startDMRefresh(userId) {
    if (currentDMInterval) {
        clearInterval(currentDMInterval);
    }
    
    currentDMInterval = setInterval(async () => {
        if (!document.getElementById('dmModal')) {
            clearInterval(currentDMInterval);
            currentDMInterval = null;
            return;
        }
        
        try {
            const res = await api.getMessages(userId);
            if (res.success && res.messages) {
                renderMessages(res.messages, userId);
                
                // Update cache
                const currentUserId = appState.user.id || appState.user._id;
                const cacheKey = `dm_${currentUserId}_${userId}`;
                localStorage.setItem(cacheKey, JSON.stringify(res.messages));
                
                // Mark as read
                api.markMessagesAsRead(userId);
            }
        } catch (err) {
            // Silent fail on polling
        }
    }, 5000); // Poll every 5 seconds
}

/**
 * Show conversations list modal
 */
export async function showConversationsList() {
    if (!appState.user) {
        showToast('Please sign in to view messages', 'error');
        return;
    }
    
    // Close any existing modal
    closeConversationsModal();
    
    const modalHTML = `
        <div class="dm-modal-overlay" id="conversationsModal" onclick="if(event.target === this) closeConversationsModal()">
            <div class="dm-modal dm-conversations-modal">
                <div class="dm-header">
                    <div class="dm-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Messages
                    </div>
                    <button class="dm-close" onclick="closeConversationsModal()">×</button>
                </div>
                <div class="dm-conversations-list" id="conversationsList">
                    <div class="dm-loading">Loading conversations...</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Load conversations
    await loadConversations();
}

/**
 * Close conversations modal
 */
export function closeConversationsModal() {
    const modal = document.getElementById('conversationsModal');
    if (modal) modal.remove();
}

/**
 * Load and render conversations
 */
async function loadConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
    try {
        // Try cache first
        if (conversationsCache) {
            renderConversations(conversationsCache);
        }
        
        const res = await api.getConversations();
        if (res.success && res.conversations) {
            conversationsCache = res.conversations;
            renderConversations(res.conversations);
        } else {
            container.innerHTML = `
                <div class="dm-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No conversations yet</p>
                    <span>Message creators from their profile to start chatting</span>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to load conversations:', err);
        container.innerHTML = '<div class="dm-empty">Failed to load conversations</div>';
    }
}

/**
 * Render conversations list
 */
function renderConversations(conversations) {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
    if (!conversations || conversations.length === 0) {
        container.innerHTML = `
            <div class="dm-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>No conversations yet</p>
                <span>Message creators from their profile to start chatting</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = conversations.map(conv => {
        const otherUser = conv.otherUser || {};
        const lastMessage = conv.lastMessage || {};
        const unreadCount = conv.unreadCount || 0;
        const time = lastMessage.createdAt ? formatTimeAgo(lastMessage.createdAt) : '';
        const messagePreview = lastMessage.content ? 
            (lastMessage.content.length > 50 ? lastMessage.content.substring(0, 50) + '...' : lastMessage.content) : 
            'No messages yet';
        
        return `
            <div class="dm-conversation" onclick="closeConversationsModal(); window.openDM('${otherUser._id}', '${otherUser.name}', '${otherUser.avatar}')">
                <img src="${otherUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name || 'U')}`}" class="dm-conv-avatar">
                <div class="dm-conv-content">
                    <div class="dm-conv-top">
                        <span class="dm-conv-name">${otherUser.name || 'User'}</span>
                        <span class="dm-conv-time">${time}</span>
                    </div>
                    <div class="dm-conv-preview ${unreadCount > 0 ? 'dm-unread' : ''}">${messagePreview}</div>
                </div>
                ${unreadCount > 0 ? `<span class="dm-conv-badge">${unreadCount}</span>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Poll for unread message count
 */
function startUnreadPolling() {
    // Initial check
    updateUnreadBadge();
    
    // Poll every 30 seconds
    setInterval(updateUnreadBadge, 30000);
}

/**
 * Update unread badge in dropdown
 */
async function updateUnreadBadge() {
    if (!appState.user) return;
    
    try {
        const res = await api.getConversations();
        let totalUnread = 0;
        
        if (res.success && res.conversations) {
            totalUnread = res.conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        }
        
        const badge = document.getElementById('dmBadge');
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (err) {
        // Silent fail
    }
}

/**
 * Format time for display
 */
function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format time ago
 */
function formatTimeAgo(date) {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    
    return 'Just now';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
