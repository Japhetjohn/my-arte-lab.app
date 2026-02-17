/**
 * Security utilities for input sanitization and HTML escaping
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text safe for HTML
 */
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Sanitize user input for safe database storage
 * Removes potential NoSQL injection characters
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/\$/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .trim();
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
};

/**
 * Escape special regex characters to prevent ReDoS and regex injection
 * Safe for use in MongoDB $regex queries
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for regex
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  escapeHtml,
  sanitizeInput,
  sanitizeObject,
  escapeRegex
};
