import { useState, useEffect, useCallback } from 'react';
import { Dialog as ImageDialog, DialogContent as ImageDialogContent, DialogTitle as ImageDialogTitle, DialogDescription as ImageDialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/contexts/AuthContext';
import { Star, MapPin, MessageSquare, Bookmark, Share2, ArrowLeft, ArrowRight, Plus, Trash2, BadgeCheck, ShieldCheck, Pencil, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Creator } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { getImageUrl } from '@/lib/imageUrl';
import { getCreatorProfileUrl } from '@/lib/utils';
import { verificationService } from '@/lib/verificationApi';

interface CreatorProfileProps {
  creatorId?: string;
  isOwnProfile?: boolean;
}

interface Service {
  _id: string;
  title: string;
  description: string;
  images: string[];
  directLink?: string;
  createdAt: string;
}

interface PortfolioItem {
  _id?: string;
  title: string;
  image: string;
  description: string;
  createdAt?: string;
}

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: {
    name: string;
    avatar?: string;
  };
}

export function CreatorProfile({ creatorId, isOwnProfile: propIsOwnProfile }: CreatorProfileProps) {
  const { user: currentUser } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [showAllPortfolio, setShowAllPortfolio] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Edit modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddPortfolioOpen, setIsAddPortfolioOpen] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    bio: '',
    skills: [] as string[],
    category: '',
  });
  const [serviceForm, setServiceForm] = useState({
    title: '',
    description: '',
    directLink: '',
  });
  const [portfolioForm, setPortfolioForm] = useState({
    title: '',
    description: '',
    image: '',
  });

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showCancelVerifyDialog, setShowCancelVerifyDialog] = useState(false);

  // Compute isVerified on-the-fly (client-side grace period check)
  const isVerifiedLive = (() => {
    if (!creator?.verificationSubscription?.expiresAt) return false;
    const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;
    const graceEnd = new Date(creator.verificationSubscription.expiresAt).getTime() + GRACE_PERIOD_MS;
    return graceEnd > Date.now();
  })();

  // Fetch creator data
  const fetchCreatorData = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      
      // If isOwnProfile is passed as prop, use current user's data directly
      if (propIsOwnProfile && currentUser) {
        // Fetch current user's full profile
        const response = await api.get('/auth/me');
        const userData = response.data.data.user;
        
        setCreator(userData);
        setPortfolio(userData.portfolio || []);
        setServices(userData.services || []);
        setReviews([]); // Reviews come from separate endpoint
        setIsOwner(true);

        // Set profile form
        setProfileForm({
          bio: userData.bio || '',
          skills: userData.skills || [],
          category: userData.category || '',
        });
        
        // Fetch user's reviews if they are a creator
        if (userData.role === 'creator') {
          try {
            const reviewsResponse = await api.get(`/reviews/creator/${userData.id}`);
            setReviews(reviewsResponse.data.data?.reviews || []);
          } catch {
            // Ignore error - just no reviews
          }
        }
      } else {
        // Normal creator profile fetch (supports both MongoDB id and seo slug)
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
        const endpoint = isMongoId ? `/creators/${id}` : `/creators/slug/${id}`;
        const response = await api.get(endpoint);
        const { creator: creatorData, reviews: reviewsData } = response.data.data;
        
        setCreator(creatorData);
        setPortfolio(creatorData.portfolio || []);
        setServices(creatorData.services || []);
        setReviews(reviewsData || []);
        
        // Check if current user is the owner
        if (currentUser && currentUser.id === creatorData.id) {
          setIsOwner(true);
        }

        // Set profile form
        setProfileForm({
          bio: creatorData.bio || '',
          skills: creatorData.skills || [],
          category: creatorData.category || '',
        });

        // Check favorite status if user is logged in
        if (currentUser) {
          checkFavoriteStatus(id);
        }
      }
    } catch (error: any) {
      console.error('Error fetching creator:', error);
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error('Failed to load creator profile');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, propIsOwnProfile]);

  // Check if creator is favorited
  const checkFavoriteStatus = async (id: string) => {
    try {
      const response = await api.get(`/favorites/${id}/status`);
      setIsFavorited(response.data.data.isFavorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  useEffect(() => {
    let id: string | undefined = creatorId;
    if (!id) {
      const path = window.location.pathname;
      const match = path.match(/\/creator\/(.+)/);
      id = match ? match[1] : undefined;
    }
    
    if (id) {
      fetchCreatorData(id);
    } else {
      setNotFound(true);
      setIsLoading(false);
    }
  }, [creatorId, fetchCreatorData]);

  // Toggle favorite/bookmark
  const handleToggleFavorite = async () => {
    if (!currentUser) {
      toast.error('Please login to bookmark creators');
      return;
    }

    if (!creator) return;

    try {
      if (isFavorited) {
        await api.delete(`/favorites/${creator.id}`);
        setIsFavorited(false);
        toast.success('Removed from bookmarks');
      } else {
        await api.post(`/favorites/${creator.id}`);
        setIsFavorited(true);
        toast.success('Added to bookmarks');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update bookmark');
    }
  };

  // Share profile
  const handleShare = async () => {
    if (!creator) return;

    const shareUrl = `${window.location.origin}${getCreatorProfileUrl(creator)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${creator.name} - MyArteLab Profile`,
          text: creator.bio || `Check out ${creator.name}'s profile on MyArteLab`,
          url: shareUrl,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Profile link copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    }
  };

  // Update profile
  const handleUpdateProfile = async () => {
    try {
      await api.put('/auth/update-profile', profileForm);
      setCreator(prev => prev ? { ...prev, ...profileForm } : null);
      setIsEditProfileOpen(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  // Add service
  const handleAddService = async () => {
    try {
      const serviceResponse = await api.post('/services', serviceForm);
      setServices(prev => [...prev, serviceResponse.data.data.service]);
      setServiceForm({ title: '', description: '', directLink: '' });
      setIsAddServiceOpen(false);
      toast.success('Service added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add service');
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await api.delete(`/services/${serviceId}`);
      setServices(prev => prev.filter(s => s._id !== serviceId));
      toast.success('Service deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete service');
    }
  };

  // Add portfolio item
  const handleAddPortfolio = async () => {
    try {
      const currentPortfolio = [...portfolio, portfolioForm];
      await api.put('/auth/update-profile', { portfolio: currentPortfolio });
      setPortfolio(currentPortfolio);
      setPortfolioForm({ title: '', description: '', image: '' });
      setIsAddPortfolioOpen(false);
      toast.success('Portfolio item added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add portfolio item');
    }
  };

  // Delete portfolio item
  const handleDeletePortfolio = async (index: number) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return;
    
    try {
      const newPortfolio = portfolio.filter((_, i) => i !== index);
      await api.put('/auth/update-profile', { portfolio: newPortfolio });
      setPortfolio(newPortfolio);
      toast.success('Portfolio item deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete portfolio item');
    }
  };

  // Upload image helper
  const handleImageUpload = async (file: File, _type: 'avatar' | 'cover' | 'portfolio' | 'service') => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      return response.data.data.url;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload image');
      return null;
    }
  };

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

  if (isLoading || !creator) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#8A2BE2] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const locationString = creator.location 
    ? `${creator.location.localArea || ''}, ${creator.location.state || ''}, ${creator.location.country || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')
    : 'No location set';

  const ratingAverage: number = typeof creator.rating === 'object' && creator.rating !== null
    ? ((creator.rating as any).average || 0)
    : typeof creator.rating === 'number'
      ? creator.rating
      : 0;

  const ratingCount: number = typeof creator.rating === 'object' && creator.rating !== null
    ? ((creator.rating as any).count || 0)
    : (creator.reviewCount || 0);

  const categoryLabel = (
    Array.isArray(creator.category)
      ? creator.category.join(', ')
      : String(creator.category ?? '')
  ).replace(/_/g, ' ');

  const isAvailable = (creator.availability || 'available') === 'available';

  const handleToggleAvailability = async () => {
    const next = isAvailable ? 'busy' : 'available';
    try {
      await api.post('/creators/availability', { availability: next });
      setCreator(prev => prev ? { ...prev, availability: next } : null);
      toast.success(next === 'available' ? 'You are now available' : 'You are now busy');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const PORTFOLIO_PREVIEW_COUNT = 4;
  const visiblePortfolio = showAllPortfolio ? portfolio : portfolio.slice(0, PORTFOLIO_PREVIEW_COUNT);

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-[#8A2BE2]/10 bg-white shadow-sm">
        {/* Lavender band with wave edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[#EFE8FC]" aria-hidden="true">
          <svg
            viewBox="0 0 400 48"
            preserveAspectRatio="none"
            className="absolute -bottom-px left-0 h-10 w-full fill-white"
          >
            <path d="M0 48V26C70 10 150 2 230 10C300 17 355 26 400 16V48Z" />
          </svg>
        </div>

        <div className="relative p-4 sm:p-6">
          {/* Top row: back (mobile) + availability */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 lg:hidden"
              onClick={() => window.history.back()}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="ml-auto">
              {isOwner ? (
                <button
                  type="button"
                  onClick={handleToggleAvailability}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-amber-500'}`} />
                  {isAvailable ? 'Available' : 'Busy'}
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
              ) : (
                <StatusBadge status={creator.availability || 'available'} />
              )}
            </div>
          </div>

          {/* Avatar + identity */}
          <div className="mt-3 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <img
                src={getImageUrl(creator.avatar) || '/images/avatar-1.png'}
                alt={creator.name}
                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-md sm:h-24 sm:w-24"
              />
              {isOwner && (
                <label
                  className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#8A2BE2] text-white hover:bg-[#7B1FD1]"
                  aria-label="Change avatar"
                >
                  <Plus className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleImageUpload(file, 'avatar');
                        if (url) {
                          await api.put('/auth/update-profile', { avatar: url });
                          setCreator(prev => prev ? { ...prev, avatar: url } : null);
                          toast.success('Avatar updated');
                        }
                      }
                    }}
                  />
                </label>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="min-w-0 truncate text-xl font-bold text-gray-900 sm:text-2xl">{creator.name}</h1>
                {isVerifiedLive && (
                  <span className="flex-shrink-0">
                    <VerifiedBadge
                      expiresAt={creator.verificationSubscription?.expiresAt}
                      onClick={() => isOwner && setShowCancelVerifyDialog(true)}
                    />
                  </span>
                )}
              </div>
              <p className="truncate text-sm capitalize text-gray-500">
                {categoryLabel ? `${categoryLabel} Specialist` : 'Specialist'}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-gray-500">
                <div className="flex flex-shrink-0 items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{ratingAverage.toFixed(1)}</span>
                  <span>({ratingCount})</span>
                </div>
                <span className="h-4 w-px flex-shrink-0 bg-gray-300" aria-hidden="true" />
                <div className="flex min-w-0 items-center gap-1">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{locationString}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary actions */}
          <div className="mt-4 flex gap-3 sm:max-w-md">
            {isOwner ? (
              <>
                {!isVerifiedLive && (
                  <Button
                    className="h-11 flex-[1.6] rounded-xl bg-[#8A2BE2] text-white hover:bg-[#7B1FD1]"
                    onClick={() => setShowVerifyDialog(true)}
                  >
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    Verify
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-[#8A2BE2]/40 text-gray-900"
                  onClick={() => setIsEditProfileOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4 text-[#8A2BE2]" />
                  Edit Profile
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="h-11 flex-[1.6] rounded-xl bg-[#8A2BE2] text-white hover:bg-[#7B1FD1]"
                  onClick={() => window.location.href = `/bookings?creator=${creator.id}`}
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Book Now
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-11 flex-1 rounded-xl border-[#8A2BE2]/40 text-gray-900"
                >
                  <a href={`/messages?user=${creator.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4 text-[#8A2BE2]" />
                    Message
                  </a>
                </Button>
              </>
            )}
          </div>

          {/* Bio */}
          <p className="mt-4 text-sm text-gray-600 sm:text-base">{creator.bio || 'No bio available'}</p>

          {/* Skills */}
          {(creator.skills || []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(creator.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-[#8A2BE2]/10 px-2 py-1 text-xs text-[#8A2BE2] sm:px-3 sm:text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Bookmark + share */}
          <div className="mt-4 flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleFavorite}
              aria-label={isFavorited ? 'Remove bookmark' : 'Bookmark creator'}
              className={`h-11 w-11 rounded-xl ${isFavorited ? 'text-amber-500' : ''}`}
            >
              <Bookmark className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              aria-label="Share profile"
              className="h-11 w-11 rounded-xl"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-[#F1ECFA] p-1 lg:max-w-lg">
          {(['portfolio', 'services', 'reviews'] as const).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-xl border-b-2 border-transparent py-2.5 text-sm font-semibold capitalize text-gray-500 data-[state=active]:border-[#8A2BE2] data-[state=active]:bg-white data-[state=active]:text-[#8A2BE2] data-[state=active]:shadow-sm"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Portfolio */}
        <TabsContent value="portfolio" className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">{isOwner ? 'My Portfolio' : 'Portfolio'}</h2>
            <div className="flex items-center gap-3">
              {isOwner && (
                <Dialog open={isAddPortfolioOpen} onOpenChange={setIsAddPortfolioOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-full bg-[#8A2BE2] text-white hover:bg-[#7B1FD1]">
                      <Plus className="mr-1 h-4 w-4" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Portfolio Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={portfolioForm.title}
                          onChange={(e) => setPortfolioForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Project title"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={portfolioForm.description}
                          onChange={(e) => setPortfolioForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your work..."
                        />
                      </div>
                      <div>
                        <Label>Image URL</Label>
                        <Input
                          value={portfolioForm.image}
                          onChange={(e) => setPortfolioForm(prev => ({ ...prev, image: e.target.value }))}
                          placeholder="https://example.com/image.jpg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Or upload an image:</p>
                        <Input
                          type="file"
                          accept="image/*"
                          className="mt-2"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleImageUpload(file, 'portfolio');
                              if (url) {
                                setPortfolioForm(prev => ({ ...prev, image: url }));
                              }
                            }
                          }}
                        />
                      </div>
                      <Button onClick={handleAddPortfolio} className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1]">
                        Add Item
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {portfolio.length > PORTFOLIO_PREVIEW_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAllPortfolio(prev => !prev)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#8A2BE2]"
                >
                  {showAllPortfolio ? 'Show less' : 'View All'}
                  {!showAllPortfolio && <ArrowRight className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>

          {portfolio.length === 0 ? (
            <EmptyState
              image="/images/empty-projects.png"
              title="No Portfolio Items"
              description={isOwner ? "Add your best work to showcase your skills" : "This creator hasn't added any portfolio items yet"}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {visiblePortfolio.map((item, index) => (
                <div
                  key={item._id || index}
                  className="group relative aspect-[3/2] overflow-hidden rounded-2xl bg-gray-100"
                >
                  <button
                    type="button"
                    className="absolute inset-0 h-full w-full"
                    onClick={() => item.image && setSelectedItem(item)}
                    aria-label={`View ${item.title}`}
                  >
                    <img
                      src={getImageUrl(item.image) || '/images/placeholder.png'}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/placeholder.png';
                      }}
                    />
                  </button>
                  <span className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {item.title}
                  </span>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/90 text-red-500 hover:bg-white"
                      onClick={() => handleDeletePortfolio(index)}
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">{isOwner ? 'My Services' : 'Services'}</h2>
            {isOwner && (
              <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-full bg-[#8A2BE2] text-white hover:bg-[#7B1FD1]">
                    <Plus className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Service</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={serviceForm.title}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Service title"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your service..."
                      />
                    </div>
                    <div>
                      <Label>Direct Link (Optional)</Label>
                      <Input
                        value={serviceForm.directLink}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, directLink: e.target.value }))}
                        placeholder="https://example.com/service"
                      />
                    </div>
                    <Button onClick={handleAddService} className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1]">
                      Add Service
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {services.length === 0 ? (
            <EmptyState
              image="/images/empty-projects.png"
              title="No Services"
              description={isOwner ? "Add services to start receiving bookings" : "This creator hasn't added any services yet"}
            />
          ) : (
            <div className="space-y-3">
              {services.map((service) => {
                const [coverImage, ...extraImages] = service.images || [];
                return (
                  <div
                    key={service._id}
                    className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <img
                        src={getImageUrl(coverImage) || '/images/placeholder.png'}
                        alt={service.title}
                        className="h-24 w-28 flex-shrink-0 rounded-xl bg-gray-100 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder.png';
                        }}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-base font-semibold text-gray-900">{service.title}</h3>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="-mr-1 -mt-1 h-8 w-8 flex-shrink-0 text-red-500"
                              onClick={() => handleDeleteService(service._id)}
                              aria-label={`Delete ${service.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{service.description}</p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                          {!isOwner ? (
                            <Button
                              size="sm"
                              className="rounded-full bg-[#8A2BE2] text-white hover:bg-[#7B1FD1]"
                              onClick={() => window.location.href = `/bookings?creator=${creator.id}&service=${service._id}`}
                            >
                              Book Now
                            </Button>
                          ) : (
                            <span />
                          )}
                          {service.directLink && (
                            <a
                              href={service.directLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-semibold text-[#8A2BE2] hover:underline"
                            >
                              View service
                              <ArrowRight className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {extraImages.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {extraImages.map((img, idx) => (
                          <img
                            key={idx}
                            src={getImageUrl(img)}
                            alt={`${service.title} ${idx + 2}`}
                            className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="mt-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            {reviews.length === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#8A2BE2]/10">
                  <MessageSquare className="h-10 w-10 text-[#8A2BE2]" strokeWidth={1.5} />
                  <Star className="absolute -mt-1 h-4 w-4 text-[#8A2BE2]" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900">No reviews yet</h3>
                <p className="mt-1 text-gray-500">Reviews will appear here.</p>
              </div>
            )}

            <div
              className={`flex flex-col items-center text-center ${
                reviews.length === 0 ? 'mt-2 border-t border-gray-200 pt-6' : 'py-2'
              }`}
            >
              <span className="text-4xl font-bold text-gray-900">{ratingAverage.toFixed(1)}</span>
              <div className="mt-2 flex items-center gap-1" aria-label={`Rated ${ratingAverage.toFixed(1)} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-5 w-5 ${
                      n <= Math.round(ratingAverage) ? 'fill-amber-400 text-amber-400' : 'text-[#8A2BE2]/60'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
              </p>
            </div>

            {reviews.length > 0 && (
              <div className="mt-6 space-y-4">
                {reviews.map((review) => (
                  <div key={review._id} className="border-t pt-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={getImageUrl(review.reviewer.avatar) || '/images/avatar-1.png'}
                        alt={review.reviewer.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{review.reviewer.name}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{review.comment}</p>
                        <p className="text-gray-400 text-xs mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Bio</Label>
              <Textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={profileForm.category}
                onChange={(e) => setProfileForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Your category (e.g., Design, Writing)"
              />
            </div>
            <div>
              <Label>Skills (comma or space separated)</Label>
              <Input
                value={profileForm.skills.join(', ')}
                onChange={(e) => {
                  const value = e.target.value;
                  // Split by comma, space, or both, then clean up
                  const skills = value
                    .split(/[,\s]+/)  // Split by comma or whitespace
                    .map(s => s.trim())
                    .filter(s => s.length > 0 && s !== ',');
                  setProfileForm(prev => ({ ...prev, skills }));
                }}
                placeholder="e.g., Photoshop, Writing, Video Editing"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate skills with commas or spaces
              </p>
              {/* Preview of skills */}
              {profileForm.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {profileForm.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-[#8A2BE2]/10 text-[#8A2BE2] text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleUpdateProfile} className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1]">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-6 h-6 text-[#8A2BE2]" />
              Get Verified
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-[#8A2BE2]/10 p-4 rounded-lg">
              <h3 className="font-semibold text-[#8A2BE2]">Verification Badge</h3>
              <p className="text-sm text-[#8A2BE2]/80 mt-1">
                Stand out as a trusted creator with a verified badge on your profile.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price</span>
                <span className="font-semibold">1.00 USDC / month</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold">30 days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Auto-renew</span>
                <span className="font-semibold">Enabled</span>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500">
                The amount will be deducted from your wallet balance. 
                If you don't have enough balance, please deposit first.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowVerifyDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                disabled={isVerifying}
                onClick={async () => {
                  try {
                    setIsVerifying(true);
                    const result = await verificationService.subscribe();
                    setCreator(prev => prev ? { 
                      ...prev, 
                      isVerified: true,
                      verificationSubscription: {
                        active: true,
                        subscribedAt: new Date().toISOString(),
                        expiresAt: result.expiresAt,
                        lastRenewalAt: new Date().toISOString(),
                        autoRenew: true
                      }
                    } : null);
                    toast.success('You are now verified!');
                    setShowVerifyDialog(false);
                  } catch (error: any) {
                    toast.error(error.response?.data?.error || 'Failed to subscribe');
                  } finally {
                    setIsVerifying(false);
                  }
                }}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <BadgeCheck className="w-4 h-4 mr-1" />
                    Pay 1.00 USDC & Verify
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Verification Dialog */}
      <Dialog open={showCancelVerifyDialog} onOpenChange={setShowCancelVerifyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-6 h-6 text-red-500" />
              Cancel Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-700">Remove Verified Badge?</h3>
              <p className="text-sm text-red-600/80 mt-1">
                Your blue tick will be removed immediately. You can re-verify anytime.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowCancelVerifyDialog(false)}
              >
                Keep Badge
              </Button>
              <Button 
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={isVerifying}
                onClick={async () => {
                  try {
                    setIsVerifying(true);
                    await verificationService.cancel();
                    setCreator(prev => prev ? { ...prev, isVerified: false, verificationSubscription: undefined } : null);
                    toast.success('Verification cancelled');
                    setShowCancelVerifyDialog(false);
                  } catch (error: any) {
                    toast.error(error.response?.data?.error || 'Failed to cancel');
                  } finally {
                    setIsVerifying(false);
                  }
                }}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Cancel Subscription'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Image Viewer */}
      <ImageDialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <ImageDialogContent className="max-w-none w-screen h-screen p-0 overflow-hidden bg-black/95 border-none rounded-none" showCloseButton={false}>
          {/* Hidden title for accessibility */}
          <ImageDialogTitle className="sr-only">Portfolio Image</ImageDialogTitle>
          <ImageDialogDescription className="sr-only">Full size portfolio image viewer</ImageDialogDescription>
          {/* Close button */}
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
            {selectedItem && (
              <>
                <img
                  src={getImageUrl(selectedItem.image)}
                  alt={selectedItem.title || 'Portfolio'}
                  className="max-h-[80vh] max-w-full object-contain"
                />
                {(selectedItem.title || selectedItem.description) && (
                  <div className="max-w-xl text-center text-white">
                    {selectedItem.title && <p className="font-semibold">{selectedItem.title}</p>}
                    {selectedItem.description && (
                      <p className="mt-1 text-sm text-white/70">{selectedItem.description}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ImageDialogContent>
      </ImageDialog>
    </div>
  );
}