import type { Creator, User } from '@/types';

// Simple embedding-based recommendation (no API calls needed)
export class RecommendationService {
  private static instance: RecommendationService;
  private skillEmbeddings: Map<string, number[]> = new Map();
  private locationWeights = {
    sameCountry: 0.3,
    sameState: 0.5,
    sameLocalArea: 0.8,
  };

  static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  // Generate simple embedding for a skill (one-hot like encoding)
  private getSkillEmbedding(skill: string): number[] {
    const normalizedSkill = skill.toLowerCase().trim();
    
    if (this.skillEmbeddings.has(normalizedSkill)) {
      return this.skillEmbeddings.get(normalizedSkill)!;
    }

    // Create a hash-based embedding (deterministic)
    const embedding: number[] = [];
    let hash = 0;
    for (let i = 0; i < normalizedSkill.length; i++) {
      hash = ((hash << 5) - hash) + normalizedSkill.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Generate 16-dimensional embedding
    for (let i = 0; i < 16; i++) {
      const val = Math.sin(hash * (i + 1)) * Math.cos(hash * (i + 2));
      embedding.push((val + 1) / 2); // Normalize to 0-1
    }
    
    this.skillEmbeddings.set(normalizedSkill, embedding);
    return embedding;
  }

  // Calculate cosine similarity between two skill sets
  private calculateSkillSimilarity(skills1: string[], skills2: string[]): number {
    if (!skills1?.length || !skills2?.length) return 0;
    
    const embeddings1 = skills1.map(s => this.getSkillEmbedding(s));
    const embeddings2 = skills2.map(s => this.getSkillEmbedding(s));
    
    // Average embeddings
    const avg1 = this.averageEmbeddings(embeddings1);
    const avg2 = this.averageEmbeddings(embeddings2);
    
    return this.cosineSimilarity(avg1, avg2);
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return new Array(16).fill(0);
    
    const sum = new Array(16).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < 16; i++) {
        sum[i] += emb[i];
      }
    }
    return sum.map(v => v / embeddings.length);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Calculate location match score
  private calculateLocationScore(
    userLocation?: { country?: string; state?: string; localArea?: string },
    creatorLocation?: { country?: string; state?: string; localArea?: string }
  ): number {
    if (!userLocation || !creatorLocation) return 0;
    
    let score = 0;
    
    if (userLocation.country && creatorLocation.country && 
        userLocation.country.toLowerCase() === creatorLocation.country.toLowerCase()) {
      score += this.locationWeights.sameCountry;
      
      if (userLocation.state && creatorLocation.state && 
          userLocation.state.toLowerCase() === creatorLocation.state.toLowerCase()) {
        score += this.locationWeights.sameState;
        
        if (userLocation.localArea && creatorLocation.localArea && 
            userLocation.localArea.toLowerCase() === creatorLocation.localArea.toLowerCase()) {
          score += this.locationWeights.sameLocalArea;
        }
      }
    }
    
    return Math.min(score, 1);
  }

  // Main recommendation function
  getRecommendations(
    currentUser: User,
    creators: Creator[],
    options: {
      limit?: number;
      minScore?: number;
    } = {}
  ): Array<{ creator: Creator; score: number; reasons: string[] }> {
    const { limit = 10, minScore = 0.1 } = options;
    
    const scoredCreators = creators.map(creator => {
      const scores: Record<string, number> = {};
      const reasons: string[] = [];
      
      // 1. Skill Match (40% weight) - Most important
      if (currentUser.role === 'client') {
        // Client: match their needs with creator skills
        scores.skillMatch = this.calculateSkillSimilarity(
          currentUser.skills || [],
          creator.skills || []
        ) * 0.4;
      } else {
        // Creator: match similar skills for collaboration
        scores.skillMatch = this.calculateSkillSimilarity(
          currentUser.skills || [],
          creator.skills || []
        ) * 0.3;
      }
      
      if (scores.skillMatch > 0.2) {
        const commonSkills = (currentUser.skills || []).filter(s => 
          (creator.skills || []).some(cs => cs.toLowerCase() === s.toLowerCase())
        );
        if (commonSkills.length > 0) {
          reasons.push(`Matching skills: ${commonSkills.slice(0, 2).join(', ')}`);
        }
      }
      
      // 2. Location Match (30% weight)
      scores.locationMatch = this.calculateLocationScore(
        currentUser.location,
        creator.location
      ) * 0.3;
      
      if (scores.locationMatch > 0.5) {
        const location = creator.location?.localArea || creator.location?.state || creator.location?.country;
        if (location) reasons.push(`Nearby: ${location}`);
      }
      
      // 3. Rating Quality (20% weight)
      const ratingValue = typeof creator.rating === 'object' 
        ? (creator.rating as any).average || 0
        : (creator.rating || 0);
      scores.rating = (ratingValue / 5) * 0.2;
      
      if (ratingValue >= 4.5) {
        reasons.push('Top rated');
      }
      
      // 4. Availability (10% weight)
      scores.availability = creator.availability === 'available' ? 0.1 : 
                           creator.availability === 'busy' ? 0.05 : 0;
      
      if (creator.availability === 'available') {
        reasons.push('Available now');
      }
      
      // Calculate total score
      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
      
      return {
        creator,
        score: totalScore,
        reasons: reasons.slice(0, 3), // Top 3 reasons
        breakdown: scores
      };
    });
    
    // Filter by minimum score and sort
    return scoredCreators
      .filter(item => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Get trending creators based on weekly activity
  getTrending(
    creators: Creator[],
    activityData: Map<string, { views: number; bookings: number; lastActive: Date }>,
    options: { limit?: number } = {}
  ): Array<{ creator: Creator; trendScore: number }> {
    const { limit = 10 } = options;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const scored = creators.map(creator => {
      const activity = activityData.get(creator.id);
      let trendScore = 0;
      
      if (activity) {
        // Only count recent activity
        if (activity.lastActive >= oneWeekAgo) {
          trendScore += activity.views * 0.3;        // Views weight
          trendScore += activity.bookings * 2;        // Bookings weight (higher)
        }
      }
      
      // Boost for verified creators
      if (creator.isVerified) trendScore *= 1.2;
      
      // Boost for high rating
      const rating = typeof creator.rating === 'object' 
        ? (creator.rating as any).average || 0
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

export const recommendationService = RecommendationService.getInstance();
export default recommendationService;
