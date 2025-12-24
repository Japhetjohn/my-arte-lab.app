const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  handleValidationErrors
} = require('../middleware/validation');

router.post('/register', validateRegister, handleValidationErrors, authController.register);
router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);

router.use(protect);

router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.put('/update-password', authController.updatePassword);
router.put('/update-profile', validateProfileUpdate, handleValidationErrors, authController.updateProfile);
router.delete('/delete-account', authController.deleteAccount);
router.post('/resend-verification', authController.resendVerification);

// Two-Factor Authentication routes
router.post('/2fa/setup', authController.setup2FA);
router.post('/2fa/enable', authController.enable2FA);
router.post('/2fa/disable', authController.disable2FA);
router.get('/2fa/status', authController.get2FAStatus);
router.post('/2fa/regenerate-backup-codes', authController.regenerateBackupCodes);

module.exports = router;
