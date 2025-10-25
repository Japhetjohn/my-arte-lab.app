const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  verifyUser,
  deleteUser,
  getAllTransactions,
  getAnalytics,
  getAllBookings
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// All routes are protected and admin-only
router.use(protect);
router.use(adminOnly);

router.get('/users', getAllUsers);
router.put('/users/:id/verify', verifyUser);
router.delete('/users/:id', deleteUser);
router.get('/transactions', getAllTransactions);
router.get('/bookings', getAllBookings);
router.get('/analytics', getAnalytics);

module.exports = router;
