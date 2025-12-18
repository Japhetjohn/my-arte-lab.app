/**
 * Avatar Utility Functions
 * Generates beautiful fallback avatars with user initials
 */

/**
 * Generate initials from name
 * @param {string} name - User's full name
 * @returns {string} - Initials (max 2 characters)
 */
export function getInitials(name) {
    if (!name) return '?';

    const parts = name.trim().split(' ').filter(Boolean);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a consistent color based on name
 * @param {string} name - User's name
 * @returns {string} - Hex color code
 */
export function getAvatarColor(name) {
    if (!name) return '#667eea';

    const colors = [
        '#667eea', // Purple
        '#f56565', // Red
        '#48bb78', // Green
        '#ed8936', // Orange
        '#4299e1', // Blue
        '#9f7aea', // Violet
        '#ed64a6', // Pink
        '#38b2ac', // Teal
        '#ecc94b', // Yellow
        '#fc8181', // Light Red
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

/**
 * Generate avatar HTML (img or initials fallback)
 * @param {object} user - User object with name and avatar
 * @param {string} size - Size class: 'small', 'medium', 'large'
 * @returns {string} - HTML string for avatar
 */
export function generateAvatarHTML(user, size = 'medium') {
    const sizeClasses = {
        small: 'avatar-small',
        medium: 'avatar-medium',
        large: 'avatar-large'
    };

    const sizeClass = sizeClasses[size] || sizeClasses.medium;

    if (user?.avatar) {
        return `<img src="${user.avatar}" alt="${user.name || 'User'}" class="avatar ${sizeClass}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="avatar-fallback ${sizeClass}" style="display: none; background-color: ${getAvatarColor(user.name)}">
                    <span>${getInitials(user.name)}</span>
                </div>`;
    }

    return `<div class="avatar-fallback ${sizeClass}" style="background-color: ${getAvatarColor(user.name)}">
                <span>${getInitials(user.name)}</span>
            </div>`;
}

/**
 * Get avatar URL or generate data URL for initials
 * @param {object} user - User object
 * @returns {string} - Avatar URL or data URL
 */
export function getAvatarUrl(user) {
    if (user?.avatar) return user.avatar;

    const initials = getInitials(user?.name);
    const color = getAvatarColor(user?.name);

    const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="${color}"/>
            <text
                x="50"
                y="50"
                font-family="Arial, sans-serif"
                font-size="40"
                font-weight="600"
                fill="white"
                text-anchor="middle"
                dominant-baseline="central"
            >${initials}</text>
        </svg>
    `.trim();

    return `data:image/svg+xml;base64,${btoa(svg)}`;
}
