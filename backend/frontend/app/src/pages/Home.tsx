import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, Star, ArrowRight, Loader2, MapPin, Sparkles } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { api } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { recommendationService } from '@/services/recommendationService';
import { toast } from 'sonner';
import type { Creator, Category } from '@/types';

// Static categories
const categories: Category[] = [
  { id: 'photography', name: 'Photography', icon: '/images/category-photography.png', description: 'Professional photos for any occasion', creatorCount: 1250 },
  { id: 'design', name: 'Design', icon: '/images/category-design.png', description: 'Graphic design and branding', creatorCount: 2100 },
  { id: 'music', name: 'Music', icon: '/images/category-music.png', description: 'Original music and sound design', creatorCount: 890 },
  { id: 'video', name: 'Video', icon: '/images/category-video.png', description: 'Video editing and production', creatorCount: 1560 },
  { id: 'writing', name: 'Writing', icon: '/images/category-writing.png', description: 'Content writing and copywriting', creatorCount: 1800 },
  { id: 'marketing', name: 'Marketing', icon: '/images/category-marketing.png', description: 'Digital marketing services', creatorCount: 980 },
];

export function Home() {
  const { user: currentUser } = useAuth();
  const [recommendedCreators, setRecommendedCreators] = useState<Array<{ creator: Creator; score: number; reasons: string[] }>>([]);
  const [verifiedCreators, setVerifiedCreators] = useState<Creator[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<Array<{ creator: Creator; trendScore: number }>>([]);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<string>('');

  // Fetch creators and apply recommendations
  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all creators
        const response = await api.get('/creators?limit=50&sortBy=rating');
        const creators = response.data.data?.results || response.data.data || [];
        setAllCreators(creators);
        
        // Set user location display
        if (currentUser?.location) {
          const loc = currentUser.location;
          setUserLocation(loc.localArea || loc.state || loc.country || '');
        }
        
        // 1. AI-Powered Recommendations (if user is logged in)
        if (currentUser) {
          const recommendations = recommendationService.getRecommendations(
            currentUser,
            creators,
            { limit: 8, minScore: 0.15 }
          );
          setRecommendedCreators(recommendations);
        } else {
          // If not logged in, show top rated as recommendations
          setRecommendedCreators(
            creators.slice(0, 8).map((c: Creator) => ({ creator: c, score: 0, reasons: [] }))
          );
        }
        
        // 2. Verified Creators
        const verified = creators.filter((c: Creator) => c.isVerified);
        setVerifiedCreators(verified.slice(0, 8));
        
        // 3. Trending Creators (Weekly Activity)
        // For now, use a simple algorithm based on rating and review count
        // TODO: Replace with actual activity data from backend
        const trending = creators
          .map((c: Creator) => {
            const rating = typeof c.rating === 'object' 
              ? (c.rating as any).average || 0
              : (c.rating || 0);
            const reviewCount = typeof c.rating === 'object'
              ? (c.rating as any).count || 0
              : (c.reviewCount || 0);
            
            // Trend score based on recent activity (simulated)
            const trendScore = (rating * 0.3) + (Math.min(reviewCount, 100) * 0.01);
            
            return { creator: c, trendScore };
          })
          .sort((a: any, b: any) => b.trendScore - a.trendScore)
          .slice(0, 8);
        setTrendingCreators(trending);
        
      } catch (error: any) {
        console.error('Error fetching creators:', error);
        toast.error('Failed to load creators');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreators();
  }, [currentUser]);

  const handleViewProfile = (creator: Creator & { _id?: string }) => {
    const id = creator.id || creator._id;
    window.location.href = `/creator/${id}`;
  };

  const handleBook = (creator: Creator & { _id?: string }) => {
    const id = creator.id || creator._id;
    window.location.href = `/bookings?creator=${id}`;
  };

  const handleCategoryClick = (category: Category) => {
    window.location.href = `/explore?category=${category.id}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-8">
      {/* Hero Section - Image only */}
      <section className="relative rounded-2xl overflow-hidden">
        <img 
          src="/images/hero-bg.jpg" 
          alt="Hero" 
          className="w-full h-48 sm:h-64 md:h-80 object-cover"
        />
      </section>

      {/* Categories Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Browse Categories</h2>
          <a 
            href="/explore" 
            className="text-sm text-[#8A2BE2] hover:underline flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((category) => (
            <CategoryCard 
              key={category.id} 
              category={category}
              onClick={handleCategoryClick}
            />
          ))}
        </div>
      </section>

      {/* Recommended For You - AI Powered */}
      {recommendedCreators.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#8A2BE2]" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Recommended For You
              </h2>
              {userLocation && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {userLocation}
                </span>
              )}
            </div>
            <a 
              href="/creators" 
              className="text-sm text-[#8A2BE2] hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          
          {/* Recommendation reasons */}
          {currentUser && recommendedCreators[0]?.reasons.length > 0 && (
            <p className="text-xs text-gray-500 mb-3">
              Based on your {currentUser.skills && currentUser.skills.length > 0 ? 'skills and ' : ''}location
            </p>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recommendedCreators.map(({ creator, reasons }) => (
              <div key={creator.id} className="relative">
                <CreatorCard 
                  creator={creator}
                  onViewProfile={handleViewProfile}
                  onBook={handleBook}
                />
                {/* Show recommendation reasons */}
                {reasons.length > 0 && (
                  <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
                    {reasons.map((reason, idx) => (
                      <span 
                        key={idx}
                        className="text-[10px] bg-[#8A2BE2]/90 text-white px-2 py-0.5 rounded-full"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Verified Creators Section */}
      {verifiedCreators.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Verified Creators</h2>
              <div className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" />
                VERIFIED
              </div>
            </div>
            <a 
              href="/creators?filter=verified" 
              className="text-sm text-[#8A2BE2] hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {verifiedCreators.map((creator) => (
              <CreatorCard 
                key={creator.id} 
                creator={creator}
                onViewProfile={handleViewProfile}
                onBook={handleBook}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Section - Weekly Activity */}
      {trendingCreators.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#8A2BE2]" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Trending Now</h2>
              <span className="text-xs text-gray-500">This week</span>
            </div>
            <a 
              href="/explore" 
              className="text-sm text-[#8A2BE2] hover:underline flex items-center gap-1"
            >
              Explore
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trendingCreators.map(({ creator }) => (
              <div key={creator.id} className="relative">
                <CreatorCard 
                  creator={creator}
                  onViewProfile={handleViewProfile}
                  onBook={handleBook}
                />
                {/* Trending badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Hot
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!isLoading && allCreators.length === 0 && (
        <section className="text-center py-12">
          <img 
            src="/images/empty-search.png" 
            alt="No creators" 
            className="w-32 h-32 mx-auto mb-4 opacity-50"
          />
          <h3 className="text-lg font-semibold text-gray-900">No creators yet</h3>
          <p className="text-gray-500">Check back soon for talented creators!</p>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#8A2BE2] to-[#6B21A8] rounded-2xl p-6 sm:p-8 text-white text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Ready to start your project?</h2>
        <p className="text-white/80 mb-4 text-sm sm:text-base">Find the perfect creator for your needs</p>
        <Button 
          variant="secondary" 
          className="bg-white text-[#8A2BE2] hover:bg-white/90"
          onClick={() => window.location.href = '/explore'}
        >
          Browse All Creators
        </Button>
      </section>
    </div>
  );
}
