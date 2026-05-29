import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Grid3X3, List, Loader2, X, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Creator, Category } from '@/types';
import { toast } from 'sonner';

// Categories must match backend CREATOR_CATEGORIES
const defaultCategories: Category[] = [
  { id: 'photography', name: 'Photography', icon: '/images/category-photography.png', description: 'Professional photos', creatorCount: 0 },
  { id: 'design', name: 'Design', icon: '/images/category-design.png', description: 'Graphic design', creatorCount: 0 },
  { id: 'video', name: 'Video & Animation', icon: '/images/category-video.png', description: 'Video editing & animation', creatorCount: 0 },
  { id: 'music', name: 'Music & Audio', icon: '/images/category-music.png', description: 'Music production', creatorCount: 0 },
  { id: 'writing', name: 'Writing & Translation', icon: '/images/category-writing.png', description: 'Content writing', creatorCount: 0 },
  { id: 'marketing', name: 'Marketing', icon: '/images/category-marketing.png', description: 'Digital marketing', creatorCount: 0 },
  { id: 'programming', name: 'Programming & Tech', icon: '/images/category-programming.png', description: 'Development & tech', creatorCount: 0 },
  { id: 'business', name: 'Business', icon: '/images/category-business.png', description: 'Business services', creatorCount: 0 },
  { id: 'other', name: 'Other', icon: '/images/category-other.png', description: 'Other services', creatorCount: 0 },
];

// Popular search suggestions
const popularSearches = [
  'photographer',
  'designer',
  'video editor',
  'web developer',
  'writer',
  'musician',
];

const SEARCH_HISTORY_KEY = 'myartelab_search_history';
const MAX_HISTORY = 10;

function getSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToSearchHistory(query: string) {
  if (!query.trim()) return;
  try {
    const history = getSearchHistory();
    const trimmed = query.trim();
    const filtered = history.filter(h => h.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

function removeFromSearchHistory(query: string) {
  try {
    const history = getSearchHistory();
    const updated = history.filter(h => h !== query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function Explore() {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryFromUrl = params.get('category');
    const qFromUrl = params.get('q');
    
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
    if (qFromUrl) {
      setSearchQuery(qFromUrl);
    }
  }, []);

  // Fetch creators from backend with search params
  const fetchCreators = useCallback(async ({
    q,
    category,
    tab,
  }: {
    q?: string;
    category?: string | null;
    tab?: string;
  } = {}) => {
    try {
      setIsLoading(true);
      
      // Build query params for backend
      const params = new URLSearchParams();
      params.set('limit', '100');
      
      // Search term
      if (q && q.trim()) {
        params.set('q', q.trim());
      }
      
      // Category filter
      if (category && category !== 'all') {
        params.set('category', category);
      }
      
      // Tab-based filtering
      if (tab === 'top-rated') {
        params.set('minRating', '4.5');
      }
      
      const creatorsResponse = await api.get(`/creators?${params.toString()}`);
      let allCreators = creatorsResponse.data.data?.results || creatorsResponse.data.data || [];
      
      // Filter out current user
      if (currentUser) {
        allCreators = allCreators.filter((c: Creator & { _id?: string }) => 
          c.id !== currentUser.id && c._id !== currentUser.id
        );
      }
      
      // Client-side tab filtering for tabs backend doesn't handle
      if (tab === 'verified') {
        allCreators = allCreators.filter((c: Creator) => c.isVerified === true);
      } else if (tab === 'available') {
        allCreators = allCreators.filter((c: Creator) => 
          c.availability === 'available' || !c.availability
        );
      }
      
      setCreators(allCreators);
      
      // Update category counts (only when not searching)
      if (!q) {
        const categoryCounts: Record<string, number> = {};
        allCreators.forEach((creator: Creator) => {
          const cats = creator.category;
          if (cats) {
            if (Array.isArray(cats)) {
              cats.forEach(cat => {
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
              });
            } else {
              categoryCounts[cats] = (categoryCounts[cats] || 0) + 1;
            }
          }
        });
        
        setCategories(prev => prev.map(cat => ({
          ...cat,
          creatorCount: categoryCounts[cat.id] || 0
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load creators');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]); // Only depend on currentUser.id, not creators

  // Initial load - only run once
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCreators();
    }
  }, [fetchCreators]);

  // Handle search input changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCreators({ 
        q: searchQuery, 
        category: selectedCategory,
        tab: activeTab,
      });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, activeTab]); // fetchCreators NOT in deps - causes infinite loop

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    addToSearchHistory(searchQuery.trim());
    setSearchHistory(getSearchHistory());
    setShowSuggestions(false);
    
    fetchCreators({ q: searchQuery, category: selectedCategory, tab: activeTab });
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('q', searchQuery.trim());
    window.history.pushState({}, '', url);
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    addToSearchHistory(query);
    setSearchHistory(getSearchHistory());
    fetchCreators({ q: query, category: selectedCategory, tab: activeTab });
    
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    addToSearchHistory(suggestion);
    setSearchHistory(getSearchHistory());
    fetchCreators({ q: suggestion, category: selectedCategory, tab: activeTab });
    
    const url = new URL(window.location.href);
    url.searchParams.set('q', suggestion);
    window.history.pushState({}, '', url);
  };

  const handleRemoveHistory = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    removeFromSearchHistory(query);
    setSearchHistory(getSearchHistory());
  };

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
    setSearchQuery('');
    setShowSuggestions(false);
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('category', category.id);
    url.searchParams.delete('q');
    window.history.pushState({}, '', url);
    
    fetchCreators({ category: category.id, tab: activeTab });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setActiveTab('all');
    setShowSuggestions(false);
    
    // Clear URL params
    const url = new URL(window.location.href);
    url.searchParams.delete('category');
    url.searchParams.delete('q');
    window.history.pushState({}, '', url);
    
    fetchCreators();
  };

  const getSelectedCategoryName = () => {
    const cat = categories.find(c => c.id === selectedCategory);
    return cat?.name || selectedCategory;
  };

  if (isLoading && creators.length === 0) {
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
            className={`h-10 w-10 sm:h-9 sm:w-9 touch-manipulation ${viewMode === 'grid' ? 'bg-[#8A2BE2]' : ''}`}
            aria-label="Grid view"
          >
            <Grid3X3 className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            className={`h-10 w-10 sm:h-9 sm:w-9 touch-manipulation ${viewMode === 'list' ? 'bg-[#8A2BE2]' : ''}`}
            aria-label="List view"
          >
            <List className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* Search with suggestions */}
      <div className="relative">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search anything: name, skill, category, city, country..."
              className="pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
            {searchQuery && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(true);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {(searchQuery || selectedCategory || activeTab !== 'all') && (
            <Button type="button" variant="ghost" onClick={clearFilters} className="gap-2">
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </form>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && !searchQuery && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          >
            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Clock className="w-3 h-3" />
                  <span>Recent Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleHistoryClick(query)}
                      className="group flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-[#8A2BE2]/10 rounded-full text-sm text-gray-700 hover:text-[#8A2BE2] transition-colors"
                    >
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{query}</span>
                      <span
                        onClick={(e) => handleRemoveHistory(e, query)}
                        className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <TrendingUp className="w-3 h-3" />
                <span>Popular Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-[#8A2BE2]/10 rounded-full text-sm text-gray-700 hover:text-[#8A2BE2] transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Tips */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Search Tips</span>
              </div>
              <p className="text-xs text-gray-400">
                Try typing any keywords like <span className="text-[#8A2BE2]">"design jos"</span>,{' '}
                <span className="text-[#8A2BE2]">"photo london"</span>, or{' '}
                <span className="text-[#8A2BE2]">"video editor new york"</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Categories - Only show when no category selected and not searching */}
      {!selectedCategory && !searchQuery && (
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
          <span className="text-sm text-gray-500">({creators.length} creators)</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clearFilters}>
            Remove Filter
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading...
            </span>
          ) : (
            `${creators.length} creator${creators.length !== 1 ? 's' : ''} found`
          )}
        </p>
      </div>

      {/* Creators Grid/List */}
      <Tabs value={activeTab} onValueChange={(tab) => {
        setActiveTab(tab);
        fetchCreators({ q: searchQuery, category: selectedCategory, tab });
      }} className="w-full">
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide lg:w-auto lg:inline-flex">
          <TabsTrigger value="all" className="flex-shrink-0">All</TabsTrigger>
          <TabsTrigger value="verified" className="flex-shrink-0">Verified</TabsTrigger>
          <TabsTrigger value="available" className="flex-shrink-0">Available</TabsTrigger>
          <TabsTrigger value="top-rated" className="flex-shrink-0">Top Rated</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {creators.length > 0 ? (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4' : 'grid-cols-1 gap-4'}`}>
              {creators.map((creator) => (
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
              description={searchQuery 
                ? `No creators match "${searchQuery}". Try different keywords or location.` 
                : selectedCategory 
                  ? `No creators found in ${getSelectedCategoryName()} category.`
                  : "No creators available right now"}
              actionLabel={searchQuery || selectedCategory ? 'Clear Filters' : undefined}
              onAction={searchQuery || selectedCategory ? clearFilters : undefined}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
