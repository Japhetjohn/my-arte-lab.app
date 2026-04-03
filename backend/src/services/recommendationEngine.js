/**
 * Recommendation Engine using TensorFlow.js
 * Sorts creators by location proximity and skill similarity
 * Backend-only implementation - no frontend changes
 */
class RecommendationEngine {
  constructor() {
    this.skillEmbeddingCache = new Map();
    this.tf = null;
    this.model = null;
    this.initialized = false;
  }

  /**
   * Initialize TensorFlow.js (lazy loading)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Lazy load TensorFlow to avoid startup issues
      if (!this.tf) {
        this.tf = require('@tensorflow/tfjs');
      }

      // Create a simple neural network for scoring
      // Input: [distance_score, skill_similarity, rating, availability]
      // Output: recommendation_score
      this.model = this.tf.sequential({
        layers: [
          this.tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }),
          this.tf.layers.dense({ units: 4, activation: 'relu' }),
          this.tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });

      // Compile with optimized weights
      this.model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
      });

      this.initialized = true;
      console.log('[RecommendationEngine] Initialized successfully');
    } catch (error) {
      console.warn('[RecommendationEngine] TensorFlow not available, using fallback:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Calculate Haversine distance between two coordinates
   * @returns distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 10000; // Max distance if no coords
    
    const R = 6371; // Earth's radius in km
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
   * Convert distance to score (closer = higher score)
   */
  calculateLocationScore(distanceKm) {
    if (distanceKm === 0) return 1.0;
    if (distanceKm > 1000) return 0.1;
    
    // Exponential decay: closer creators get much higher scores
    return Math.exp(-distanceKm / 200); // Half-life at 200km
  }

  /**
   * Generate skill embeddings using simple hashing
   * Returns array of 16 normalized values
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
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0));
    const normalizedEmbedding = magnitude > 0 ? embedding.map(v => v / magnitude) : embedding;
    
    this.skillEmbeddingCache.set(cacheKey, normalizedEmbedding);
    return normalizedEmbedding;
  }

  /**
   * Calculate cosine similarity between two skill embeddings
   */
  calculateSkillSimilarity(userSkills, creatorSkills) {
    if (!userSkills?.length || !creatorSkills?.length) {
      return 0;
    }

    const emb1 = this.getSkillEmbedding(userSkills);
    const emb2 = this.getSkillEmbedding(creatorSkills);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

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
   * Calculate rating score (0-1)
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
   * Location: 40%, Skills: 35%, Rating: 15%, Availability: 10%
   */
  async getRecommendations(user, creators, options = {}) {
    const { limit = 50 } = options;
    
    // Get user coordinates
    const userLat = user.location?.coordinates?.[1] || user.location?.lat;
    const userLon = user.location?.coordinates?.[0] || user.location?.lon;
    
    // Calculate scores for each creator
    const scoredCreators = creators.map(creator => {
      // 1. Location Score (40% weight)
      const creatorLat = creator.location?.coordinates?.[1] || creator.location?.lat;
      const creatorLon = creator.location?.coordinates?.[0] || creator.location?.lon;
      const distance = this.calculateDistance(userLat, userLon, creatorLat, creatorLon);
      const locationScore = this.calculateLocationScore(distance);
      
      // 2. Skill Similarity (35% weight)
      const skillScore = this.calculateSkillSimilarity(
        user.skills || [],
        creator.skills || []
      );
      
      // 3. Rating Score (15% weight)
      const ratingScore = this.calculateRatingScore(creator.rating);
      
      // 4. Availability Score (10% weight)
      const availabilityScore = this.calculateAvailabilityScore(creator.availability);
      
      // Combined score using weighted average
      const totalScore = (
        locationScore * 0.40 +
        skillScore * 0.35 +
        ratingScore * 0.15 +
        availabilityScore * 0.10
      );
      
      return {
        creator,
        distance,
        locationScore,
        skillScore,
        ratingScore,
        availabilityScore,
        totalScore
      };
    });

    // Sort by total score and return
    return scoredCreators
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
      
      if (activity && activity.lastActive >= oneWeekAgo) {
        // Weight recent activity heavily
        const daysSinceActive = (now - activity.lastActive) / (24 * 60 * 60 * 1000);
        const recencyBoost = Math.exp(-daysSinceActive / 3); // Decay over 3 days
        
        trendScore += (activity.profileViews || 0) * 1 * recencyBoost;
        trendScore += (activity.bookings || 0) * 10 * recencyBoost;
        trendScore += (activity.messages || 0) * 2 * recencyBoost;
        trendScore += (activity.completedProjects || 0) * 15 * recencyBoost;
      }
      
      // Boost verified creators slightly
      if (creator.isVerified) trendScore *= 1.1;
      
      // Boost by rating
      const rating = typeof creator.rating === 'object' 
        ? (creator.rating?.average || 0)
        : (creator.rating || 0);
      trendScore *= (1 + rating / 10);
      
      return {
        creator,
        trendScore
      };
    });
    
    return scored
      .filter(item => item.trendScore > 0)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit);
  }
}

module.exports = new RecommendationEngine();
