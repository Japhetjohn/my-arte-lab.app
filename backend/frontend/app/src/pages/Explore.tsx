import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Grid3X3, List, Loader2, X } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Creator, Category } from '@/types';

// Categories must match backend CREATOR_CATEGORIES
const defaultCategories: Category[] = [
  { id: 'photographer', name: 'Photography', icon: '/images/category-photography.png', description: 'Professional photos', creatorCount: 0 },
  { id: 'designer', name: 'Design', icon: '/images/category-design.png', description: 'Graphic design', creatorCount: 0 },
  { id: 'videographer', name: 'Video', icon: '/images/category-video.png', description: 'Video editing', creatorCount: 0 },
  { id: 'illustrator', name: 'Illustration', icon: '/images/category-music.png', description: 'Digital art', creatorCount: 0 },
  { id: 'other', name: 'Other', icon: '/images/category-writing.png', description: 'Other services', creatorCount: 0 },
];

export function Explore() {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Read category from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryFromUrl = params.get('category');
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, []);

  // Fetch creators and category stats on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch creators
        const creatorsResponse = await api.get('/creators?limit=100');
        const allCreators = creatorsResponse.data.data?.results || creatorsResponse.data.data || [];
        
        // Calculate category counts from actual creators
        const categoryCounts: Record<string, number> = {};
        allCreators.forEach((creator: Creator) => {
          const cat = creator.category;
          if (cat) {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          }
        });
        
        // Update categories with real counts
        setCategories(prev => prev.map(cat => ({
          ...cat,
          creatorCount: categoryCounts[cat.id] || 0
        })));
        
        // Filter out current user
        if (currentUser) {
          setCreators(allCreators.filter((c: Creator & { _id?: string }) => 
            c.id !== currentUser.id && c._id !== currentUser.id
          ));
        } else {
          setCreators(allCreators);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Filter creators based on search, category, and active tab
  const filteredCreators = creators.filter(creator => {
    const matchesSearch = !searchQuery || 
      (creator.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      creator.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || creator.category === selectedCategory;
    
    // Tab filtering
    let matchesTab = true;
    if (activeTab === 'verified') matchesTab = creator.isVerified === true;
    if (activeTab === 'available') matchesTab = creator.availability === 'available' || !creator.availability;
    if (activeTab === 'top-rated') {
      const rating = typeof creator.rating === 'object' ? (creator.rating as any).average : creator.rating;
      matchesTab = (rating || 0) >= 4.5;
    }
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  // Sort creators based on active tab
  const sortedCreators = [...filteredCreators].sort((a, b) => {
    if (activeTab === 'top-rated') {
      const ratingA = typeof a.rating === 'object' ? (a.rating as any).average : a.rating;
      const ratingB = typeof b.rating === 'object' ? (b.rating as any).average : b.rating;
      return (ratingB || 0) - (ratingA || 0);
    }
    if (activeTab === 'available') {
      if (a.availability === 'available' && b.availability !== 'available') return -1;
      if (b.availability === 'available' && a.availability !== 'available') return 1;
      return 0;
    }
    return 0;
  });

  const handleViewProfile = (creator: Creator & { _id?: string }) => {
    const id = creator.id || creator._id;
    window.location.href = `/creator/${id}`;
  };

  const handleBook = (creator: Creator & { _id?: string }) => {
    const id = creator.id || creator._id;
    window.location.href = `/bookings?creator=${id}`;
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category.id);
    // Update URL without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('category', category.id);
    window.history.pushState({}, '', url);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setActiveTab('all');
    // Clear URL params
    const url = new URL(window.location.href);
    url.searchParams.delete('category');
    window.history.pushState({}, '', url);
  };

  const getSelectedCategoryName = () => {
    const cat = categories.find(c => c.id === selectedCategory);
    return cat?.name || selectedCategory;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

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
            placeholder="Search by name, skill, or category..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {(searchQuery || selectedCategory || activeTab !== 'all') && (
          <Button variant="ghost" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Categories - Only show when no category selected */}
      {!selectedCategory && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
        <div className="flex items-center gap-2 bg-[#8A2BE2]/10 px-4 py-3 rounded-lg">
          <span className="text-sm text-gray-600">Showing:</span>
          <span className="px-3 py-1 bg-[#8A2BE2] text-white text-sm rounded-full font-medium capitalize">
            {getSelectedCategoryName()}
          </span>
          <span className="text-sm text-gray-500">({sortedCreators.length} creators)</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clearFilters}>
            Remove Filter
          </Button>
        </div>
      )}

      {/* Results Count */}
      {!selectedCategory && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {sortedCreators.length} creator{sortedCreators.length !== 1 ? 's' : ''} found
          </p>
        </div>
      )}

      {/* Creators Grid/List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="top-rated">Top Rated</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {sortedCreators.length > 0 ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {sortedCreators.map((creator) => (
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
              description={selectedCategory 
                ? `No creators found in ${getSelectedCategoryName()} category. Try another category.` 
                : "Try adjusting your search or filters"}
              actionLabel="Clear Filters"
              onAction={clearFilters}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
