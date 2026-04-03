/**
 * Recommendation Engine
 * Prioritizes: Activity > Profile Completeness > Rating > Location
 * Backend-only implementation - no frontend changes
 */
class RecommendationEngine {
  constructor() {
    this.skillEmbeddingCache = new Map();
  }

  /**
   * Calculate Haversine distance between two coordinates
   * @returns distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 10000;
    
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Calculate location score based on distance
   */
  calculateLocationScore(distanceKm) {
    if (distanceKm === 0) return 1.0;
    if (distanceKm >= 5000) return 0.01;
    if (distanceKm >= 1000) return 0.05;
    if (distanceKm >= 500) return 0.1;
    if (distanceKm >= 200) return 0.2;
    if (distanceKm >= 100) return 0.35;
    if (distanceKm >= 50) return 0.5;
    if (distanceKm >= 20) return 0.7;
    if (distanceKm >= 10) return 0.85;
    if (distanceKm >= 5) return 0.92;
    return 0.95 + (0.05 * (1 - distanceKm / 5));
  }

  /**
   * Calculate PROFILE COMPLETENESS SCORE
   * Rewards creators who have fully set up their profiles
   */
  calculateProfileCompleteness(creator) {
    let score = 0;
    let maxScore = 0;

    // Essential fields (high weight)
    const essentialFields = [
      { field: creator.avatar, weight: 15, name: 'avatar' },
      { field: creator.bio && creator.bio.length > 50, weight: 15, name: 'bio' },
      { field: creator.category, weight: 10, name: 'category' },
      { field: creator.skills && creator.skills.length > 0, weight: 10, name: 'skills' }
    ];

    // Important fields (medium weight)
    const importantFields = [
      { field: creator.coverImage, weight: 8, name: 'coverImage' },
      { field: creator.portfolio && creator.portfolio.length > 0, weight: 8, name: 'portfolio' },
      { field: creator.services && creator.services.length > 0, weight: 10, name: 'services' },
      { field: creator.location?.country, weight: 7, name: 'location' }
    ];

    // Verification fields (bonus)
    const verificationFields = [
      { field: creator.isEmailVerified, weight: 5, name: 'emailVerified' },
      { field: creator.isVerified, weight: 5, name: 'verified' },
      { field: creator.isPhoneVerified, weight: 3, name: 'phoneVerified' }
    ];

    // Calculate score
    [...essentialFields, ...importantFields, ...verificationFields].forEach(({ field, weight }) => {
      maxScore += weight;
      if (field) score += weight;
    });

    // Bonus for having pricing set up
    if (creator.priceRange?.min > 0 || creator.startingPrice > 0) {
      score += 5;
      maxScore += 5;
    }

    // Bonus for having beneficiaries (ready to withdraw)
    if (creator.beneficiaries && creator.beneficiaries.length > 0) {
      score += 4;
      maxScore += 4;
    }

    // Normalize to 0-1 scale
    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Calculate ACTIVITY SCORE - Most important factor
   * Active creators get boosted significantly, inactive get heavily penalized
   */
  calculateActivityScore(lastActive) {
    if (!lastActive) return 0.05; // No activity data = very low score
    
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const hoursSinceActive = (now - lastActiveDate) / (1000 * 60 * 60);
    
    // Activity scoring based on last active time
    if (hoursSinceActive < 1) return 1.0;      // Active within 1 hour
    if (hoursSinceActive < 6) return 0.98;     // Active within 6 hours
    if (hoursSinceActive < 24) return 0.95;    // Active within 1 day
    if (hoursSinceActive < 48) return 0.85;    // Active within 2 days
    if (hoursSinceActive < 72) return 0.75;    // Active within 3 days
    if (hoursSinceActive < 168) return 0.60;   // Active within 1 week
    if (hoursSinceActive < 336) return 0.45;   // Active within 2 weeks
    if (hoursSinceActive < 720) return 0.30;   // Active within 1 month
    if (hoursSinceActive < 1440) return 0.15;  // Active within 2 months
    return 0.05;                                // Inactive > 2 months
  }

  /**
   * Generate skill embeddings
   */
  getSkillEmbedding(skills) {
    if (!skills || skills.length === 0) {
      return new Array(16).fill(0);
    }

    const cacheKey = skills.sort().join(',').toLowerCase();
    if (this.skillEmbeddingCache.has(cacheKey)) {
      return this.skillEmbeddingCache.get(cacheKey);
    }

    const embedding = new Array(16).fill(0);
    
    for (const skill of skills) {
      const normalized = skill.toLowerCase().trim();
      for (let i = 0; i < normalized.length; i++) {
        const charCode = normalized.charCodeAt(i);
        for (let j = 0; j < 16; j++) {
          embedding[j] += Math.sin(charCode * (j + 1) * 0.1) / normalized.length / skills.length;
        }
      }
    }
    
    const magnitude = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0));
    const normalizedEmbedding = magnitude > 0 ? embedding.map(v => v / magnitude) : embedding;
    
    this.skillEmbeddingCache.set(cacheKey, normalizedEmbedding);
    return normalizedEmbedding;
  }

  /**
   * Calculate skill similarity
   */
  calculateSkillSimilarity(userSkills, creatorSkills) {
    if (!userSkills?.length || !creatorSkills?.length) {
      return 0;
    }

    const emb1 = this.getSkillEmbedding(userSkills);
    const emb2 = this.getSkillEmbedding(creatorSkills);

    let dotProduct = 0, norm1 = 0, norm2 = 0;
    for (let i = 0; i < 16; i++) {
      dotProduct += emb1[i] * emb2[i];
      norm1 += emb1[i] * emb1[i];
      norm2 += emb2[i] * emb2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return Math.max(0, dotProduct / (norm1 * norm2));
  }

  /**
   * Calculate rating score
   */
  calculateRatingScore(rating) {
    const avg = typeof rating === 'object' ? (rating?.average || 0) : (rating || 0);
    const count = typeof rating === 'object' ? (rating?.count || 0) : 0;
    
    // Weight by number of reviews (more reviews = more trustworthy)
    const reviewWeight = Math.min(count / 10, 1); // Max weight at 10+ reviews
    return (avg / 5.0) * (0.5 + 0.5 * reviewWeight);
  }

  /**
   * Calculate availability score
   */
  calculateAvailabilityScore(availability) {
    switch (availability) {
      case 'available': return 1.0;
      case 'busy': return 0.6;
      case 'unavailable': return 0.2;
      default: return 0.8;
    }
  }

  /**
   * Get recommendations using weighted algorithm
   * PRIORITY ORDER:
   * - Activity: 40% (MOST IMPORTANT - show active creators)
   * - Profile Completeness: 25% (reward complete profiles)
   * - Location: 20% 
   * - Skills: 10%
   * - Rating: 4%
   * - Availability: 1%
   */
  async getRecommendations(user, creators, options = {}) {
    const { limit = 50, maxDistance = 1000 } = options;
    
    const userLat = user.location?.coordinates?.[1] || user.location?.lat;
    const userLon = user.location?.coordinates?.[0] || user.location?.lon;
    
    const scoredCreators = creators.map(creator => {
      // 1. ACTIVITY SCORE (40% weight) - MOST IMPORTANT
      const activityScore = this.calculateActivityScore(creator.lastActive);
      
      // 2. PROFILE COMPLETENESS (25% weight)
      const profileScore = this.calculateProfileCompleteness(creator);
      
      // 3. LOCATION SCORE (20% weight)
      const creatorLat = creator.location?.coordinates?.[1] || creator.location?.lat;
      const creatorLon = creator.location?.coordinates?.[0] || creator.location?.lon;
      const distance = this.calculateDistance(userLat, userLon, creatorLat, creatorLon);
      const locationScore = this.calculateLocationScore(distance);
      
      // 4. SKILL SIMILARITY (10% weight)
      const skillScore = this.calculateSkillSimilarity(user.skills || [], creator.skills || []);
      
      // 5. RATING SCORE (4% weight)
      const ratingScore = this.calculateRatingScore(creator.rating);
      
      // 6. AVAILABILITY SCORE (1% weight)
      const availabilityScore = this.calculateAvailabilityScore(creator.availability);
      
      // Combined score with ACTIVITY and PROFILE heavily weighted
      const totalScore = (
        activityScore * 0.40 +
        profileScore * 0.25 +
        locationScore * 0.20 +
        skillScore * 0.10 +
        ratingScore * 0.04 +
        availabilityScore * 0.01
      );
      
      // Determine status
      const isInactive = activityScore < 0.15; // Inactive > 2 months
      const hasIncompleteProfile = profileScore < 0.4;
      
      return {
        creator,
        distance,
        activityScore,
        profileScore,
        locationScore,
        skillScore,
        ratingScore,
        availabilityScore,
        totalScore,
        isInactive,
        hasIncompleteProfile
      };
    });

    // Sort by total score
    // Inactive creators get pushed to the bottom
    // Creators with incomplete profiles also get deprioritized
    return scoredCreators
      .sort((a, b) => {
        // First sort by inactive status
        if (a.isInactive && !b.isInactive) return 1;
        if (!a.isInactive && b.isInactive) return -1;
        
        // Then sort by profile completeness
        if (a.hasIncompleteProfile && !b.hasIncompleteProfile) return 1;
        if (!a.hasIncompleteProfile && b.hasIncompleteProfile) return -1;
        
        // Finally by total score
        return b.totalScore - a.totalScore;
      })
      .slice(0, limit);
  }

  /**
   * Get nearby creators sorted by distance
   */
  async getNearbyCreators(user, creators, options = {}) {
    const { limit = 50, maxDistance = 500 } = options;
    
    const userLat = user.location?.coordinates?.[1] || user.location?.lat;
    const userLon = user.location?.coordinates?.[0] || user.location?.lon;
    
    const scoredCreators = creators.map(creator => {
      const creatorLat = creator.location?.coordinates?.[1] || creator.location?.lat;
      const creatorLon = creator.location?.coordinates?.[0] || creator.location?.lon;
      const distance = this.calculateDistance(userLat, userLon, creatorLat, creatorLon);
      
      // Activity penalty for inactive creators
      const activityScore = this.calculateActivityScore(creator.lastActive);
      const profileScore = this.calculateProfileCompleteness(creator);
      
      return {
        creator,
        distance,
        totalScore: (1 / (1 + distance / 10)) * activityScore * (0.7 + 0.3 * profileScore)
      };
    });

    return scoredCreators
      .filter(s => s.distance <= maxDistance)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  }

  /**
   * Calculate TRENDING score
   * Heavily favors:
   * 1. Most recently active creators
   * 2. Creators with complete profiles
   * 3. High ratings with many reviews
   * 4. Verified creators
   * 5. Creators with completed bookings
   */
  async getTrendingCreators(creators, activityData = new Map(), options = {}) {
    const { limit = 10, minProfileCompleteness = 0.3 } = options;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const scored = creators.map(creator => {
      const creatorId = creator.id || creator._id?.toString();
      const activity = activityData.get(creatorId);
      
      // Base activity score (most important)
      const activityScore = this.calculateActivityScore(creator.lastActive);
      
      // Profile completeness score
      const profileScore = this.calculateProfileCompleteness(creator);
      
      // Calculate trend score
      let trendScore = 0;
      
      // Activity component (50% of score)
      trendScore += activityScore * 100;
      
      // Profile completeness bonus (up to 30 points)
      trendScore += profileScore * 30;
      
      // Weekly activity data bonus
      if (activity && activity.lastActive >= oneWeekAgo) {
        const daysSinceActive = (now - activity.lastActive) / (24 * 60 * 60 * 1000);
        const recencyBoost = Math.exp(-daysSinceActive / 3);
        
        trendScore += (activity.profileViews || 0) * 0.5 * recencyBoost;
        trendScore += (activity.bookings || 0) * 5 * recencyBoost;
        trendScore += (activity.messages || 0) * 1 * recencyBoost;
        trendScore += (activity.completedProjects || 0) * 10 * recencyBoost;
      }
      
      // Verification bonus
      if (creator.isVerified) trendScore += 10;
      if (creator.isEmailVerified) trendScore += 5;
      
      // Rating bonus (weighted by review count)
      const rating = typeof creator.rating === 'object' 
        ? (creator.rating?.average || 0)
        : (creator.rating || 0);
      const reviewCount = typeof creator.rating === 'object'
        ? (creator.rating?.count || 0)
        : 0;
      trendScore += rating * Math.min(reviewCount, 20); // Up to 100 points for 5 stars with 20+ reviews
      
      // Completed bookings bonus
      trendScore += (creator.completedBookings || 0) * 2;
      
      return { 
        creator, 
        trendScore,
        activityScore,
        profileScore,
        // Mark for filtering
        isEligible: profileScore >= minProfileCompleteness && activityScore >= 0.15
      };
    });
    
    // Filter out creators with very incomplete profiles or inactive
    // Sort by trend score
    return scored
      .filter(item => item.isEligible)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);
  }

  /**
   * Get creators sorted purely by activity (for admin/auditing)
   */
  async getCreatorsByActivity(creators, options = {}) {
    const { limit = 50 } = options;
    
    return creators
      .map(creator => ({
        creator,
        activityScore: this.calculateActivityScore(creator.lastActive),
        profileScore: this.calculateProfileCompleteness(creator)
      }))
      .sort((a, b) => {
        // Sort by activity first, then profile completeness
        if (b.activityScore !== a.activityScore) {
          return b.activityScore - a.activityScore;
        }
        return b.profileScore - a.profileScore;
      })
      .slice(0, limit);
  }
}

module.exports = new RecommendationEngine();
