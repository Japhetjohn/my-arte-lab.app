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

module.exports = router;
