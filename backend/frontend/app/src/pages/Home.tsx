import { Button } from '@/components/ui/button';
import { TrendingUp, Star, ArrowRight } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { creators, categories } from '@/lib/data/mockData';
import type { Creator, Category } from '@/types';

export function Home() {
  const verifiedCreators = creators.filter(c => c.isVerified).slice(0, 4);

  const handleViewProfile = (creator: Creator) => {
    window.location.href = `/creator/${creator.id}`;
  };

  const handleBook = (creator: Creator) => {
    window.location.href = `/bookings?creator=${creator.id}`;
  };

  const handleCategoryClick = (category: Category) => {
    window.location.href = `/explore?category=${category.id}`;
  };

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

      {/* Verified Creators Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Verified Creators</h2>
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

      {/* Trending Section */}
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
          {creators.slice(0, 4).map((creator) => (
            <CreatorCard 
              key={creator.id} 
              creator={creator}
              onViewProfile={handleViewProfile}
              onBook={handleBook}
            />
          ))}
        </div>
      </section>

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
