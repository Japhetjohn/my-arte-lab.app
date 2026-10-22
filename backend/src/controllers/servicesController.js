const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { uploadServiceImage } = require('../services/uploadService');

/**
 * Fair Feed Algorithm:
 * Balances recency, normalized engagement, creator diversity, and exploration opportunities.
 */
function calculatePostScore({ post, tab, userBlockedIds, targetCategory }) {
  const now = Date.now();
  const createdAtMs = new Date(post.createdAt).getTime();
  const ageHours = Math.max(0, (now - createdAtMs) / (1000 * 60 * 60));

  // Pure chronological ordering for 'latest'
  if (tab === 'latest') {
    return createdAtMs;
  }

  // 1. Recency Score (Exponential half-life decay of ~48 hours)
  const recencyScore = Math.exp(-ageHours / 48);

  // 2. Normalized Engagement (prevents early viral dominance)
  const likes = post.likesCount || 0;
  const comments = post.commentsCount || 0;
  const impressions = post.impressionsCount || 0;
  const rawEngagement = (likes * 1.5) + (comments * 2.5);
  // Wilson-inspired normalized ratio smoothed by impressions
  const normalizedRatio = rawEngagement / Math.pow(impressions + 3, 0.65);
  const engagementScore = 1 - Math.exp(-normalizedRatio / 3);

  // 3. Exploration & Fairness Bonus for Underexposed Creators
  // Grants a discovery boost to items with lower total exposure
  const explorationBonus = impressions < 25 ? 0.35 * Math.max(0, 1 - (impressions / 25)) : 0;

  // 4. Category affinity boost if filtering or matching viewer category
  let categoryBoost = 0;
  if (targetCategory && targetCategory !== 'All') {
    const creatorCategories = post.creator.categories || [];
    const hasCategory = creatorCategories.some(c => new RegExp(targetCategory, 'i').test(c));
    if (hasCategory) categoryBoost = 0.25;
  }

  // 5. Compute Final Composite Score
  if (tab === 'trending') {
    // Trending balances engagement velocity with recency
    const velocity = (likes * 2 + comments * 3) / Math.max(1, Math.pow(ageHours + 2, 1.25));
    return (0.65 * velocity) + (0.25 * recencyScore) + (0.10 * explorationBonus);
  }

  // Default 'for-you': 40% recency + 35% normalized engagement + 25% exploration/fairness
  return (0.40 * recencyScore) + (0.35 * engagementScore) + (0.25 * explorationBonus) + categoryBoost;
}

/**
 * Creator-exposure balancing:
 * 1. Prevents more than 2 consecutive posts from the same creator.
 * 2. Caps a single creator's share of page 1 to <= 25% (when >= 4 creators exist).
 * 3. Reserves exploration slots for underexposed creators.
 */
function balanceCreatorExposure(rankedPosts, limitNum) {
  if (rankedPosts.length <= 1) return rankedPosts;

  const distinctCreators = new Set(rankedPosts.map(p => p.creator._id.toString()));
  const maxCreatorShare = distinctCreators.size >= 4 ? Math.max(2, Math.floor(limitNum * 0.25)) : limitNum;

  const balanced = [];
  const creatorCounts = new Map();
  const remaining = [...rankedPosts];

  while (remaining.length > 0 && balanced.length < rankedPosts.length) {
    let candidateIndex = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const cId = candidate.creator._id.toString();
      const currentCount = creatorCounts.get(cId) || 0;

      // Check consecutive posts constraint (max 2 consecutive from same creator)
      const last1 = balanced.length > 0 ? balanced[balanced.length - 1].creator._id.toString() : null;
      const last2 = balanced.length > 1 ? balanced[balanced.length - 2].creator._id.toString() : null;
      const wouldBeThirdConsecutive = (last1 === cId && last2 === cId);

      // Check first-page cap constraint
      const exceedsFirstPageShare = (balanced.length < limitNum && currentCount >= maxCreatorShare);

      if (!wouldBeThirdConsecutive && !exceedsFirstPageShare) {
        candidateIndex = i;
        break;
      }
    }

    // If all candidates are temporarily constrained, relax the constraint and pick the highest scored
    if (candidateIndex === -1) {
      candidateIndex = 0;
    }

    const [selected] = remaining.splice(candidateIndex, 1);
    balanced.push(selected);
    const cId = selected.creator._id.toString();
    creatorCounts.set(cId, (creatorCounts.get(cId) || 0) + 1);
  }

  return balanced;
}

/**
 * Get social creative feed across creators with fair ranking and exposure balancing
 */
exports.getFeed = catchAsync(async (req, res, next) => {
  const { tab = 'for-you', category, page = 1, limit = 15, since, creatorId } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 15));

  // Determine blocked creators to filter out
  const userBlockedIds = new Set();
  if (req.user && Array.isArray(req.user.blockedUsers)) {
    req.user.blockedUsers.forEach(id => userBlockedIds.add(id.toString()));
  }

  // Find creators with published services
  const query = {
    'services.0': { $exists: true }
  };

  if (creatorId) {
    if (/^[0-9a-fA-F]{24}$/.test(creatorId)) {
      query._id = creatorId;
    } else {
      query.$or = [{ seoSlug: creatorId }, { username: creatorId }];
    }
  } else {
    query.role = 'creator';
  }

  if (category && category !== 'All') {
    query.categories = { $in: [new RegExp(category, 'i')] };
  }

  const creators = await User.find(query)
    .select('firstName lastName name username avatar bio categories isVerified verificationSubscription rating priceRange startingPrice location services')
    .lean();

  // Flatten services into feed posts with creator identity
  let allCandidatePosts = [];
  creators.forEach(creator => {
    // Exclude if creator is blocked by the viewer
    if (userBlockedIds.has(creator._id.toString())) return;

    if (Array.isArray(creator.services)) {
      const creatorName =
        `${creator.firstName || ''} ${creator.lastName || ''}`.trim() ||
        creator.name ||
        creator.username ||
        'Creator';

      let isVerified = !!creator.isVerified;
      if (creator.verificationSubscription && creator.verificationSubscription.expiresAt) {
        const gracePeriodEnd = new Date(new Date(creator.verificationSubscription.expiresAt).getTime() + 48 * 60 * 60 * 1000);
        isVerified = gracePeriodEnd > new Date();
      }

      creator.services.forEach(service => {
        const likes = Array.isArray(service.likes) ? service.likes : [];
        const comments = Array.isArray(service.comments) ? service.comments : [];
        const impressions = Array.isArray(service.impressions) ? service.impressions : [];
        const isLiked = req.user ? likes.some(id => id.toString() === req.user._id.toString()) : false;

        allCandidatePosts.push({
          _id: service._id,
          serviceId: service._id,
          title: service.title,
          description: service.description,
          images: Array.isArray(service.images) ? service.images : [],
          directLink: service.directLink,
          packages: service.packages || [],
          createdAt: service.createdAt || new Date(),
          likesCount: likes.length,
          isLiked,
          commentsCount: comments.length,
          impressionsCount: service.impressionsCount || impressions.length || 0,
          recentComments: comments.slice(-3),
          creator: {
            _id: creator._id,
            name: creatorName,
            firstName: creator.firstName,
            lastName: creator.lastName,
            username: creator.username || '',
            avatar: creator.avatar || '',
            bio: creator.bio || '',
            categories: creator.categories || [],
            isVerified,
            rating: creator.rating || { average: 5.0, count: 0 },
            priceRange: creator.priceRange,
            startingPrice: creator.startingPrice,
            location: creator.location
          }
        });
      });
    }
  });

  // If creatorId was requested, return only that creator's posts sorted newest first
  if (creatorId) {
    allCandidatePosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = allCandidatePosts.length;
    const paginated = allCandidatePosts.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    return successResponse(res, 200, 'Creator posts retrieved', {
      posts: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  }

  // If client asked for new posts since a given timestamp (Refresh / New Post detection)
  if (since) {
    const sinceDate = new Date(since);
    const newItems = allCandidatePosts.filter(p => new Date(p.createdAt) > sinceDate);
    return successResponse(res, 200, 'New posts count retrieved', {
      newPostsCount: newItems.length,
      newPosts: newItems.slice(0, 10)
    });
  }

  // Score candidate posts using the Fair Ranking Algorithm
  allCandidatePosts.forEach(post => {
    post._fairScore = calculatePostScore({
      post,
      tab,
      userBlockedIds,
      targetCategory: category
    });
  });

  // Sort by score descending
  allCandidatePosts.sort((a, b) => b._fairScore - a._fairScore);

  // Apply creator-exposure balancing (diversity, anti-clustering, and exploration guarantee)
  const balancedPosts = balanceCreatorExposure(allCandidatePosts, limitNum);

  const total = balancedPosts.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedPosts = balancedPosts.slice(startIndex, startIndex + limitNum);

  // Clean internal score from response
  paginatedPosts.forEach(p => delete p._fairScore);

  successResponse(res, 200, 'Feed retrieved successfully', {
    posts: paginatedPosts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1
    }
  });
});

/**
 * Record post impression (deduplicated per viewer)
 */
exports.recordImpression = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;

  const creator = await User.findOne({ 'services._id': serviceId });
  if (!creator) {
    return next(new ErrorHandler('Post not found', 404));
  }

  const service = creator.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Post not found', 404));
  }

  if (!Array.isArray(service.impressions)) {
    service.impressions = [];
  }

  let incremented = false;
  if (req.user) {
    const userId = req.user._id.toString();
    const alreadyViewed = service.impressions.some(id => id.toString() === userId);
    if (!alreadyViewed) {
      service.impressions.push(req.user._id);
      service.impressionsCount = (service.impressionsCount || 0) + 1;
      incremented = true;
    }
  } else {
    // Increment anonymous impression
    service.impressionsCount = (service.impressionsCount || 0) + 1;
    incremented = true;
  }

  if (incremented) {
    await creator.save({ validateBeforeSave: false });
  }

  successResponse(res, 200, 'Impression recorded', {
    serviceId,
    impressionsCount: service.impressionsCount || service.impressions.length
  });
});

/**
 * Toggle like on a service / post
 */
exports.toggleLike = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;
  const userId = req.user._id;

  const creator = await User.findOne({ 'services._id': serviceId });
  if (!creator) {
    return next(new ErrorHandler('Post not found', 404));
  }

  const service = creator.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Post not found', 404));
  }

  if (!Array.isArray(service.likes)) {
    service.likes = [];
  }

  const likeIndex = service.likes.findIndex(id => id.toString() === userId.toString());
  let isLiked = false;

  if (likeIndex > -1) {
    service.likes.splice(likeIndex, 1);
    isLiked = false;
  } else {
    service.likes.push(userId);
    isLiked = true;
  }

  await creator.save({ validateBeforeSave: false });

  successResponse(res, 200, isLiked ? 'Post liked' : 'Post unliked', {
    serviceId,
    isLiked,
    likesCount: service.likes.length
  });
});

/**
 * Get comments for a service / post
 */
exports.getComments = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;
  const { sort = 'latest' } = req.query;

  const creator = await User.findOne({ 'services._id': serviceId }).lean();
  if (!creator) {
    return next(new ErrorHandler('Post not found', 404));
  }

  const service = (creator.services || []).find(s => s._id.toString() === serviceId);
  if (!service) {
    return next(new ErrorHandler('Post not found', 404));
  }

  let comments = Array.isArray(service.comments) ? [...service.comments] : [];

  if (sort === 'popular') {
    // Popular: sort by text length and engagement
    comments.sort((a, b) => b.text.length - a.text.length);
  } else {
    // Latest first
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  successResponse(res, 200, 'Comments retrieved successfully', {
    serviceId,
    comments,
    commentsCount: comments.length
  });
});

/**
 * Add a comment to a service / post
 */
exports.addComment = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return next(new ErrorHandler('Comment text is required', 400));
  }

  const creator = await User.findOne({ 'services._id': serviceId });
  if (!creator) {
    return next(new ErrorHandler('Post not found', 404));
  }

  const service = creator.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Post not found', 404));
  }

  if (!Array.isArray(service.comments)) {
    service.comments = [];
  }

  const newComment = {
    user: req.user._id,
    userName: req.user.name || req.user.username || 'User',
    userAvatar: req.user.avatar || '',
    text: text.trim().slice(0, 1000),
    createdAt: new Date()
  };

  service.comments.push(newComment);
  await creator.save({ validateBeforeSave: false });

  const createdComment = service.comments[service.comments.length - 1];

  successResponse(res, 201, 'Comment added successfully', {
    comment: createdComment,
    commentsCount: service.comments.length
  });
});

/**
 * Get all services for the authenticated user
 */
exports.getMyServices = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can have services', 403));
  }

  successResponse(res, 200, 'Services retrieved successfully', {
    services: user.services || []
  });
});

/**
 * Add a new service / social post
 */
exports.addService = catchAsync(async (req, res, next) => {
  const { title, description, directLink, images } = req.body;

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can publish services or posts', 403));
  }

  if (!description || !description.trim()) {
    return next(new ErrorHandler('Description or caption is required', 400));
  }

  const trimmedDesc = description.trim();
  const effectiveTitle = (title && title.trim())
    ? title.trim().slice(0, 100)
    : (trimmedDesc.slice(0, 60) + (trimmedDesc.length > 60 ? '...' : ''));

  const imageList = Array.isArray(images)
    ? images.filter(img => typeof img === 'string' && img.trim().length > 0).slice(0, 5)
    : [];

  const newService = {
    title: effectiveTitle,
    description: trimmedDesc,
    images: imageList,
    directLink: directLink ? directLink.trim() : undefined,
    likes: [],
    comments: [],
    impressions: [],
    impressionsCount: 0,
    createdAt: new Date()
  };

  user.services.push(newService);
  await user.save({ validateBeforeSave: false });

  const created = user.services[user.services.length - 1];

  successResponse(res, 201, 'Service published successfully', {
    service: created,
    services: user.services
  });
});

/**
 * Update an existing service
 */
exports.updateService = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;
  const { title, description, directLink } = req.body;

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can update services', 403));
  }

  const service = user.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Service not found', 404));
  }

  if (title) service.title = title.trim();
  if (description) service.description = description.trim();
  if (directLink !== undefined) {
    service.directLink = directLink ? directLink.trim() : undefined;
  }

  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Service updated successfully', {
    service,
    services: user.services
  });
});

/**
 * Delete a service
 */
exports.deleteService = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can delete services', 403));
  }

  const service = user.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Service not found', 404));
  }

  user.services.pull(serviceId);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Service deleted successfully', {
    services: user.services
  });
});

/**
 * Upload service image
 */
exports.uploadServiceImage = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;

  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can upload service images', 403));
  }

  const service = user.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Service not found', 404));
  }

  if (service.images.length >= 5) {
    return next(new ErrorHandler('Maximum 5 images allowed per service', 400));
  }

  const result = await uploadServiceImage(req.file.buffer);

  service.images.push(result.secure_url);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Service image uploaded successfully', {
    service,
    imageUrl: result.secure_url
  });
});

/**
 * Delete service image
 */
exports.deleteServiceImage = catchAsync(async (req, res, next) => {
  const { serviceId, imageIndex } = req.params;

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can delete service images', 403));
  }

  const service = user.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Service not found', 404));
  }

  const index = parseInt(imageIndex, 10);
  if (isNaN(index) || index < 0 || index >= service.images.length) {
    return next(new ErrorHandler('Invalid image index', 400));
  }

  service.images.splice(index, 1);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Service image deleted successfully', {
    service
  });
});
