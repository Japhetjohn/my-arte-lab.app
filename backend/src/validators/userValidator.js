/**
 * User Input Validators
 */

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

const validateUsername = (username) => {
  // Alphanumeric, underscore, hyphen, 3-30 characters
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
};

const validateName = (name) => {
  // Letters, spaces, hyphens, 2-50 characters
  const nameRegex = /^[a-zA-Z\s-]{2,50}$/;
  return nameRegex.test(name);
};

const validateWalletAddress = (address) => {
  // Solana wallet address validation (base58, 32-44 characters)
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return solanaRegex.test(address);
};

module.exports = {
  validateEmail,
  validatePassword,
  validateUsername,
  validateName,
  validateWalletAddress
};
