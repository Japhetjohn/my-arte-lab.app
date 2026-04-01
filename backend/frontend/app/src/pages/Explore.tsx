import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, SlidersHorizontal, Grid3X3, List } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { creators, categories } from '@/lib/data/mockData';
import type { Creator, Category } from '@/types';

export function Explore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = (creator.name || 'Unknown').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         creator.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || creator.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleViewProfile = (creator: Creator) => {
    window.location.href = `/creator/${creator.id}`;
  };

  const handleBook = (creator: Creator) => {
    window.location.href = `/bookings?creator=${creator.id}`;
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category.name.toLowerCase());
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Explore Creators</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-[#8A2BE2]' : ''}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-[#8A2BE2]' : ''}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search by name or skill..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </Button>
        {(searchQuery || selectedCategory) && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Categories */}
      {!selectedCategory && !searchQuery && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((category) => (
              <CategoryCard 
                key={category.id} 
                category={category}
                onClick={handleCategoryClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected Category Badge */}
      {selectedCategory && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtered by:</span>
          <span className="px-3 py-1 bg-[#8A2BE2]/10 text-[#8A2BE2] text-sm rounded-full capitalize">
            {selectedCategory}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
            Remove
          </Button>
        </div>
      )}

      {/* Creators Grid/List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="top-rated">Top Rated</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredCreators.length > 0 ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredCreators.map((creator) => (
                <CreatorCard 
                  key={creator.id} 
                  creator={creator}
                  onViewProfile={handleViewProfile}
                  onBook={handleBook}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              image="/images/empty-search.png"
              title="No creators found"
              description="Try adjusting your search or filters"
              actionLabel="Clear Filters"
              onAction={clearFilters}
            />
          )}
        </TabsContent>

        <TabsContent value="verified" className="mt-6">
          {filteredCreators.filter(c => c.isVerified).length > 0 ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredCreators.filter(c => c.isVerified).map((creator) => (
                <CreatorCard 
                  key={creator.id} 
                  creator={creator}
                  onViewProfile={handleViewProfile}
                  onBook={handleBook}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              image="/images/empty-search.png"
              title="No verified creators found"
              description="Try adjusting your search"
            />
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-6">
          {filteredCreators.filter(c => c.availability === 'available').length > 0 ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredCreators.filter(c => c.availability === 'available').map((creator) => (
                <CreatorCard 
                  key={creator.id} 
                  creator={creator}
                  onViewProfile={handleViewProfile}
                  onBook={handleBook}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              image="/images/empty-search.png"
              title="No available creators found"
              description="Try adjusting your search"
            />
          )}
        </TabsContent>

        <TabsContent value="top-rated" className="mt-6">
          {filteredCreators.filter(c => (c.rating || 0) >= 4.8).length > 0 ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredCreators.filter(c => (c.rating || 0) >= 4.8).map((creator) => (
                <CreatorCard 
                  key={creator.id} 
                  creator={creator}
                  onViewProfile={handleViewProfile}
                  onBook={handleBook}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              image="/images/empty-search.png"
              title="No top-rated creators found"
              description="Try adjusting your search"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
