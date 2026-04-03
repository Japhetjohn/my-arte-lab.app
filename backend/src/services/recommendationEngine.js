/**
 * Recommendation Engine
 * Sorts creators by: Activity, Location proximity, Skill similarity, Rating
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
   * Calculate ACTIVITY SCORE - Most important factor
   * Active creators get boosted, inactive get penalized
   */
  calculateActivityScore(lastActive) {
    if (!lastActive) return 0.3; // No activity data = low score
    
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const hoursSinceActive = (now - lastActiveDate) / (1000 * 60 * 60);
    
    // Activity scoring based on last active time
    if (hoursSinceActive < 1) return 1.0;      // Active within 1 hour
    if (hoursSinceActive < 6) return 0.95;     // Active within 6 hours
    if (hoursSinceActive < 24) return 0.9;     // Active within 1 day
    if (hoursSinceActive < 48) return 0.8;     // Active within 2 days
    if (hoursSinceActive < 72) return 0.7;     // Active within 3 days
    if (hoursSinceActive < 168) return 0.6;    // Active within 1 week
    if (hoursSinceActive < 336) return 0.5;    // Active within 2 weeks
    if (hoursSinceActive < 720) return 0.4;    // Active within 1 month
    if (hoursSinceActive < 1440) return 0.3;   // Active within 2 months
    return 0.2;                                 // Inactive > 2 months
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
    return avg / 5.0;
  }

  /**
   * Calculate availability score
   */
  calculateAvailabilityScore(availability) {
    switch (availability) {
      case 'available': return 1.0;
      case 'busy': return 0.5;
      case 'unavailable': return 0.1;
      default: return 0.7;
    }
  }

  /**
   * Get recommendations using weighted algorithm
   * ACTIVITY IS NOW THE MOST IMPORTANT FACTOR:
   * - Activity: 35% (NEW - heavily weighted)
   * - Location: 30% 
   * - Skills: 25%
   * - Rating: 7%
   * - Availability: 3%
   */
  async getRecommendations(user, creators, options = {}) {
    const { limit = 50, maxDistance = 1000 } = options;
    
    const userLat = user.location?.coordinates?.[1] || user.location?.lat;
    const userLon = user.location?.coordinates?.[0] || user.location?.lon;
    
    const scoredCreators = creators.map(creator => {
      // 1. ACTIVITY SCORE (35% weight) - MOST IMPORTANT
      const activityScore = this.calculateActivityScore(creator.lastActive);
      
      // 2. LOCATION SCORE (30% weight)
      const creatorLat = creator.location?.coordinates?.[1] || creator.location?.lat;
      const creatorLon = creator.location?.coordinates?.[0] || creator.location?.lon;
      const distance = this.calculateDistance(userLat, userLon, creatorLat, creatorLon);
      const locationScore = this.calculateLocationScore(distance);
      
      // 3. SKILL SIMILARITY (25% weight)
      const skillScore = this.calculateSkillSimilarity(user.skills || [], creator.skills || []);
      
      // 4. RATING SCORE (7% weight)
      const ratingScore = this.calculateRatingScore(creator.rating);
      
      // 5. AVAILABILITY SCORE (3% weight)
      const availabilityScore = this.calculateAvailabilityScore(creator.availability);
      
      // Combined score with ACTIVITY heavily weighted
      const totalScore = (
        activityScore * 0.35 +
        locationScore * 0.30 +
        skillScore * 0.25 +
        ratingScore * 0.07 +
        availabilityScore * 0.03
      );
      
      return {
        creator,
        distance,
        activityScore,
        locationScore,
        skillScore,
        ratingScore,
        availabilityScore,
        totalScore,
        // Mark as inactive for filtering
        isInactive: activityScore < 0.3
      };
    });

    // Sort by total score
    // Inactive creators (no activity > 2 months) get pushed to bottom
    return scoredCreators
      .sort((a, b) => {
        // Push inactive creators to the bottom
        if (a.isInactive && !b.isInactive) return 1;
        if (!a.isInactive && b.isInactive) return -1;
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
      
      return {
        creator,
        distance,
        totalScore: (1 / (1 + distance / 10)) * activityScore // Distance + activity
      };
    });

    return scoredCreators
      .filter(s => s.distance <= maxDistance)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  }

  /**
   * Calculate trending score based on activity
   */
  async getTrendingCreators(creators, activityData = new Map(), options = {}) {
    const { limit = 10 } = options;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const scored = creators.map(creator => {
      const creatorId = creator.id || creator._id?.toString();
      const activity = activityData.get(creatorId);
      let trendScore = 0;
      
      // Base score from lastActive
      const activityScore = this.calculateActivityScore(creator.lastActive);
      trendScore += activityScore * 50;
      
      if (activity && activity.lastActive >= oneWeekAgo) {
        const daysSinceActive = (now - activity.lastActive) / (24 * 60 * 60 * 1000);
        const recencyBoost = Math.exp(-daysSinceActive / 3);
        
        trendScore += (activity.profileViews || 0) * 1 * recencyBoost;
        trendScore += (activity.bookings || 0) * 10 * recencyBoost;
        trendScore += (activity.messages || 0) * 2 * recencyBoost;
        trendScore += (activity.completedProjects || 0) * 15 * recencyBoost;
      }
      
      if (creator.isVerified) trendScore *= 1.1;
      
      const rating = typeof creator.rating === 'object' 
        ? (creator.rating?.average || 0)
        : (creator.rating || 0);
      trendScore *= (1 + rating / 10);
      
      return { creator, trendScore };
    });
    
    return scored
      .filter(item => item.trendScore > 0)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);
  }
}

module.exports = new RecommendationEngine();
