/**
 * Date Helper Functions
 */

/**
 * Format date to readable string
 */
const formatDate = (date, format = 'default') => {
  const d = new Date(date);

  if (format === 'short') {
    return d.toLocaleDateString();
  } else if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    return d.toISOString();
  }
};

/**
 * Add days to date
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Add hours to date
 */
const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

/**
 * Check if date is expired
 */
const isExpired = (date) => {
  return new Date(date) < new Date();
};

/**
 * Get time difference in minutes
 */
const getMinutesDifference = (date1, date2) => {
  const diff = Math.abs(new Date(date1) - new Date(date2));
  return Math.floor(diff / 1000 / 60);
};

/**
 * Get time difference in hours
 */
const getHoursDifference = (date1, date2) => {
  const diff = Math.abs(new Date(date1) - new Date(date2));
  return Math.floor(diff / 1000 / 60 / 60);
};

/**
 * Get time difference in days
 */
const getDaysDifference = (date1, date2) => {
  const diff = Math.abs(new Date(date1) - new Date(date2));
  return Math.floor(diff / 1000 / 60 / 60 / 24);
};

/**
 * Check if date is today
 */
const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return today.toDateString() === checkDate.toDateString();
};

/**
 * Get start of day
 */
const getStartOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get end of day
 */
const getEndOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

module.exports = {
  formatDate,
  addDays,
  addHours,
  isExpired,
  getMinutesDifference,
  getHoursDifference,
  getDaysDifference,
  isToday,
  getStartOfDay,
  getEndOfDay
};
