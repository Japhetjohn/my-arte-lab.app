const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Block a user
 * POST /api/blocks/:userId
 */
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Prevent blocking yourself
    if (userId === currentUserId) {
      return errorResponse(res, 'You cannot block yourself', 400);
    }

    // Check if user exists
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return errorResponse(res, 'User not found', 404);
    }

    // Add to blocked users if not already blocked
    const currentUser = await User.findById(currentUserId);
    
    if (currentUser.blockedUsers.includes(userId)) {
      return errorResponse(res, 'User is already blocked', 400);
    }

    currentUser.blockedUsers.push(userId);
    await currentUser.save();

    return successResponse(res, {
      message: 'User blocked successfully',
      blockedUserId: userId
    });

  } catch (error) {
    console.error('Error blocking user:', error);
    return errorResponse(res, 'Failed to block user', 500);
  }
};

/**
 * Unblock a user
 * DELETE /api/blocks/:userId
 */
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser.blockedUsers.includes(userId)) {
      return errorResponse(res, 'User is not blocked', 400);
    }

    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      id => id.toString() !== userId
    );
    await currentUser.save();

    return successResponse(res, {
      message: 'User unblocked successfully',
      unblockedUserId: userId
    });

  } catch (error) {
    console.error('Error unblocking user:', error);
    return errorResponse(res, 'Failed to unblock user', 500);
  }
};

/**
 * Get blocked users list
 * GET /api/blocks
 */
exports.getBlockedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId)
      .populate('blockedUsers', 'firstName lastName name avatar');

    return successResponse(res, {
      blockedUsers: currentUser.blockedUsers || []
    });

  } catch (error) {
    console.error('Error getting blocked users:', error);
    return errorResponse(res, 'Failed to get blocked users', 500);
  }
};

/**
 * Check if a user is blocked
 * GET /api/blocks/:userId/status
 */
exports.checkBlockStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    const isBlocked = currentUser.blockedUsers.includes(userId);

    // Also check if current user is blocked by the other user
    const otherUser = await User.findById(userId);
    const hasBlockedMe = otherUser.blockedUsers.includes(currentUserId);

    return successResponse(res, {
      isBlocked,
      hasBlockedMe,
      canMessage: !isBlocked && !hasBlockedMe
    });

  } catch (error) {
    console.error('Error checking block status:', error);
    return errorResponse(res, 'Failed to check block status', 500);
  }
};
