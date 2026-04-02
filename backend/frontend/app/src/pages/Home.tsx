import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, Star, ArrowRight, Loader2 } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { api } from '@/contexts/AuthContext';
import type { Creator, Category } from '@/types';

// Static categories (these don't need to be dynamic)
const categories: Category[] = [
  { id: 'photography', name: 'Photography', icon: '/images/category-photography.png', description: 'Professional photos for any occasion', creatorCount: 1250 },
  { id: 'design', name: 'Design', icon: '/images/category-design.png', description: 'Graphic design and branding', creatorCount: 2100 },
  { id: 'music', name: 'Music', icon: '/images/category-music.png', description: 'Original music and sound design', creatorCount: 890 },
  { id: 'video', name: 'Video', icon: '/images/category-video.png', description: 'Video editing and production', creatorCount: 1560 },
  { id: 'writing', name: 'Writing', icon: '/images/category-writing.png', description: 'Content writing and copywriting', creatorCount: 1800 },
  { id: 'marketing', name: 'Marketing', icon: '/images/category-marketing.png', description: 'Digital marketing services', creatorCount: 980 },
];

export function Home() {
  const [featuredCreators, setFeaturedCreators] = useState<Creator[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<Creator[]>([]);
  const [verifiedCreators, setVerifiedCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch creators from backend
  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all creators with pagination
        const response = await api.get('/creators?limit=12&sortBy=rating');
        const allCreators = response.data.data?.results || response.data.data || [];
        
        // Split creators into sections
        if (allCreators.length > 0) {
          // Featured: first 4 (highest rated)
          setFeaturedCreators(allCreators.slice(0, 4));
          
          // Verified: creators with isVerified flag
          const verified = allCreators.filter((c: Creator) => c.isVerified);
          setVerifiedCreators(verified.slice(0, 4));
          
          // Trending: next 4 (or shuffle if not enough)
          const remaining = allCreators.slice(4, 8);
          setTrendingCreators(remaining.length > 0 ? remaining : allCreators.slice(0, 4));
        }
      } catch (error: any) {
        console.error('Error fetching creators:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreators();
  }, []);

  const handleViewProfile = (creator: Creator) => {
    window.location.href = `/creator/${creator.id}`;
  };

  const handleBook = (creator: Creator) => {
    window.location.href = `/bookings?creator=${creator.id}`;
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

      {/* Featured Creators Section */}
      {featuredCreators.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Featured Creators</h2>
              <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400 text-amber-400" />
            </div>
            <a 
              href="/creators" 
              className="text-sm text-[#8A2BE2] hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featuredCreators.map((creator) => (
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

      {/* Verified Creators Section */}
      {verifiedCreators.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Verified Creators</h2>
              <div className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                VERIFIED
              </div>
            </div>
            <a 
              href="/creators" 
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

      {/* Trending Section */}
      {trendingCreators.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#8A2BE2]" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Trending Now</h2>
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
            {trendingCreators.map((creator) => (
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

      {/* Empty State */}
      {!isLoading && featuredCreators.length === 0 && trendingCreators.length === 0 && (
        <section className="text-center py-12">
          <img 
            src="/images/empty-search.png" 
            alt="No creators" 
            className="w-32 h-32 mx-auto mb-4 opacity-50"
          />
          <h3 className="text-lg font-semibold text-gray-900">No creators yet</h3>
          <p className="text-gray-500">Check back soon for talented creators!</p>
          <p className="text-gray-400 text-sm mt-2">Server may be temporarily unavailable</p>
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
