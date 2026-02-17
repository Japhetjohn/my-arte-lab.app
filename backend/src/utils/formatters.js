const { DEFAULT_LOCATION } = require('./constants');

function formatLocation(location) {
  if (!location) {
    return DEFAULT_LOCATION.COUNTRY;
  }

  if (typeof location === 'string') {
    return location;
  }

  const parts = [];
  if (location.localArea && location.localArea.trim()) {
    parts.push(location.localArea.trim());
  }
  if (location.state && location.state.trim()) {
    parts.push(location.state.trim());
  }
  if (location.country && location.country.trim()) {
    parts.push(location.country.trim());
  }

  return parts.length > 0
    ? parts.join(DEFAULT_LOCATION.FORMAT_SEPARATOR)
    : DEFAULT_LOCATION.COUNTRY;
}

function formatCurrency(amount, currency = 'USDC', decimals = 2) {
  if (amount === null || amount === undefined) {
    return `0 ${currency}`;
  }

  const formatted = typeof amount === 'number'
    ? amount.toFixed(decimals)
    : parseFloat(amount).toFixed(decimals);

  return `${formatted} ${currency}`;
}

function formatDate(date, options = {}) {
  if (!date) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  return new Date(date).toLocaleDateString('en-US', defaultOptions);
}

function formatDateTime(date, options = {}) {
  if (!date) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  return new Date(date).toLocaleString('en-US', defaultOptions);
}

function formatTimeAgo(date) {
  if (!date) return '';

  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }

  return 'just now';
}

function truncateText(text, maxLength = 100, suffix = '...') {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  return text.substring(0, maxLength - suffix.length).trim() + suffix;
}

function formatPhoneNumber(phone) {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
  }

  return phone;
}

function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) {
    return '0%';
  }

  return `${parseFloat(value).toFixed(decimals)}%`;
}

module.exports = {
  formatLocation,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTimeAgo,
  truncateText,
  formatPhoneNumber,
  formatPercentage
};
