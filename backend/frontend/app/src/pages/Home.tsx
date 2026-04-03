import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, Star, ArrowRight, Loader2 } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { api } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { recommendationService } from '@/services/recommendationService';
import type { Creator, Category } from '@/types';

// Static categories
const categories: Category[] = [
  { id: 'photography', name: 'Photography', icon: '/images/category-photography.png', description: 'Professional photos', creatorCount: 1250 },
  { id: 'design', name: 'Design', icon: '/images/category-design.png', description: 'Graphic design', creatorCount: 2100 },
  { id: 'music', name: 'Music', icon: '/images/category-music.png', description: 'Music production', creatorCount: 890 },
  { id: 'video', name: 'Video', icon: '/images/category-video.png', description: 'Video editing', creatorCount: 1560 },
  { id: 'writing', name: 'Writing', icon: '/images/category-writing.png', description: 'Content writing', creatorCount: 1800 },
  { id: 'marketing', name: 'Marketing', icon: '/images/category-marketing.png', description: 'Digital marketing', creatorCount: 980 },
];

export function Home() {
  const { user: currentUser } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [verifiedCreators, setVerifiedCreators] = useState<Creator[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch creators - backend handles location-based sorting
  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setIsLoading(true);
        
        // Fetch creators - backend sorts by location proximity if user is logged in
        const params = new URLSearchParams();
        params.append('limit', '50');
        params.append('sortBy', 'rating');
        
        // The backend will use the user's location from JWT token to sort by proximity
        const response = await api.get(`/creators?${params.toString()}`);
        const allCreators = response.data.data?.results || response.data.data || [];
        
        // Apply AI recommendation sorting locally (behind the scenes)
        let sortedCreators = allCreators;
        if (currentUser && allCreators.length > 0) {
          const recommendations = recommendationService.getRecommendations(
            currentUser,
            allCreators,
            { limit: 50, minScore: 0 }
          );
          sortedCreators = recommendations.map(r => r.creator);
        }
        
        setCreators(sortedCreators.slice(0, 8));
        
        // Verified Creators
        const verified = sortedCreators.filter((c: Creator) => c.isVerified);
        setVerifiedCreators(verified.slice(0, 8));
        
        // Trending - empty for now until live data
        setTrendingCreators([]);
        
      } catch (error) {
        console.error('Error fetching creators:', error);
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
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden">
        <img 
          src="/images/hero-bg.jpg" 
          alt="Hero" 
          className="w-full h-48 sm:h-64 md:h-80 object-cover"
        />
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Browse Categories</h2>
          <a href="/explore" className="text-sm text-[#8A2BE2] hover:underline flex items-center gap-1">
            View all
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} onClick={handleCategoryClick} />
          ))}
        </div>
      </section>

      {/* All Creators - Location & Skill Sorted (Behind the scenes) */}
      {creators.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Creators Near You</h2>
            <a href="/creators" className="text-sm text-[#8A2BE2] hover:underline flex items-center gap-1">
              See all creators
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creators.map((creator) => (
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

      {/* Verified Creators */}
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
            <a href="/creators?filter=verified" className="text-sm text-[#8A2BE2] hover:underline flex items-center gap-1">
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

      {/* Trending - Empty until live data */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#8A2BE2]" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Trending Now</h2>
          </div>
        </div>
        
        {trendingCreators.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Trending creators will appear here soon</p>
            <p className="text-gray-400 text-sm mt-1">Based on weekly activity</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trendingCreators.map((creator) => (
              <CreatorCard 
                key={creator.id} 
                creator={creator}
                onViewProfile={handleViewProfile}
                onBook={handleBook}
              />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[#8A2BE2] to-[#6B21A8] rounded-2xl p-6 sm:p-8 text-white text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Ready to start your project?</h2>
        <p className="text-white/80 mb-4 text-sm sm:text-base">Find the perfect creator for your needs</p>
        <Button variant="secondary" className="bg-white text-[#8A2BE2] hover:bg-white/90" onClick={() => window.location.href = '/explore'}>
          Browse All Creators
        </Button>
      </section>
    </div>
  );
}
