import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { creators } from '@/lib/data/mockData';
import type { Creator } from '@/types';

export function Creators() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'top'>('all');

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = (creator.name || 'Unknown').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         creator.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         creator.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filter === 'verified') return matchesSearch && creator.isVerified;
    if (filter === 'top') return matchesSearch && (creator.rating || 0) >= 4.8;
    return matchesSearch;
  });

  const handleViewProfile = (creator: Creator) => {
    window.location.href = `/creator/${creator.id}`;
  };

  const handleBook = (creator: Creator) => {
    window.location.href = `/bookings?creator=${creator.id}`;
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Creators</h1>
        <p className="text-gray-500">Discover talented professionals for your projects</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search creators..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-[#8A2BE2]' : ''}
          >
            All
          </Button>
          <Button
            variant={filter === 'verified' ? 'default' : 'outline'}
            onClick={() => setFilter('verified')}
            className={filter === 'verified' ? 'bg-[#8A2BE2]' : ''}
          >
            Verified
          </Button>
          <Button
            variant={filter === 'top' ? 'default' : 'outline'}
            onClick={() => setFilter('top')}
            className={filter === 'top' ? 'bg-[#8A2BE2]' : ''}
          >
            <Star className="w-4 h-4 mr-1" />
            Top Rated
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-500">
        Showing {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''}
      </p>

      {/* Creators Grid */}
      {filteredCreators.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          description="Try a different search term"
          actionLabel="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      )}
    </div>
  );
}
