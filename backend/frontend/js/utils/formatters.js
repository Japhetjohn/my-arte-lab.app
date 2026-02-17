export function formatLocation(location) {
  if (!location) {
    return 'Nigeria';
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

  return parts.length > 0 ? parts.join(', ') : 'Nigeria';
}

export function formatCurrency(amount, currency = 'USDC', decimals = 2) {
  if (amount === null || amount === undefined) {
    return `0 ${currency}`;
  }

  const formatted = typeof amount === 'number'
    ? amount.toFixed(decimals)
    : parseFloat(amount).toFixed(decimals);

  return `${formatted} ${currency}`;
}

export function formatDate(date) {
  if (!date) return '';

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  return new Date(date).toLocaleDateString('en-US', options);
}

export function formatDateTime(date) {
  if (!date) return '';

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Date(date).toLocaleString('en-US', options);
}

export function formatTimeAgo(date) {
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

export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  return text.substring(0, maxLength - 3).trim() + '...';
}
