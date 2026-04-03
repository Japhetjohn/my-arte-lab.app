import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

import { Search, Loader2 } from 'lucide-react';
import { CreatorCard } from '@/components/shared/CreatorCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Creator } from '@/types';

export function Creators() {
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all creators on mount
  useEffect(() => {
    fetchCreators();
  }, []);

  // Filter creators when search changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCreators(allCreators);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allCreators.filter(creator => {
      const name = (creator.name || `${creator.firstName || ''} ${creator.lastName || ''}`).toLowerCase();
      const category = (creator.category || '').toLowerCase();
      const skills = (creator.skills || []).join(' ').toLowerCase();
      const bio = (creator.bio || '').toLowerCase();
      
      return name.includes(query) || 
             category.includes(query) || 
             skills.includes(query) ||
             bio.includes(query);
    });
    
    setFilteredCreators(filtered);
  }, [searchQuery, allCreators]);

  const fetchCreators = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all creators - same endpoint as Home page
      const response = await api.get('/creators?limit=100');
      const creators = response.data.data?.results || response.data.data?.creators || response.data.data || [];
      
      setAllCreators(creators);
      setFilteredCreators(creators);
    } catch (error: any) {
      console.error('Error fetching creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProfile = (creator: any) => {
    const id = creator.id || creator._id;
    window.location.href = `/creator/${id}`;
  };

  const handleBook = (creator: any) => {
    const id = creator.id || creator._id;
    window.location.href = `/bookings?creator=${id}`;
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Creators</h1>
        <p className="text-gray-500">Discover talented professionals ({filteredCreators.length} total)</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Search by name, category, or skills..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Creators Grid */}
      {filteredCreators.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCreators.map((creator) => (
            <CreatorCard 
              key={creator.id || (creator as any)._id} 
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
            : "There are no creators registered yet."
          }
          actionLabel={searchQuery ? "Clear Search" : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      )}
    </div>
  );
}
