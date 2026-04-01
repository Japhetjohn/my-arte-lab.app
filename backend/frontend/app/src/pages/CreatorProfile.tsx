import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { VerifiedBadge } from '@/components/ui-custom/VerifiedBadge';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { creators } from '@/lib/data/mockData';
import { Star, MapPin, MessageSquare, Bookmark, Share2, ArrowLeft } from 'lucide-react';
import type { Creator } from '@/types';

interface CreatorProfileProps {
  creatorId?: string;
}

export function CreatorProfile({ creatorId }: CreatorProfileProps) {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // If creatorId is passed as prop, use it
    // Otherwise try to get from URL
    let id: string | undefined = creatorId;
    if (!id) {
      const path = window.location.pathname;
      const match = path.match(/\/creator\/(.+)/);
      id = match ? match[1] : undefined;
    }
    
    if (id) {
      const found = creators.find(c => c.id === id);
      if (found) {
        setCreator(found);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    } else {
      setNotFound(true);
    }
  }, [creatorId]);

  if (notFound) {
    return (
      <EmptyState
        image="/images/error.png"
        title="Creator Not Found"
        description="The creator you are looking for does not exist"
        actionLabel="Browse Creators"
        onAction={() => window.location.href = '/creators'}
      />
    );
  }

  if (!creator) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#8A2BE2] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Back Button - Mobile */}
      <Button 
        variant="ghost" 
        className="lg:hidden -ml-2"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Header Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg mx-auto sm:mx-0"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{creator.name}</h1>
                    {creator.isVerified && <VerifiedBadge />}
                  </div>
                  <p className="text-gray-500 capitalize">{creator.category} Specialist</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{creator.rating}</span>
                      <span>({creator.reviewCount})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {creator.location && (creator.location.localArea || creator.location.state || creator.location.country) ? `${creator.location.localArea || ''}, ${creator.location.state || ''}, ${creator.location.country || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',') : 'No location set'}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <StatusBadge status={creator.availability} />
                </div>
              </div>

              <p className="mt-4 text-gray-600 text-sm sm:text-base">{creator.bio}</p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                {creator.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 sm:px-3 py-1 bg-[#8A2BE2]/10 text-[#8A2BE2] text-xs sm:text-sm rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 mt-6">
                <Button 
                  className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                  onClick={() => window.location.href = `/bookings?creator=${creator.id}`}
                >
                  Book Now
                </Button>
                <Button variant="outline" asChild>
                  <a href={`/messages?user=${creator.id}`}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </a>
                </Button>
                <Button variant="outline" size="icon">
                  <Bookmark className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="hidden sm:inline-flex">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creator.portfolio.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-40 sm:h-48 object-cover"
                />
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">{creator.category} Services</h3>
                  <p className="text-gray-500 text-sm">Starting from</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl sm:text-3xl font-bold text-[#8A2BE2]">${creator.startingPrice}</p>
                  <p className="text-xs sm:text-sm text-gray-500">per project</p>
                </div>
              </div>
              <Button 
                className="w-full mt-6 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                onClick={() => window.location.href = `/bookings?creator=${creator.id}`}
              >
                Book Now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-6 sm:py-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Star className="w-6 h-6 sm:w-8 sm:h-8 fill-amber-400 text-amber-400" />
                  <span className="text-3xl sm:text-4xl font-bold">{creator.rating}</span>
                </div>
                <p className="text-gray-500 text-sm sm:text-base">Based on {creator.reviewCount} reviews</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
