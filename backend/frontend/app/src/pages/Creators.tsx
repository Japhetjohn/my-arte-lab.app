import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star, Loader2, TrendingUp, Award } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Creator {
  _id: string;
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  avatar?: string;
  category: string;
  bio?: string;
  skills: string[];
  rating: {
    average: number;
    count: number;
  };
  isVerified: boolean;
  isActive: boolean;
  completedBookings: number;
  availability: 'available' | 'busy' | 'unavailable';
  location?: {
    country?: string;
    state?: string;
    localArea?: string;
  };
  _profileScore?: number;
  _activityScore?: number;
}

export function Creators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'trending' | 'rating' | 'newest' | 'popular'>('trending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const categories = [
    'all', 'Photography', 'Videography', 'Graphic Design', 'Web Development',
    'Writing', 'Marketing', 'Music', 'Art', 'Other'
  ];

  useEffect(() => {
    fetchCreators();
  }, [sortBy, selectedCategory, page]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchCreators();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCreators = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      params.append('sortBy', sortBy);
      params.append('page', page.toString());
      params.append('limit', '12');
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await api.get(`/creators?${params.toString()}`);
      const data = response.data.data;
      
      const fetchedCreators = data?.creators || [];
      setCreators(fetchedCreators);
      setTotal(data?.pagination?.total || 0);
      setTotalPages(data?.pagination?.totalPages || 1);
      
      // Show message if no creators found
      if (fetchedCreators.length === 0 && !searchQuery && selectedCategory === 'all') {
        console.log('[Creators] No creators found in database');
      }
    } catch (error: any) {
      console.error('[Creators] Error fetching:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch creators');
      setCreators([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProfile = (creator: Creator) => {
    window.location.href = `/creator/${creator.id || creator._id}`;
  };

  const handleBook = (creator: Creator) => {
    window.location.href = `/bookings?creator=${creator.id || creator._id}`;
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discover Creators</h1>
        <p className="text-gray-500">Find talented professionals ranked by activity and quality</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search creators by name, category, or skills..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2">
          {/* Sort Buttons */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <Button
              size="sm"
              variant={sortBy === 'trending' ? 'default' : 'ghost'}
              onClick={() => setSortBy('trending')}
              className={sortBy === 'trending' ? 'bg-[#8A2BE2]' : ''}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Active
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'rating' ? 'default' : 'ghost'}
              onClick={() => setSortBy('rating')}
              className={sortBy === 'rating' ? 'bg-[#8A2BE2]' : ''}
            >
              <Star className="w-4 h-4 mr-1" />
              Top Rated
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'popular' ? 'default' : 'ghost'}
              onClick={() => setSortBy('popular')}
              className={sortBy === 'popular' ? 'bg-[#8A2BE2]' : ''}
            >
              <Award className="w-4 h-4 mr-1" />
              Popular
            </Button>
          </div>

          {/* Category Filter */}
          <select
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Categories</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchQuery || selectedCategory !== 'all' || sortBy !== 'trending') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSortBy('trending');
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? 'Loading...' : `Showing ${creators.length} of ${total} creators`}
          {sortBy === 'trending' && (
            <span className="text-[#8A2BE2] ml-1">• Sorted by most active first</span>
          )}
        </p>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Creators Grid */}
      {creators.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {creators.map((creator) => (
            <CreatorCard 
              key={creator._id || creator.id} 
              creator={creator as any}
              onViewProfile={() => handleViewProfile(creator)}
              onBook={() => handleBook(creator)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="search"
          title="No creators found"
          description={searchQuery 
            ? `No creators match "${searchQuery}". Try a different search.`
            : total === 0 
              ? "There are no creators registered yet. Be the first to sign up as a creator!"
              : "No creators match your filters. Try different criteria."
          }
          actionLabel={total === 0 ? "Become a Creator" : "Clear Filters"}
          onAction={() => {
            if (total === 0) {
              window.location.href = '/settings';
            } else {
              setSearchQuery('');
              setSelectedCategory('all');
              setSortBy('trending');
            }
          }}
        />
      )}

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
