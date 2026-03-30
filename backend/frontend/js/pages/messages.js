/**
 * Messages Page - Full page messaging interface
 */

import { appState } from '../state.js';
import api from '../services/api.js';
import { showToast } from '../utils.js';

// State
let currentConversation = null;
let chatPollingInterval = null;
let conversationsCache = [];

/**
 * Render the messages page
 */
export function renderMessagesPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="messages-page">
            <div class="messages-sidebar">
                <div class="messages-header">
                    <h1>Messages</h1>
                    <span class="messages-count" id="messagesCount"></span>
                </div>
                <div class="conversations-list" id="conversationsList">
                    <div class="conversations-loading">
                        <div class="spinner"></div>
                        <p>Loading conversations...</p>
                    </div>
                </div>
            </div>
            <div class="messages-content" id="messagesContent">
                <div class="empty-chat">
                    <div class="empty-chat-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </div>
                    <h2>Your Messages</h2>
                    <p>Select a conversation to start chatting</p>
                    <p class="empty-chat-hint">Or visit a creator's profile to send a new message</p>
                </div>
            </div>
        </div>
    `;

    // Load conversations
    loadConversations();
    
    // Start polling for unread counts
    startUnreadPolling();
}

/**
 * Load and display conversations
 */
async function loadConversations() {
    const list = document.getElementById('conversationsList');
    
    try {
        const res = await api.getConversations();
        
        if (res.success && res.conversations && res.conversations.length > 0) {
            conversationsCache = res.conversations;
            renderConversationsList(res.conversations);
            updateMessagesCount(res.conversations);
        } else {
            list.innerHTML = `
                <div class="conversations-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No messages yet</p>
                    <span>Visit a creator's profile to start a conversation</span>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to load conversations:', err);
        list.innerHTML = `
            <div class="conversations-error">
                <p>Failed to load conversations</p>
                <button onclick="window.location.reload()">Retry</button>
            </div>
        `;
    }
}

/**
 * Render conversations list
 */
function renderConversationsList(conversations) {
    const list = document.getElementById('conversationsList');
    
    list.innerHTML = conversations.map(conv => {
        const otherUser = conv.otherUser || {};
        const lastMessage = conv.lastMessage || {};
        const unreadCount = conv.unreadCount || 0;
        const time = formatTimeAgo(lastMessage.createdAt);
        const messagePreview = lastMessage.content ? 
            (lastMessage.content.length > 40 ? lastMessage.content.substring(0, 40) + '...' : lastMessage.content) : 
            'No messages';
        const isActive = currentConversation && currentConversation.userId === otherUser._id;
        
        return `
            <div class="conversation-item ${isActive ? 'active' : ''} ${unreadCount > 0 ? 'unread' : ''}" 
                 onclick="window.openConversation('${otherUser._id}', '${otherUser.name}', '${otherUser.avatar}')"
                 data-user-id="${otherUser._id}">
                <div class="conversation-avatar">
                    <img src="${otherUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name || 'U')}`}" 
                         alt="${otherUser.name || 'User'}">
                    <span class="online-indicator"></span>
                </div>
                <div class="conversation-info">
                    <div class="conversation-top">
                        <span class="conversation-name">${otherUser.name || 'User'}</span>
                        <span class="conversation-time">${time}</span>
                    </div>
                    <div class="conversation-preview">
                        <span class="preview-text">${escapeHtml(messagePreview)}</span>
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Open a specific conversation
 */
window.openConversation = async function(userId, userName, userAvatar) {
    currentConversation = { userId, userName, userAvatar };
    
    // Update active state in sidebar
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.userId === userId) {
            item.classList.remove('unread');
            item.querySelector('.unread-badge')?.remove();
        }
    });
    document.querySelector(`[data-user-id="${userId}"]`)?.classList.add('active');
    
    // Render chat area
    renderChatArea(userId, userName, userAvatar);
    
    // Load messages
    await loadMessages(userId);
    
    // Start polling
    startChatPolling(userId);
};

/**
 * Render the chat area
 */
function renderChatArea(userId, userName, userAvatar) {
    const content = document.getElementById('messagesContent');
    
    content.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <div class="chat-user">
                    <div class="chat-avatar">
                        <img src="${userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'U')}`}" 
                             alt="${userName || 'User'}">
                        <span class="online-indicator"></span>
                    </div>
                    <div class="chat-user-info">
                        <h3>${userName || 'User'}</h3>
                        <span class="chat-status">Active now</span>
                    </div>
                </div>
                <div class="chat-actions">
                    <button class="chat-action-btn" onclick="window.viewUserProfile('${userId}')" title="View Profile">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="chat-messages" id="chatMessages">
                <div class="messages-loading">
                    <div class="spinner"></div>
                </div>
            </div>
            <div class="chat-input-area">
                <div class="chat-input-wrapper">
                    <input type="text" id="messageInput" placeholder="Type a message..." maxlength="2000">
                    <button class="send-btn" id="sendBtn" onclick="window.sendMessage()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Setup enter key
    const input = document.getElementById('messageInput');
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            window.sendMessage();
        }
    });
    
    // Focus input
    setTimeout(() => input?.focus(), 100);
}

/**
 * Load messages for a conversation
 */
async function loadMessages(userId) {
    const container = document.getElementById('chatMessages');
    
    try {
        const res = await api.getMessages(userId);
        
        if (res.success && res.messages) {
            renderMessages(res.messages);
            // Mark as read
            api.markMessagesAsRead(userId);
        } else {
            container.innerHTML = `
                <div class="no-messages">
                    <p>No messages yet</p>
                    <span>Send a message to start the conversation</span>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to load messages:', err);
        container.innerHTML = `
            <div class="messages-error">
                <p>Failed to load messages</p>
            </div>
        `;
    }
}

/**
 * Render messages
 */
function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    const currentUserId = appState.user?._id || appState.user?.id;
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="no-messages">
                <p>No messages yet</p>
                <span>Send a message to start the conversation</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        const isMe = msg.senderId === currentUserId || msg.senderId?._id === currentUserId;
        const time = formatMessageTime(msg.createdAt);
        
        return `
            <div class="message ${isMe ? 'message-sent' : 'message-received'}">
                <div class="message-content">
                    <p>${escapeHtml(msg.content)}</p>
                    <span class="message-time">${time}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

/**
 * Send a message
 */
window.sendMessage = async function() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (!input || !currentConversation) return;
    
    const content = input.value.trim();
    if (!content) return;
    
    // Disable input
    input.disabled = true;
    sendBtn.disabled = true;
    
    // Optimistically add message
    const container = document.getElementById('chatMessages');
    const tempId = 'temp_' + Date.now();
    const currentUserId = appState.user?._id || appState.user?.id;
    
    // Remove empty state if present
    const emptyState = container.querySelector('.no-messages');
    if (emptyState) emptyState.remove();
    
    const messageHTML = `
        <div class="message message-sent" id="${tempId}">
            <div class="message-content">
                <p>${escapeHtml(content)}</p>
                <span class="message-time">Sending...</span>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', messageHTML);
    container.scrollTop = container.scrollHeight;
    
    // Clear input
    input.value = '';
    
    try {
        const res = await api.sendMessage(currentConversation.userId, content);
        
        if (res.success && res.message) {
            // Update temp message
            const tempEl = document.getElementById(tempId);
            if (tempEl) {
                tempEl.id = '';
                tempEl.querySelector('.message-time').textContent = formatMessageTime(res.message.createdAt);
            }
        } else {
            throw new Error('Failed to send');
        }
    } catch (err) {
        console.error('Failed to send message:', err);
        const tempEl = document.getElementById(tempId);
        if (tempEl) {
            tempEl.classList.add('message-failed');
            tempEl.querySelector('.message-time').textContent = 'Failed';
        }
        showToast('Failed to send message', 'error');
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
};

/**
 * View user profile
 */
window.viewUserProfile = function(userId) {
    window.renderCreatorProfile(userId);
};

/**
 * Start polling for new messages
 */
function startChatPolling(userId) {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
    }
    
    chatPollingInterval = setInterval(async () => {
        // Only poll if still on messages page with same conversation
        if (appState.currentPage !== 'messages' || !currentConversation || currentConversation.userId !== userId) {
            clearInterval(chatPollingInterval);
            chatPollingInterval = null;
            return;
        }
        
        try {
            const res = await api.getMessages(userId);
            if (res.success && res.messages) {
                renderMessages(res.messages);
            }
        } catch (err) {
            // Silent fail on polling
        }
    }, 5000);
}

/**
 * Poll for unread counts
 */
function startUnreadPolling() {
    // Poll every 30 seconds
    setInterval(async () => {
        if (appState.currentPage !== 'messages') return;
        
        try {
            const res = await api.getConversations();
            if (res.success && res.conversations) {
                conversationsCache = res.conversations;
                renderConversationsList(res.conversations);
                updateMessagesCount(res.conversations);
            }
        } catch (err) {
            // Silent fail
        }
    }, 30000);
}

/**
 * Update messages count
 */
function updateMessagesCount(conversations) {
    const countEl = document.getElementById('messagesCount');
    if (!countEl) return;
    
    const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    countEl.textContent = totalUnread > 0 ? `${conversations.length} conversations (${totalUnread} unread)` : `${conversations.length} conversations`;
}

/**
 * Helper: Format time ago
 */
function formatTimeAgo(date) {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd';
    return new Date(date).toLocaleDateString();
}

/**
 * Helper: Format message time
 */
function formatMessageTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Navigate to messages page with a specific user
 */
window.startDM = function(userId, userName, userAvatar) {
    if (!appState.user) {
        showToast('Please sign in to send messages', 'error');
        window.showAuthModal('signin');
        return;
    }
    
    if (userId === appState.user._id || userId === appState.user.id) {
        showToast('You cannot message yourself', 'error');
        return;
    }
    
    // Store target conversation
    sessionStorage.setItem('openConversationWith', JSON.stringify({ userId, userName, userAvatar }));
    
    // Navigate to messages page
    window.navigateToPage('messages');
};

/**
 * Show conversations list (called from dropdown)
 */
window.showConversationsList = function() {
    if (!appState.user) {
        showToast('Please sign in to view messages', 'error');
        return;
    }
    window.navigateToPage('messages');
};

/**
 * Initialize page and check for target conversation
 */
export function initMessagesPage() {
    renderMessagesPage();
    
    // Check if we should open a specific conversation
    const target = sessionStorage.getItem('openConversationWith');
    if (target) {
        const { userId, userName, userAvatar } = JSON.parse(target);
        sessionStorage.removeItem('openConversationWith');
        setTimeout(() => window.openConversation(userId, userName, userAvatar), 100);
    }
}
