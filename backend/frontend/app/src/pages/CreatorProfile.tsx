import { useState, useEffect, useCallback } from 'react';
import { Dialog as ImageDialog, DialogContent as ImageDialogContent, DialogTitle as ImageDialogTitle, DialogDescription as ImageDialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/contexts/AuthContext';
import { Star, MapPin, MessageSquare, Bookmark, Share2, ArrowLeft, Plus, Trash2, ExternalLink, BadgeCheck, Loader2, MoreVertical, ChevronDown, Pencil } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Creator } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'services' | 'reviews'>('reviews');

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
    if (!creator?.verificationSubscription?.expiresAt) return Boolean(creator?.isVerified);
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

  // Toggle availability
  const handleToggleAvailability = async (newStatus: 'available' | 'busy' | 'unavailable') => {
    try {
      await api.post('/creators/availability', { availability: newStatus });
      setCreator(prev => prev ? { ...prev, availability: newStatus } : null);
      toast.success(newStatus === 'available' ? 'You are now available' : newStatus === 'busy' ? 'You are now busy' : 'You are now unavailable');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  // Helper: get rating values
  const getRating = () => {
    if (typeof creator?.rating === 'object' && creator.rating !== null) {
      return {
        average: ((creator.rating as any).average || 0).toFixed(1),
        count: (creator.rating as any).count || 0,
      };
    }
    if (typeof creator?.rating === 'number') {
      return {
        average: creator.rating.toFixed(1),
        count: creator.reviewCount || 0,
      };
    }
    return { average: '0.0', count: 0 };
  };

  // Helper: get location string
  const getLocation = () => {
    if (!creator?.location) return 'Nigeria';
    const parts = [creator.location.country || creator.location.state || creator.location.localArea].filter(Boolean);
    return parts.length > 0 ? parts[0] : 'Nigeria';
  };

  // Helper: render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 transition-colors ${
              star <= rating
                ? 'fill-[#8A2BE2] text-[#8A2BE2]'
                : 'fill-none text-[#8A2BE2]/60 stroke-[#8A2BE2]/60 stroke-[1.5]'
            }`}
          />
        ))}
      </div>
    );
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

  const { average: ratingAvg, count: ratingCount } = getRating();
  const locationString = getLocation();
  const currentAvailability = creator.availability || 'available';

  return (
    <div className="min-h-screen bg-white pb-20 -mx-3 sm:-mx-4 lg:-mx-6 xl:-mx-8 -mt-3 sm:-mt-4 lg:-mt-6 xl:-mt-8">
      {/* ===== TOP WAVE BACKGROUND & NAVIGATION ===== */}
      <div className="relative w-full">
        {/* Soft Lavender Gradient & Wave Curve */}
        <div className="absolute inset-x-0 top-0 h-44 sm:h-52 bg-gradient-to-b from-[#EDE7FA] via-[#F4EFFF] to-transparent pointer-events-none overflow-hidden">
          <svg
            className="absolute bottom-0 w-full h-16 sm:h-20 text-white"
            viewBox="0 0 1440 120"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,32L60,42.7C120,53,240,75,360,74.7C480,75,600,53,720,48C840,43,960,53,1080,58.7C1200,64,1320,64,1380,64L1440,64L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z" />
          </svg>
        </div>

        {/* Top App Bar (Back Arrow & 3-Dots Menu) */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-3 pb-2 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-95 transition-all text-gray-800"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-10 h-10 -mr-1 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-95 transition-all text-gray-800"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5 stroke-[2.2]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border border-gray-100">
              <DropdownMenuItem onClick={handleShare} className="cursor-pointer py-2.5">
                <Share2 className="w-4 h-4 mr-2.5 text-gray-600" />
                <span>Share Profile</span>
              </DropdownMenuItem>
              {!isOwner && (
                <DropdownMenuItem onClick={handleToggleFavorite} className="cursor-pointer py-2.5">
                  <Bookmark className={`w-4 h-4 mr-2.5 ${isFavorited ? 'fill-amber-500 text-amber-500' : 'text-gray-600'}`} />
                  <span>{isFavorited ? 'Remove Bookmark' : 'Save to Bookmarks'}</span>
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)} className="cursor-pointer py-2.5">
                  <Pencil className="w-4 h-4 mr-2.5 text-gray-600" />
                  <span>Edit Details</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ===== CREATOR PROFILE HEADER ===== */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pt-2">
          {/* Avatar, Info & Availability Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              {/* Avatar with Ring & + badge */}
              <div className="relative flex-shrink-0">
                <img
                  src={getImageUrl(creator.avatar) || '/images/avatar-1.png'}
                  alt={creator.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-white shadow-md bg-gray-100"
                />
                {isOwner && (
                  <label 
                    className="absolute bottom-0 right-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#8A2BE2] hover:bg-[#7822c9] active:scale-90 text-white flex items-center justify-center ring-2 ring-white shadow-sm cursor-pointer transition-all"
                    title="Upload profile picture"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
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
                            toast.success('Avatar updated successfully');
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Creator Name, Verified Tick, Specialty, Stats */}
              <div className="flex-1 min-w-0 pt-1">
                {/* Name + Verified Rosette */}
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">
                    {creator.name}
                  </h1>
                  {isVerifiedLive && (
                    <button
                      type="button"
                      onClick={() => isOwner && setShowCancelVerifyDialog(true)}
                      className="inline-flex flex-shrink-0 focus:outline-none"
                      title={isOwner ? "Manage verification" : "Verified Creator"}
                    >
                      <svg className="w-5 h-5 text-[#8A2BE2] fill-current" viewBox="0 0 24 24">
                        <path d="M10.29 2.3c.73-.4 1.63-.4 2.36 0l1.24.68c.37.2.78.3 1.2.28l1.42-.08c.83-.05 1.6.4 1.96 1.15l.63 1.28c.19.38.48.69.85.89l1.26.69c.74.4 1.16 1.2 1.07 2.03l-.15 1.41c-.05.42.06.84.28 1.2l.77 1.2c.45.7.45 1.6 0 2.3l-.77 1.2c-.22.36-.33.78-.28 1.2l.15 1.41c.09.83-.33 1.63-1.07 2.03l-1.26.69c-.37.2-.66.51-.85.89l-.63 1.28c-.36.75-1.13 1.2-1.96 1.15l-1.42-.08c-.42-.02-.83.08-1.2.28l-1.24.68c-.73.4-1.63.4-2.36 0l-1.24-.68c-.37-.2-.78-.3-1.2-.28l-1.42.08c-.83.05-1.6-.4-1.96-1.15l-.63-1.28c-.19-.38-.48-.69-.85-.89l-1.26-.69c-.74-.4-1.16-1.2-1.07-2.03l.15-1.41c.05-.42-.06-.84-.28-1.2l-.77-1.2c-.45-.7-.45-1.6 0-2.3l.77-1.2c.22-.36.33-.78.28-1.2l-.15-1.41c-.09-.83.33-1.63 1.07-2.03l1.26-.69c.37-.2.66-.51.85-.89l.63-1.28c.36-.75 1.13-1.2 1.96-1.15l1.42.08c.42.02.83-.08 1.2-.28l1.24-.68z" />
                        <path d="M9.5 12.5l2 2 4.5-4.5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Subtitle / Category */}
                <p className="text-gray-500 text-sm font-normal mt-0.5">
                  {creator.category 
                    ? (Array.isArray(creator.category) ? creator.category.join(', ') : creator.category)
                    : 'Specialist'}
                </p>

                {/* Stats Row: Star Rating | Location */}
                <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500 flex-wrap">
                  <div className="flex items-center gap-1 font-medium text-gray-700">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{ratingAvg} ({ratingCount})</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{locationString}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Availability Badge Pill (Top Right) */}
            <div className="flex-shrink-0 pt-1">
              {isOwner ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 active:scale-95 transition-all">
                      <span className={`w-2 h-2 rounded-full ${
                        currentAvailability === 'available'
                          ? 'bg-emerald-500 ring-2 ring-emerald-100'
                          : currentAvailability === 'busy'
                            ? 'bg-amber-500 ring-2 ring-amber-100'
                            : 'bg-gray-400 ring-2 ring-gray-100'
                      }`} />
                      <span className="capitalize">{currentAvailability}</span>
                      <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 rounded-xl border border-gray-100 shadow-lg">
                    <DropdownMenuItem 
                      onClick={() => handleToggleAvailability('available')}
                      className="cursor-pointer text-xs py-2 font-medium"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                      Available
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleToggleAvailability('busy')}
                      className="cursor-pointer text-xs py-2 font-medium"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                      Busy
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleToggleAvailability('unavailable')}
                      className="cursor-pointer text-xs py-2 font-medium"
                    >
                      <span className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                      Unavailable
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    currentAvailability === 'available'
                      ? 'bg-emerald-500'
                      : currentAvailability === 'busy'
                        ? 'bg-amber-500'
                        : 'bg-gray-400'
                  }`} />
                  <span className="capitalize">{currentAvailability}</span>
                </div>
              )}
            </div>
          </div>

          {/* ===== ACTION BUTTONS (VERIFY & EDIT PROFILE) ===== */}
          <div className="mt-5">
            {isOwner ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Verify Button (solid purple) */}
                <button
                  type="button"
                  onClick={() => setShowVerifyDialog(true)}
                  className={`h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] ${
                    isVerifiedLive
                      ? 'bg-purple-100 text-[#8A2BE2] hover:bg-purple-200'
                      : 'bg-[#8A2BE2] hover:bg-[#7822c9] text-white'
                  }`}
                >
                  <svg className="w-4 h-4 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <span>{isVerifiedLive ? 'Verified' : 'Verify'}</span>
                </button>

                {/* Edit Profile Button (white outline with purple border & icon) */}
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border-2 border-[#8A2BE2] text-gray-900 bg-white hover:bg-purple-50 active:scale-[0.98] transition-all shadow-xs"
                >
                  <Pencil className="w-4 h-4 text-[#8A2BE2] stroke-[2.2]" />
                  <span>Edit Profile</span>
                </button>
              </div>
            ) : (
              /* Visitor Actions */
              <div className="flex gap-2.5">
                <Button 
                  className="flex-1 h-11 bg-[#8A2BE2] hover:bg-[#7822c9] text-white rounded-xl text-sm font-semibold shadow-sm active:scale-[0.98]"
                  onClick={() => window.location.href = `/bookings?creator=${creator.id}`}
                >
                  Book Now
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-11 rounded-xl text-sm font-semibold border-2 border-[#8A2BE2] text-gray-900 hover:bg-purple-50 active:scale-[0.98]"
                  asChild
                >
                  <a href={`/messages?user=${creator.id}`}>
                    <MessageSquare className="w-4 h-4 mr-2 text-[#8A2BE2]" />
                    Message
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-11 w-11 rounded-xl border-gray-200 flex-shrink-0"
                  onClick={handleToggleFavorite}
                >
                  <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-amber-500 text-amber-500' : 'text-gray-600'}`} />
                </Button>
              </div>
            )}
          </div>

          {/* ===== BIO & SKILLS (Expandable on desktop/mobile) ===== */}
          {creator.bio && (
            <p className="mt-4 text-gray-600 text-sm leading-relaxed">
              {creator.bio}
            </p>
          )}

          {(creator.skills || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(creator.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-purple-50 text-[#8A2BE2] text-xs font-medium rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* ===== SEGMENTED TABS (PORTFOLIO | SERVICES | REVIEWS) ===== */}
          <div className="mt-6">
            <div className="bg-[#F1F3F7] p-1 rounded-2xl flex items-center justify-between">
              {/* Portfolio Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('portfolio')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm transition-all duration-200 flex flex-col items-center justify-center ${
                  activeTab === 'portfolio'
                    ? 'bg-white text-[#8A2BE2] font-semibold shadow-xs'
                    : 'text-gray-500 font-medium hover:text-gray-900'
                }`}
              >
                <span>Portfolio</span>
                {activeTab === 'portfolio' && (
                  <span className="w-10 h-0.5 bg-[#8A2BE2] rounded-full mt-1 -mb-0.5" />
                )}
              </button>

              {/* Services Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('services')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm transition-all duration-200 flex flex-col items-center justify-center ${
                  activeTab === 'services'
                    ? 'bg-white text-[#8A2BE2] font-semibold shadow-xs'
                    : 'text-gray-500 font-medium hover:text-gray-900'
                }`}
              >
                <span>Services</span>
                {activeTab === 'services' && (
                  <span className="w-10 h-0.5 bg-[#8A2BE2] rounded-full mt-1 -mb-0.5" />
                )}
              </button>

              {/* Reviews Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm transition-all duration-200 flex flex-col items-center justify-center ${
                  activeTab === 'reviews'
                    ? 'bg-white text-[#8A2BE2] font-semibold shadow-xs'
                    : 'text-gray-500 font-medium hover:text-gray-900'
                }`}
              >
                <span>Reviews</span>
                {activeTab === 'reviews' && (
                  <span className="w-10 h-0.5 bg-[#8A2BE2] rounded-full mt-1 -mb-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* ===== TAB CONTENT ===== */}
          <div className="mt-6">
            {/* 1. REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div className="py-4">
                {reviews.length === 0 ? (
                  <div>
                    {/* Empty State Vector Illustration matching Mockup */}
                    <div className="flex flex-col items-center justify-center text-center pt-6 pb-4">
                      {/* Purple circular icon with star inside speech bubble + radiating sparkle dashes */}
                      <div className="w-24 h-24 rounded-full bg-[#F3EEFF] flex items-center justify-center mb-6 shadow-xs">
                        <svg className="w-14 h-14" viewBox="0 0 48 48" fill="none">
                          {/* Sparkle dashes around the bubble */}
                          <line x1="8" y1="16" x2="4" y2="13" stroke="#8A2BE2" strokeWidth="2.2" strokeLinecap="round" />
                          <line x1="8" y1="30" x2="4" y2="33" stroke="#8A2BE2" strokeWidth="2.2" strokeLinecap="round" />
                          <line x1="40" y1="16" x2="44" y2="13" stroke="#8A2BE2" strokeWidth="2.2" strokeLinecap="round" />
                          <line x1="40" y1="30" x2="44" y2="33" stroke="#8A2BE2" strokeWidth="2.2" strokeLinecap="round" />
                          {/* Chat bubble outline */}
                          <path
                            d="M14 13C14 10.79 15.79 9 18 9H30C32.21 9 34 10.79 34 13V25C34 27.21 32.21 29 30 29H22L16 34V29H18... Z"
                            fill="none"
                          />
                          <rect
                            x="14"
                            y="11"
                            width="20"
                            height="18"
                            rx="4"
                            stroke="#8A2BE2"
                            strokeWidth="2.2"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M19 29L15 34V29"
                            stroke="#8A2BE2"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Star inside the bubble */}
                          <polygon
                            points="24,15 25.5,18.5 29,19 26.5,21.5 27.2,25 24,23.3 20.8,25 21.5,21.5 19,19 22.5,18.5"
                            stroke="#8A2BE2"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>
                      </div>

                      {/* Heading & Subtitle */}
                      <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                        No reviews yet
                      </h2>
                      <p className="text-sm text-gray-400 mt-1">
                        Reviews will appear here.
                      </p>
                    </div>

                    {/* Divider line */}
                    <div className="w-full max-w-sm mx-auto my-7 border-t border-gray-100" />

                    {/* Rating Summary Block */}
                    <div className="flex flex-col items-center justify-center text-center pb-6">
                      <p className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
                        {ratingAvg}
                      </p>
                      {renderStars(parseFloat(ratingAvg))}
                      <p className="text-xs text-gray-400 mt-2 font-normal">
                        {ratingCount} reviews
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Rating Summary */}
                    <div className="flex flex-col items-center justify-center text-center pb-6 border-b border-gray-100">
                      <p className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
                        {ratingAvg}
                      </p>
                      {renderStars(parseFloat(ratingAvg))}
                      <p className="text-xs text-gray-400 mt-2 font-normal">
                        {ratingCount} reviews
                      </p>
                    </div>

                    {/* Reviews List */}
                    <div className="divide-y divide-gray-100 mt-4">
                      {reviews.map((review) => (
                        <div key={review._id} className="py-4">
                          <div className="flex items-start gap-3">
                            <img
                              src={getImageUrl(review.reviewer.avatar) || '/images/avatar-1.png'}
                              alt={review.reviewer.name}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-100"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-gray-900 text-sm">{review.reviewer.name}</p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span className="text-sm font-medium text-gray-700">{review.rating}</span>
                                </div>
                              </div>
                              <p className="text-gray-600 text-sm mt-1 leading-relaxed">{review.comment}</p>
                              <p className="text-gray-400 text-xs mt-2">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. PORTFOLIO TAB */}
            {activeTab === 'portfolio' && (
              <div>
                {isOwner && (
                  <div className="mb-4 flex justify-end">
                    <Button 
                      onClick={() => setIsAddPortfolioOpen(true)}
                      className="bg-[#8A2BE2] hover:bg-[#7822c9] text-white rounded-xl h-10 text-xs sm:text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Portfolio Item
                    </Button>
                  </div>
                )}

                {portfolio.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                      <svg className="w-9 h-9 text-[#8A2BE2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No portfolio items yet</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xs">
                      {isOwner ? "Showcase your best work by adding portfolio items" : "This creator hasn't published any portfolio items yet."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {portfolio.map((item, index) => (
                      <Card key={index} className="overflow-hidden border border-gray-100 shadow-xs rounded-xl hover:shadow-md transition-shadow">
                        <div 
                          className="relative w-full aspect-square bg-gray-100 cursor-pointer group"
                          onClick={() => item.image && setSelectedImage(item.image)}
                        >
                          <img
                            src={getImageUrl(item.image) || '/images/placeholder.png'}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/placeholder.png';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{item.title}</h4>
                              {item.description && (
                                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            {isOwner && (
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-700 p-1 -mr-1"
                                onClick={() => handleDeletePortfolio(index)}
                                title="Delete item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. SERVICES TAB */}
            {activeTab === 'services' && (
              <div>
                {isOwner && (
                  <div className="mb-4 flex justify-end">
                    <Button 
                      onClick={() => setIsAddServiceOpen(true)}
                      className="bg-[#8A2BE2] hover:bg-[#7822c9] text-white rounded-xl h-10 text-xs sm:text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Service
                    </Button>
                  </div>
                )}

                {services.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                      <svg className="w-9 h-9 text-[#8A2BE2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                        <line x1="16" y1="8" x2="2" y2="22" />
                        <line x1="17.5" y1="15" x2="9" y2="15" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No services yet</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xs">
                      {isOwner ? "Add the services you offer to start accepting bookings" : "This creator hasn't published any services yet."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <Card key={service._id} className="border border-gray-100 shadow-xs rounded-xl">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <h4 className="text-sm sm:text-base font-bold text-gray-900">{service.title}</h4>
                                {isOwner && (
                                  <button
                                    type="button"
                                    className="text-red-500 hover:text-red-700 p-1 -mr-1"
                                    onClick={() => handleDeleteService(service._id)}
                                    title="Delete service"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <p className="text-gray-600 text-xs sm:text-sm mt-1 leading-relaxed">{service.description}</p>
                              {service.directLink && (
                                <a
                                  href={service.directLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-[#8A2BE2] text-xs sm:text-sm mt-2 hover:underline font-medium"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                  View Link
                                </a>
                              )}
                              {service.images && service.images.length > 0 && (
                                <div className="flex gap-2 mt-3 overflow-x-auto">
                                  {service.images.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={getImageUrl(img)}
                                      alt={`${service.title} ${idx + 1}`}
                                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                            {!isOwner && (
                              <Button 
                                className="bg-[#8A2BE2] hover:bg-[#7822c9] text-white whitespace-nowrap rounded-xl h-9 text-xs sm:text-sm font-medium sm:self-start"
                                onClick={() => window.location.href = `/bookings?creator=${creator.id}&service=${service._id}`}
                              >
                                Book Service
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== DIALOGS ===== */}

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
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
                rows={3}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={profileForm.category}
                onChange={(e) => setProfileForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Your category (e.g., Design, Writing, Music)"
              />
            </div>
            <div>
              <Label>Skills (comma separated)</Label>
              <Input
                value={profileForm.skills.join(', ')}
                onChange={(e) => {
                  const value = e.target.value;
                  const skills = value
                    .split(/[,\s]+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0 && s !== ',');
                  setProfileForm(prev => ({ ...prev, skills }));
                }}
                placeholder="e.g., Photoshop, Figma, Branding"
              />
              {profileForm.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {profileForm.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-purple-50 text-[#8A2BE2] text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleUpdateProfile} className="w-full bg-[#8A2BE2] hover:bg-[#7822c9] text-white rounded-xl h-11">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Portfolio Dialog */}
      <Dialog open={isAddPortfolioOpen} onOpenChange={setIsAddPortfolioOpen}>
        <DialogContent className="max-w-md rounded-2xl">
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
                placeholder="Describe this project..."
                rows={2}
              />
            </div>
            <div>
              <Label>Image URL or File Upload</Label>
              <Input
                value={portfolioForm.image}
                onChange={(e) => setPortfolioForm(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
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
                      toast.success('Image uploaded');
                    }
                  }
                }}
              />
            </div>
            <Button onClick={handleAddPortfolio} className="w-full bg-[#8A2BE2] hover:bg-[#7822c9] text-white rounded-xl h-11">
              Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Service Title</Label>
              <Input
                value={serviceForm.title}
                onChange={(e) => setServiceForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Logo Design & Brand Kit"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what is included in this service..."
                rows={3}
              />
            </div>
            <div>
              <Label>Direct Link (Optional)</Label>
              <Input
                value={serviceForm.directLink}
                onChange={(e) => setServiceForm(prev => ({ ...prev, directLink: e.target.value }))}
                placeholder="https://yourportfolio.com/service"
              />
            </div>
            <Button onClick={handleAddService} className="w-full bg-[#8A2BE2] hover:bg-[#7822c9] text-white rounded-xl h-11">
              Publish Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-6 h-6 text-[#8A2BE2]" />
              Get Verified
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <h3 className="font-semibold text-[#8A2BE2]">Verification Badge</h3>
              <p className="text-sm text-purple-900/80 mt-1">
                Stand out as a verified creator with the purple trust tick on your profile.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                <span className="text-gray-600">Price</span>
                <span className="font-semibold text-gray-900">1.00 USDC / month</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold text-gray-900">30 days</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-600">Auto-renew</span>
                <span className="font-semibold text-emerald-600">Enabled</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Payment is deducted directly from your USDC wallet balance.
            </p>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl h-11"
                onClick={() => setShowVerifyDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-[#8A2BE2] hover:bg-[#7822c9] text-white rounded-xl h-11 font-semibold"
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
                    <BadgeCheck className="w-4 h-4 mr-1.5" />
                    Pay 1.00 USDC
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Verification Dialog */}
      <Dialog open={showCancelVerifyDialog} onOpenChange={setShowCancelVerifyDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <BadgeCheck className="w-6 h-6 text-red-500" />
              Cancel Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <h3 className="font-semibold text-red-800">Remove Verified Badge?</h3>
              <p className="text-sm text-red-700/80 mt-1">
                Your verified tick will be removed. You can re-verify anytime.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl h-11"
                onClick={() => setShowCancelVerifyDialog(false)}
              >
                Keep Badge
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 font-semibold"
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
      <ImageDialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <ImageDialogContent className="max-w-none w-screen h-screen p-0 overflow-hidden bg-black/95 border-none rounded-none" showCloseButton={false}>
          <ImageDialogTitle className="sr-only">Portfolio Image</ImageDialogTitle>
          <ImageDialogDescription className="sr-only">Full size portfolio image viewer</ImageDialogDescription>
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center justify-center w-full h-full p-4">
            {selectedImage && (
              <img
                src={getImageUrl(selectedImage)}
                alt="Portfolio item"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </ImageDialogContent>
      </ImageDialog>
    </div>
  );
}