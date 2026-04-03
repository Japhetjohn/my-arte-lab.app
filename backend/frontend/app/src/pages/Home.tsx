import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, Star, ArrowRight, Loader2 } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { api } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Creator, Category } from '@/types';

// Categories with icons - counts will be fetched from backend
const defaultCategories: Category[] = [
  { id: 'photography', name: 'Photography', icon: '/images/category-photography.png', description: 'Professional photos', creatorCount: 0 },
  { id: 'design', name: 'Design', icon: '/images/category-design.png', description: 'Graphic design', creatorCount: 0 },
  { id: 'music', name: 'Music', icon: '/images/category-music.png', description: 'Music production', creatorCount: 0 },
  { id: 'video', name: 'Video', icon: '/images/category-video.png', description: 'Video editing', creatorCount: 0 },
  { id: 'writing', name: 'Writing', icon: '/images/category-writing.png', description: 'Content writing', creatorCount: 0 },
  { id: 'marketing', name: 'Marketing', icon: '/images/category-marketing.png', description: 'Digital marketing', creatorCount: 0 },
];

export function Home() {
  const { user: currentUser, token } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [verifiedCreators, setVerifiedCreators] = useState<Creator[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch creators - backend handles recommendation algorithm behind the scenes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch category stats and all creators in parallel
        const [statsResponse, allResponse] = await Promise.all([
          api.get('/creators/stats').catch(() => ({ data: { data: { byCategory: [] } } })),
          api.get('/creators?limit=50')
        ]);
        
        // Update category counts from backend
        const categoryStats = statsResponse.data.data?.byCategory || [];
        if (categoryStats.length > 0) {
          setCategories(prev => prev.map(cat => {
            const stat = categoryStats.find((s: any) => s._id === cat.id);
            return {
              ...cat,
              creatorCount: stat?.count || 0
            };
          }));
        }
        
        let allCreators = allResponse.data.data?.results || allResponse.data.data || [];
        
        // Filter out current user from all creators
        if (currentUser) {
          allCreators = allCreators.filter((c: Creator & { _id?: string }) => 
            c.id !== currentUser.id && c._id !== currentUser.id
          );
        }
        
        // If user is logged in, get personalized recommendations from backend
        if (currentUser && token) {
          try {
            const recResponse = await api.get('/creators/recommended?limit=16');
            let recommended = recResponse.data.data?.creators || [];
            // Filter out current user from recommendations too
            recommended = recommended.filter((c: Creator & { _id?: string }) => 
              c.id !== currentUser.id && c._id !== currentUser.id
            );
            if (recommended.length > 0) {
              setCreators(recommended.slice(0, 8));
            } else {
              // Fallback to all creators
              setCreators(allCreators.slice(0, 8));
            }
          } catch {
            // Fallback on error
            setCreators(allCreators.slice(0, 8));
          }
        } else {
          // Not logged in - show top rated
          setCreators(allCreators.slice(0, 8));
        }
        
        // Verified Creators - from featured endpoint
        try {
          const featuredResponse = await api.get('/creators/featured?limit=12');
          let featured = featuredResponse.data.data?.creators || [];
          // Filter out current user
          if (currentUser) {
            featured = featured.filter((c: Creator & { _id?: string }) => 
              c.id !== currentUser.id && c._id !== currentUser.id
            );
          }
          setVerifiedCreators(featured);
        } catch {
          // Fallback to filtering local
          let verified = allCreators.filter((c: Creator) => c.isVerified);
          setVerifiedCreators(verified.slice(0, 8));
        }
        
        // Trending - will be populated when activity tracking is live
        try {
          const trendingResponse = await api.get('/creators/trending?limit=8');
          let trending = trendingResponse.data.data?.creators || [];
          // Filter out current user
          if (currentUser) {
            trending = trending.filter((c: Creator & { _id?: string }) => 
              c.id !== currentUser.id && c._id !== currentUser.id
            );
          }
          setTrendingCreators(trending);
        } catch {
          setTrendingCreators([]);
        }
        
      } catch (error) {
        console.error('Error fetching creators:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, token]);

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

      {/* Creators Near You - Sorted by location HEAVILY prioritized */}
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

      {/* Verified Creators - Always show section even if empty */}
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
        
        {verifiedCreators.length > 0 ? (
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
        ) : (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No verified creators yet</p>
            <p className="text-gray-400 text-sm mt-1">Verified creators will appear here</p>
          </div>
        )}
      </section>

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
