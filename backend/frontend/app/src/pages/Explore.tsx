import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Grid3X3, List, Loader2, X, Clock } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { CategoryCard } from '@/components/shared/CategoryCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Creator, Category } from '@/types';
import { toast } from 'sonner';

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

const SEARCH_HISTORY_KEY = 'myartelab_search_history';
const MAX_HISTORY = 8;

function getSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function addToSearchHistory(query: string) {
  if (!query.trim()) return;
  try {
    const history = getSearchHistory();
    const trimmed = query.trim();
    const filtered = history.filter(h => h.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

function removeFromSearchHistory(query: string) {
  try {
    const history = getSearchHistory();
    const updated = history.filter(h => h !== query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
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
  const [showHistory, setShowHistory] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Close history on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Read URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    const q = params.get('q');
    if (cat) setSelectedCategory(cat);
    if (q) setSearchQuery(q);
  }, []);

  const fetchCreators = useCallback(async (opts: { q?: string; category?: string | null; tab?: string } = {}) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (opts.q?.trim()) params.set('q', opts.q.trim());
      if (opts.category && opts.category !== 'all') params.set('category', opts.category);
      if (opts.tab === 'top-rated') params.set('minRating', '4.5');

      const res = await api.get(`/creators?${params.toString()}`);
      let all = res.data.data?.results || res.data.data || [];

      if (currentUser) {
        all = all.filter((c: Creator & { _id?: string }) => c.id !== currentUser.id && c._id !== currentUser.id);
      }
      if (opts.tab === 'verified') all = all.filter((c: Creator) => c.isVerified);
      if (opts.tab === 'available') all = all.filter((c: Creator) => c.availability === 'available' || !c.availability);

      setCreators(all);

      if (!opts.q) {
        const counts: Record<string, number> = {};
        all.forEach((c: Creator) => {
          const cats = c.category;
          if (cats) {
            if (Array.isArray(cats)) cats.forEach(cat => { counts[cat] = (counts[cat] || 0) + 1; });
            else counts[cats] = (counts[cats] || 0) + 1;
          }
        });
        setCategories(prev => prev.map(c => ({ ...c, creatorCount: counts[c.id] || 0 })));
      }
    } catch {
      toast.error('Failed to load creators');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Initial load
  useEffect(() => { fetchCreators(); }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCreators({ q: searchQuery, category: selectedCategory, tab: activeTab });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, activeTab]);

  const doSearch = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
    if (query.trim()) {
      addToSearchHistory(query.trim());
      setSearchHistory(getSearchHistory());
    }
    fetchCreators({ q: query, category: selectedCategory, tab: activeTab });
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    window.history.pushState({}, '', url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(searchQuery);
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category.id);
    setSearchQuery('');
    setShowHistory(false);
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
    setShowHistory(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('category');
    url.searchParams.delete('q');
    window.history.pushState({}, '', url);
    fetchCreators();
  };

  const getSelectedCategoryName = () => categories.find(c => c.id === selectedCategory)?.name || selectedCategory;

  if (isLoading && creators.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Explore Creators</h1>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}
            className={`h-10 w-10 sm:h-9 sm:w-9 ${viewMode === 'grid' ? 'bg-[#8A2BE2]' : ''}`}>
            <Grid3X3 className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}
            className={`h-10 w-10 sm:h-9 sm:w-9 ${viewMode === 'list' ? 'bg-[#8A2BE2]' : ''}`}>
            <List className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* Search with history */}
      <div ref={searchRef} className="relative">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search creators, skills, category, city..."
              className="pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowHistory(true)}
            />
            {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
            {!isLoading && searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(''); setShowHistory(true); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {(searchQuery || selectedCategory || activeTab !== 'all') && (
            <Button type="button" variant="ghost" onClick={clearFilters} className="gap-2">
              <X className="w-4 h-4" /> Clear
            </Button>
          )}
        </form>

        {/* Search History Dropdown */}
        {showHistory && !searchQuery && searchHistory.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Clock className="w-3 h-3" />
                <span>Recent Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((query, idx) => (
                  <button key={idx} onClick={() => doSearch(query)}
                    className="group flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-[#8A2BE2]/10 rounded-full text-sm text-gray-700 hover:text-[#8A2BE2] transition-colors">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{query}</span>
                    <span onClick={(e) => { e.stopPropagation(); removeFromSearchHistory(query); setSearchHistory(getSearchHistory()); }}
                      className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      {!selectedCategory && !searchQuery && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} onClick={handleCategoryClick} />
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
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clearFilters}>Remove Filter</Button>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading...
            </span>
          ) : (
            `${creators.length} creator${creators.length !== 1 ? 's' : ''} found`
          )}
        </p>
      </div>

      {/* Creators */}
      <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); fetchCreators({ q: searchQuery, category: selectedCategory, tab }); }} className="w-full">
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
                <CreatorCard key={creator.id} creator={creator} onViewProfile={(c) => window.location.href = `/creator/${c.id || (c as any)._id}`} onBook={(c) => window.location.href = `/bookings?creator=${c.id || (c as any)._id}`} />
              ))}
            </div>
          ) : (
            <EmptyState
              image="/images/empty-search.png"
              title="No creators found"
              description={searchQuery ? `No creators match "${searchQuery}". Try different keywords.` : selectedCategory ? `No creators found in ${getSelectedCategoryName()} category.` : "No creators available right now"}
              actionLabel={searchQuery || selectedCategory ? 'Clear Filters' : undefined}
              onAction={searchQuery || selectedCategory ? clearFilters : undefined}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
