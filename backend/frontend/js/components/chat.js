/**
 * Real-time DM/Chat System
 * Direct messaging between users
 */

import { appState } from '../state.js';
import api from '../services/api.js';
import { showToast } from '../utils.js';

// Chat state
let currentConversation = null;
let chatPollingInterval = null;
let unreadMessagesCount = 0;

// Conversation cache
let conversations = [];

/**
 * Open DM chat with a user
 */
window.openDM = async function(userId, userName, userAvatar) {
    if (!appState.user) {
        showToast('Please sign in to send messages', 'info');
        showAuthModal('signin');
        return;
    }
    
    if (userId === appState.user._id) {
        showToast('You cannot message yourself', 'error');
        return;
    }
    
    // Close any open dropdowns
    document.getElementById('userDropdown')?.classList.remove('active');
    
    // Show chat modal
    showChatModal(userId, userName, userAvatar);
    
    // Load conversation history
    await loadConversation(userId);
    
    // Start polling for new messages
    startChatPolling(userId);
};

/**
 * Show the chat modal
 */
function showChatModal(userId, userName, userAvatar) {
    const modalHTML = `
        <style>
            .dm-overlay { 
                position: fixed; 
                inset: 0; 
                background: rgba(15, 23, 36, 0.6); 
                backdrop-filter: blur(8px); 
                z-index: 3000; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                padding: 20px;
                animation: fadeIn 0.2s ease;
            }
            .dm-container { 
                background: var(--surface); 
                border-radius: 24px; 
                width: 100%; 
                max-width: 480px; 
                height: 600px; 
                max-height: 90vh;
                display: flex; 
                flex-direction: column; 
                overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                animation: slideUp 0.3s ease;
            }
            .dm-header { 
                display: flex; 
                align-items: center; 
                gap: 12px; 
                padding: 16px 20px; 
                border-bottom: 1px solid var(--border);
                background: var(--background-alt);
            }
            .dm-avatar { 
                width: 44px; 
                height: 44px; 
                border-radius: 50%; 
                object-fit: cover; 
                border: 2px solid var(--primary);
                cursor: pointer;
            }
            .dm-header-info { 
                flex: 1; 
                min-width: 0; 
            }
            .dm-header-name { 
                font-size: 16px; 
                font-weight: 700; 
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                cursor: pointer;
            }
            .dm-header-status { 
                font-size: 13px; 
                color: var(--text-secondary); 
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .dm-status-dot {
                width: 8px;
                height: 8px;
                background: #10B981;
                border-radius: 50%;
            }
            .dm-close { 
                width: 36px; 
                height: 36px; 
                border-radius: 10px; 
                border: none; 
                background: rgba(255,255,255,0.1); 
                color: var(--text-secondary); 
                cursor: pointer; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                transition: all 0.2s;
            }
            .dm-close:hover { 
                background: rgba(255,255,255,0.15); 
                color: var(--text-primary);
            }
            .dm-messages { 
                flex: 1; 
                overflow-y: auto; 
                padding: 20px; 
                display: flex; 
                flex-direction: column; 
                gap: 12px;
                background: var(--background);
            }
            .dm-message { 
                display: flex; 
                flex-direction: column; 
                max-width: 75%; 
                animation: messageSlide 0.2s ease;
            }
            .dm-message.sent { 
                align-self: flex-end; 
                align-items: flex-end;
            }
            .dm-message.received { 
                align-self: flex-start; 
                align-items: flex-start;
            }
            .dm-message-bubble { 
                padding: 12px 16px; 
                border-radius: 18px; 
                font-size: 14px; 
                line-height: 1.5;
                word-wrap: break-word;
            }
            .dm-message.sent .dm-message-bubble { 
                background: var(--primary); 
                color: white;
                border-bottom-right-radius: 4px;
            }
            .dm-message.received .dm-message-bubble { 
                background: var(--surface); 
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-bottom-left-radius: 4px;
            }
            .dm-message-time { 
                font-size: 11px; 
                color: var(--text-secondary); 
                margin-top: 4px;
            }
            .dm-typing { 
                font-size: 12px; 
                color: var(--text-secondary); 
                font-style: italic;
                padding: 8px 0;
            }
            .dm-input-area { 
                padding: 16px 20px; 
                border-top: 1px solid var(--border);
                background: var(--background-alt);
                display: flex;
                gap: 12px;
                align-items: flex-end;
            }
            .dm-input { 
                flex: 1;
                background: var(--surface); 
                border: 1px solid var(--border); 
                border-radius: 20px; 
                padding: 12px 16px; 
                color: var(--text-primary); 
                font-size: 14px; 
                resize: none;
                min-height: 44px;
                max-height: 120px;
                outline: none;
                transition: all 0.2s;
            }
            .dm-input:focus { 
                border-color: var(--primary);
            }
            .dm-send { 
                width: 44px; 
                height: 44px; 
                border-radius: 50%; 
                border: none; 
                background: var(--primary); 
                color: white; 
                cursor: pointer; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            .dm-send:hover { 
                background: var(--secondary);
                transform: scale(1.05);
            }
            .dm-send:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            .dm-empty { 
                text-align: center; 
                padding: 40px; 
                color: var(--text-secondary);
            }
            .dm-empty-icon {
                width: 64px;
                height: 64px;
                background: rgba(151, 71, 255, 0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                color: var(--primary);
            }
            @keyframes fadeIn { 
                from { opacity: 0; } 
                to { opacity: 1; } 
            }
            @keyframes slideUp { 
                from { opacity: 0; transform: translateY(20px); } 
                to { opacity: 1; transform: translateY(0); } 
            }
            @keyframes messageSlide { 
                from { opacity: 0; transform: translateY(10px); } 
                to { opacity: 1; transform: translateY(0); } 
            }
            @media (max-width: 640px) {
                .dm-overlay {
                    padding: 0;
                }
                .dm-container {
                    max-width: 100%;
                    max-height: 100vh;
                    border-radius: 0;
                }
            }
        </style>
        <div class="dm-overlay" onclick="if(event.target===this)window.closeDM()">
            <div class="dm-container">
                <div class="dm-header">
                    <img src="${userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=9747FF&color=fff`}" 
                         alt="${userName}" 
                         class="dm-avatar"
                         onclick="window.renderCreatorProfile({id:'${userId}'}); window.closeDM();">
                    <div class="dm-header-info">
                        <div class="dm-header-name" onclick="window.renderCreatorProfile({id:'${userId}'}); window.closeDM();">${userName}</div>
                        <div class="dm-header-status">
                            <span class="dm-status-dot"></span>
                            Online
                        </div>
                    </div>
                    <button class="dm-close" onclick="window.closeDM()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="dm-messages" id="dmMessages">
                    <div class="dm-empty">
                        <div class="dm-empty-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                        </div>
                        <div>Start a conversation with ${userName}</div>
                    </div>
                </div>
                <form class="dm-input-area" onsubmit="window.sendDM(event, '${userId}')">
                    <textarea 
                        class="dm-input" 
                        id="dmInput" 
                        placeholder="Type a message..." 
                        rows="1"
                        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.sendDM(event,'${userId}');}"></textarea>
                    <button type="submit" class="dm-send" id="dmSendBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.id = 'dmModalContainer';
    container.innerHTML = modalHTML;
    document.body.appendChild(container);
    document.body.style.overflow = 'hidden';
    
    // Auto-resize textarea
    const textarea = document.getElementById('dmInput');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

/**
 * Close DM modal
 */
window.closeDM = function() {
    stopChatPolling();
    const container = document.getElementById('dmModalContainer');
    if (container) {
        container.remove();
    }
    document.body.style.overflow = '';
    currentConversation = null;
};

/**
 * Load conversation history
 */
async function loadConversation(otherUserId) {
    try {
        const response = await api.getMessages?.(otherUserId) || { success: false };
        
        if (response.success && response.data?.messages?.length > 0) {
            const messagesContainer = document.getElementById('dmMessages');
            messagesContainer.innerHTML = '';
            
            response.data.messages.forEach(msg => {
                appendMessage(msg);
            });
            
            scrollToBottom();
        }
    } catch (error) {
        console.error('Failed to load conversation:', error);
    }
}

/**
 * Send a DM
 */
window.sendDM = async function(event, recipientId) {
    event.preventDefault();
    
    const input = document.getElementById('dmInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    const sendBtn = document.getElementById('dmSendBtn');
    sendBtn.disabled = true;
    
    // Optimistically add message to UI
    const tempMessage = {
        _id: 'temp-' + Date.now(),
        content: content,
        sender: appState.user._id,
        createdAt: new Date().toISOString(),
        temp: true
    };
    appendMessage(tempMessage);
    scrollToBottom();
    
    input.value = '';
    input.style.height = 'auto';
    
    try {
        const response = await api.sendMessage?.(recipientId, content) || { success: false };
        
        if (!response.success) {
            showToast('Failed to send message', 'error');
            // Remove temp message on failure
            const tempEl = document.querySelector(`[data-msg-id="${tempMessage._id}"]`);
            if (tempEl) tempEl.remove();
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        showToast('Failed to send message', 'error');
    } finally {
        sendBtn.disabled = false;
    }
};

/**
 * Append a message to the chat
 */
function appendMessage(message) {
    const container = document.getElementById('dmMessages');
    if (!container) return;
    
    const isSent = message.sender === appState.user._id;
    const time = new Date(message.createdAt).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    const messageEl = document.createElement('div');
    messageEl.className = `dm-message ${isSent ? 'sent' : 'received'}`;
    messageEl.dataset.msgId = message._id;
    messageEl.innerHTML = `
        <div class="dm-message-bubble">${escapeHtml(message.content)}</div>
        <div class="dm-message-time">${time}</div>
    `;
    
    // Remove empty state if present
    const emptyState = container.querySelector('.dm-empty');
    if (emptyState) emptyState.remove();
    
    container.appendChild(messageEl);
}

/**
 * Scroll to bottom of messages
 */
function scrollToBottom() {
    const container = document.getElementById('dmMessages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * Start polling for new messages
 */
function startChatPolling(otherUserId) {
    stopChatPolling();
    
    chatPollingInterval = setInterval(async () => {
        try {
            const response = await api.getMessages?.(otherUserId) || { success: false };
            
            if (response.success && response.data?.messages) {
                const currentIds = Array.from(document.querySelectorAll('.dm-message'))
                    .map(el => el.dataset.msgId);
                
                response.data.messages.forEach(msg => {
                    if (!currentIds.includes(msg._id)) {
                        appendMessage(msg);
                        scrollToBottom();
                    }
                });
            }
        } catch (error) {
            // Silent fail on polling
        }
    }, 3000); // Poll every 3 seconds
}

/**
 * Stop chat polling
 */
function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get unread message count
 */
window.getUnreadMessageCount = async function() {
    try {
        const response = await api.getUnreadMessageCount?.() || { success: false };
        if (response.success) {
            unreadMessagesCount = response.data.count || 0;
            updateDMBadge();
        }
    } catch (error) {
        console.error('Failed to get unread count:', error);
    }
};

/**
 * Update DM badge in UI
 */
function updateDMBadge() {
    const badge = document.getElementById('dmBadge');
    if (badge) {
        badge.textContent = unreadMessagesCount > 99 ? '99+' : unreadMessagesCount;
        badge.style.display = unreadMessagesCount > 0 ? 'flex' : 'none';
    }
}

// Export for use in other modules
export { openDM, closeDM };
