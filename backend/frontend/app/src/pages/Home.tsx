import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, Star, ArrowRight } from 'lucide-react';
import { CreatorCard } from '@/components/ui-custom/CreatorCard';
import { CategoryCard } from '@/components/ui-custom/CategoryCard';
import { creators, categories } from '@/lib/data/mockData';
import type { Creator, Category } from '@/types';

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/explore?q=${encodeURIComponent(searchQuery)}`;
    } else {
      window.location.href = '/explore';
    }
  };

  return (
    <div className="space-y-8 pb-20 lg:pb-8">
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden">
        <img 
          src="/images/hero-bg.jpg" 
          alt="Hero" 
          className="w-full h-64 md:h-80 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent flex items-center">
          <div className="w-full px-4 sm:px-6 md:px-10 flex items-center justify-between">
            {/* Left Content */}
            <div className="max-w-lg">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
                Find Top Creators
              </h1>
              <p className="text-white/80 text-sm sm:text-base mb-4 sm:mb-6">
                Connect with talented professionals for your next project
              </p>
              {/* Search - Desktop only */}
              <div className="hidden sm:flex items-center gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="What service do you need?"
                    className="pl-10 h-12 bg-white border-0 text-sm w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button 
                  className="h-12 px-6 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                  onClick={handleSearch}
                >
                  Search
                </Button>
              </div>
            </div>
            
            {/* Right Content - Hidden on very small screens, shown on sm+ */}
            <div className="hidden sm:flex flex-col items-center text-center">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white/90 tracking-wider">
                CREATE. CONNECT. THRIVE.
              </h2>
              <p className="text-white/70 text-base md:text-lg mt-2">
                Your Creator Marketplace
              </p>
              <img 
                src="/images/logo.png" 
                alt="MyArtelab" 
                className="w-12 h-12 md:w-16 md:h-16 mt-4 opacity-80"
              />
            </div>
          </div>
        </div>
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
