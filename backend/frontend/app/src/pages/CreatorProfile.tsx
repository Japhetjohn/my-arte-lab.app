import { useState, useEffect, useCallback } from 'react';
import {
  Dialog as ImageDialog,
  DialogContent as ImageDialogContent,
  DialogTitle as ImageDialogTitle,
  DialogDescription as ImageDialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { api, useAuth } from '@/contexts/AuthContext';
import { socialService } from '@/lib/api';
import { SocialFeedCard, type FeedPost } from '@/components/social/SocialFeedCard';
import {
  Star,
  MapPin,
  MessageSquare,
  Bookmark,
  Share2,
  Plus,
  BadgeCheck,
  ShieldCheck,
  Pencil,
  Calendar,
  Loader2,
  Sparkles,
  Compass,
  Users,
  Wallet,
  Briefcase,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Creator } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAvatarUrl, getImageUrl } from '@/lib/imageUrl';
import { getCreatorProfileUrl } from '@/lib/utils';
import { verificationService } from '@/lib/verificationApi';

interface CreatorProfileProps {
  creatorId?: string;
  isOwnProfile?: boolean;
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
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Social feed posts state for this creator only
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    bio: '',
    skills: [] as string[],
    category: '',
  });

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showCancelVerifyDialog, setShowCancelVerifyDialog] = useState(false);

  // Compute isVerified on-the-fly (client-side grace period check)
  const isVerifiedLive = (() => {
    if (!creator?.verificationSubscription?.expiresAt) return !!creator?.isVerified;
    const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;
    const graceEnd = new Date(creator.verificationSubscription.expiresAt).getTime() + GRACE_PERIOD_MS;
    return graceEnd > Date.now();
  })();

  // Fetch creator's posts
  const fetchCreatorPosts = useCallback(async (targetId: string) => {
    try {
      setIsLoadingPosts(true);
      const res = await socialService.getFeed({ creatorId: targetId, limit: 30 });
      setPosts(res.data?.data?.posts || []);
    } catch (err) {
      console.error('Error fetching creator posts:', err);
      setPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  // Fetch creator profile data
  const fetchCreatorData = useCallback(async (id: string) => {
    try {
      setIsLoading(true);

      // If isOwnProfile is passed as prop, use current user's data directly
      if (propIsOwnProfile && currentUser) {
        const response = await api.get('/auth/me');
        const userData = response.data.data.user;

        setCreator(userData);
        setPortfolio(userData.portfolio || []);
        setReviews([]);
        setIsOwner(true);

        setProfileForm({
          bio: userData.bio || '',
          skills: userData.skills || [],
          category: userData.category || '',
        });

        if (userData.role === 'creator') {
          try {
            const reviewsResponse = await api.get(`/reviews/creator/${userData.id}`);
            setReviews(reviewsResponse.data.data?.reviews || []);
          } catch {
            // Ignore error
          }
        }

        fetchCreatorPosts(userData.id);
      } else {
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
        const endpoint = isMongoId ? `/creators/${id}` : `/creators/slug/${id}`;
        const response = await api.get(endpoint);
        const { creator: creatorData, reviews: reviewsData } = response.data.data;

        setCreator(creatorData);
        setPortfolio(creatorData.portfolio || []);
        setReviews(reviewsData || []);

        if (currentUser && (currentUser.id === creatorData.id || (currentUser as any)._id === creatorData.id)) {
          setIsOwner(true);
        }

        setProfileForm({
          bio: creatorData.bio || '',
          skills: creatorData.skills || [],
          category: creatorData.category || '',
        });

        if (currentUser) {
          checkFavoriteStatus(creatorData.id);
        }

        fetchCreatorPosts(creatorData.id);
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
  }, [currentUser, propIsOwnProfile, fetchCreatorPosts]);

  // Check if creator is favorited
  const checkFavoriteStatus = async (id: string) => {
    try {
      const response = await api.get(`/favorites/${id}/status`);
      setIsFavorited(response.data.data.isFavorited);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    let id: string | undefined = creatorId;
    if (!id) {
      const path = window.location.pathname;
      const match = path.match(/\/creators?\/(.+)/);
      id = match ? match[1] : undefined;
    }

    if (id) {
      fetchCreatorData(id);
    } else {
      setNotFound(true);
      setIsLoading(false);
    }
  }, [creatorId, fetchCreatorData]);

  // Handle post updates (likes, comments, etc.)
  const handlePostUpdated = (updatedPost: FeedPost) => {
    setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  };

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
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Profile link copied to clipboard');
      } catch {
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

  // Upload image helper
  const handleImageUpload = async (file: File) => {
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
        onAction={() => (window.location.href = '/creators')}
      />
    );
  }

  if (isLoading || !creator) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#9747FF]" />
      </div>
    );
  }

  const locationString = creator.location
    ? `${creator.location.localArea || ''}, ${creator.location.state || ''}, ${creator.location.country || ''}`
        .replace(/^,\s*|,\s*$/g, '')
        .replace(/,\s*,/g, ',')
    : 'Africa';

  const ratingAverage: number =
    typeof creator.rating === 'object' && creator.rating !== null
      ? ((creator.rating as any).average || 0)
      : typeof creator.rating === 'number'
      ? creator.rating
      : 5.0;

  const ratingCount: number =
    typeof creator.rating === 'object' && creator.rating !== null
      ? ((creator.rating as any).count || 0)
      : (creator.reviewCount || 0);

  const categoryLabel = (
    Array.isArray(creator.category)
      ? creator.category.join(', ')
      : String(creator.category ?? '')
  ).replace(/_/g, ' ');

  return (
    <div className="w-full">
      {/* 3-Column Layout on Desktop, Fluid & Borderless on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Platform Quick Navigation and Complete Creator Summary & Actions
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* Creator Identity Card */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center border-2 border-[#9747FF]/20 mb-3 relative">
                <img
                  src={getAvatarUrl(creator.avatar)}
                  alt={creator.name}
                  className="w-full h-full object-cover"
                />
                {isOwner && (
                  <label
                    className="absolute bottom-0 right-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-white dark:border-gray-900 bg-[#9747FF] text-white hover:bg-[#8534f0] shadow-xs transition-colors"
                    aria-label="Change avatar"
                    title="Change avatar"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleImageUpload(file);
                          if (url) {
                            await api.put('/auth/update-profile', { avatar: url });
                            setCreator((prev) => (prev ? { ...prev, avatar: url } : null));
                            toast.success('Avatar updated successfully');
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight flex items-center gap-1.5 justify-center">
                <span>{creator.name}</span>
                {isVerifiedLive && (
                  <VerifiedBadge
                    size="md"
                    expiresAt={creator.verificationSubscription?.expiresAt}
                    showTooltip={false}
                  />
                )}
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-full">
                @{(creator as any).username || creator.email?.split('@')[0] || 'creator'}
              </p>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-[#9747FF]/15 text-[#9747FF] text-xs font-semibold mt-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]"></span>
                {categoryLabel ? `${categoryLabel}` : 'Creative Specialist'}
              </div>

              {/* Rating & Location Meta */}
              <div className="mt-3 flex items-center justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{ratingAverage.toFixed(1)}</span>
                  <span className="text-gray-400 dark:text-gray-500 font-normal">({ratingCount})</span>
                </div>
                <span className="h-3 w-px bg-gray-300 dark:bg-gray-700" aria-hidden="true" />
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="truncate max-w-[150px]">{locationString}</span>
                </div>
              </div>

              {/* Bio */}
              {creator.bio && (
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed text-center">
                  {creator.bio}
                </p>
              )}

              {/* Skills */}
              {(creator.skills || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1 justify-center">
                  {(creator.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-purple-50 dark:bg-[#9747FF]/15 text-[#9747FF] text-[11px] font-medium px-2.5 py-0.5"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Primary Actions on Sidebar */}
              <div className="mt-4 flex flex-col gap-2 w-full">
                {isOwner ? (
                  <>
                    <Button
                      onClick={() => setIsEditProfileOpen(true)}
                      className="w-full h-8 rounded-full border border-[#9747FF] text-[#9747FF] bg-white dark:bg-transparent hover:bg-[#9747FF]/10 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5 text-[#9747FF]" />
                      Edit Profile
                    </Button>
                    {!isVerifiedLive && (
                      <Button
                        onClick={() => setShowVerifyDialog(true)}
                        className="w-full h-8 rounded-full bg-[#9747FF] text-white hover:bg-[#8534f0] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        Get Verified
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => (window.location.href = `/bookings?creator=${creator.id}`)}
                      className="w-full h-8 rounded-full bg-[#9747FF] text-white hover:bg-[#8534f0] text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Book Creator</span>
                    </Button>
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        variant="outline"
                        asChild
                        className="flex-1 h-8 rounded-full border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-xs font-medium shadow-2xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                      >
                        <a href={`/messages?user=${creator.id}`}>
                          <MessageSquare className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                          <span>Message</span>
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleToggleFavorite}
                        title={isFavorited ? 'Remove bookmark' : 'Bookmark creator'}
                        className={`h-8 w-8 rounded-full border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-[#9747FF] hover:border-[#9747FF] dark:hover:border-[#9747FF] cursor-pointer shrink-0 ${
                          isFavorited ? 'text-amber-500 border-amber-300 dark:border-amber-500/50' : ''
                        }`}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${isFavorited ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleShare}
                        title="Share profile"
                        className="h-8 w-8 rounded-full border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-[#9747FF] hover:border-[#9747FF] dark:hover:border-[#9747FF] cursor-pointer shrink-0"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Platform Navigation Menu */}
          <div className="pb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-2">
              Explore
            </div>
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Creative Feed</span>
              </a>

              <a
                href="/explore"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Compass className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Explore</span>
              </a>

              <a
                href="/creators"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Browse Creators</span>
              </a>

              {currentUser && (
                <>
                  <a
                    href="/bookings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>My Bookings</span>
                  </a>

                  <a
                    href="/wallet"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
                  >
                    <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Wallet &amp; Earnings</span>
                  </a>
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Starts directly from the feed section (Creative Work) on desktop!
            On mobile, shows clean mobile header card since sidebar is hidden.
           ========================================================================= */}
        <main className="col-span-1 lg:col-span-6 w-full max-w-xl mx-auto flex flex-col pb-16">
          {/* Mobile-Only Creator Header Card (Hidden on Desktop) */}
          <section className="lg:hidden pt-2 pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 border-2 border-gray-200/80 dark:border-gray-800 shadow-2xs flex items-center justify-center mb-2.5 relative">
                <img
                  src={getAvatarUrl(creator.avatar)}
                  alt={creator.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <h1 className="text-xl font-bold text-gray-950 dark:text-gray-100 tracking-tight leading-tight">
                  {creator.name}
                </h1>
                {isVerifiedLive && (
                  <VerifiedBadge
                    size="md"
                    expiresAt={creator.verificationSubscription?.expiresAt}
                    showTooltip={false}
                  />
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium capitalize mt-0.5">
                {categoryLabel ? `${categoryLabel} Specialist` : 'Creative Specialist'}
              </p>

              {creator.bio && (
                <p className="mt-2.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed max-w-md">
                  {creator.bio}
                </p>
              )}

              {/* Mobile Actions */}
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap w-full">
                {isOwner ? (
                  <Button
                    onClick={() => setIsEditProfileOpen(true)}
                    className="h-8 px-5 rounded-full border border-[#9747FF] text-[#9747FF] bg-white dark:bg-transparent hover:bg-[#9747FF]/10 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5 text-[#9747FF]" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => (window.location.href = `/bookings?creator=${creator.id}`)}
                      className="h-8 px-5 rounded-full bg-[#9747FF] text-white hover:bg-[#8534f0] text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Book Creator</span>
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      className="h-8 px-4 rounded-full border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-xs font-medium shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <a href={`/messages?user=${creator.id}`}>
                        <MessageSquare className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                        <span>Message</span>
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleShare}
                      title="Share profile"
                      className="h-8 w-8 rounded-full border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-[#9747FF] hover:border-[#9747FF] dark:hover:border-[#9747FF] cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* CREATIVE WORK (POSTS STREAM) - On desktop starts directly from here! */}
          <section className="pt-2 pb-4">
            <div className="flex items-center justify-between pb-3 px-1 sm:px-0">
              <h2 className="text-base font-bold text-gray-950 dark:text-gray-100 tracking-tight">
                Creative Work
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>

            {isLoadingPosts ? (
              <div className="py-16 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#9747FF]" />
              </div>
            ) : posts.length === 0 ? (
              <div className="py-12 px-4 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                <p className="font-semibold text-gray-800 dark:text-gray-200">No creative work shared yet.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {isOwner
                    ? 'Publish your first artwork or creative service to showcase your talent!'
                    : 'This creator has not published any posts to the feed yet.'}
                </p>
                {isOwner && (
                  <Button
                    onClick={() => (window.location.href = '/home')}
                    className="mt-4 bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs rounded-full px-5 h-8 font-semibold shadow-2xs cursor-pointer"
                  >
                    Create a Post on Home Feed
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032] -mx-3 sm:mx-0">
                {posts.map((post) => (
                  <SocialFeedCard
                    key={post._id}
                    post={post}
                    onPostUpdated={handlePostUpdated}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Creator Services & Supporting Sidebar (Quiet, borderless, ash-gray dividers)
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* Rate card & Booking card */}
          <div className="pb-4 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="pb-2.5 mb-3">
              <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#9747FF]" />
                <span>Services &amp; Pricing</span>
              </h4>
            </div>

            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Starting Price</span>
                <span className="font-bold text-gray-950 dark:text-gray-100 text-sm">
                  ${creator.startingPrice || 50} USDC
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Category</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                  {categoryLabel || 'General'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Completed Orders</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {(creator as any).completedBookings || 0}
                </span>
              </div>

              <div className="pt-2">
                {!isOwner ? (
                  <Button
                    onClick={() => (window.location.href = `/bookings?creator=${creator.id}`)}
                    className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold rounded-xl text-xs py-2 shadow-xs cursor-pointer"
                  >
                    Book This Creator
                  </Button>
                ) : (
                  <div className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-1">
                    Your public rate card
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Portfolio highlights if any */}
          {portfolio.length > 0 && (
            <div className="pb-4 border-b border-[#DADDE1] dark:border-[#2f3032]">
              <div className="flex items-center justify-between pb-2 mb-2">
                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 tracking-tight">Portfolio</h4>
                <span className="text-xs text-gray-400 dark:text-gray-500">{portfolio.length} items</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {portfolio.slice(0, 6).map((item, idx) => (
                  <button
                    key={item._id || idx}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Client Reviews Overview */}
          {reviews.length > 0 && (
            <div className="pb-4">
              <div className="flex items-center justify-between pb-2 mb-2.5">
                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 tracking-tight">Recent Feedback</h4>
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{ratingAverage.toFixed(1)}</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {reviews.slice(0, 3).map((rev) => (
                  <div key={rev._id} className="text-xs border-b border-gray-100 dark:border-gray-800 pb-2">
                    <div className="flex items-center justify-between font-medium text-gray-800 dark:text-gray-200">
                      <span>{rev.reviewer?.name || 'Client'}</span>
                      <div className="flex items-center text-amber-400 text-[10px]">
                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* =========================================================================
          MODALS & DIALOGS (Preserving all existing workflows)
         ========================================================================= */}

      {/* 1. Edit Profile Modal */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Creator Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Bio</Label>
              <Textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell clients about your creative background..."
                className="mt-1 dark:bg-[#121212] dark:border-[#2f3032] dark:text-gray-100 dark:placeholder-gray-500 focus-visible:ring-[#9747FF]"
                rows={4}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Category</Label>
              <Input
                value={profileForm.category}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Digital Art, Graphic Design"
                className="mt-1 dark:bg-[#121212] dark:border-[#2f3032] dark:text-gray-100 dark:placeholder-gray-500 focus-visible:ring-[#9747FF]"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Skills (comma separated)</Label>
              <Input
                value={profileForm.skills.join(', ')}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))
                }
                placeholder="e.g., Photoshop, Blender, Figma"
                className="mt-1 dark:bg-[#121212] dark:border-[#2f3032] dark:text-gray-100 dark:placeholder-gray-500 focus-visible:ring-[#9747FF]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Button
                variant="outline"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-xs rounded-xl dark:border-[#2f3032] dark:text-gray-300 dark:hover:bg-gray-800/60"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProfile}
                className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-xl"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-[#9747FF]" />
              Get Verified Creator Badge
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs text-gray-600 dark:text-gray-300">
            <div className="space-y-2 pb-4 border-b border-[#DADDE1] dark:border-[#2f3032]">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Verified Creator Benefits</p>
              <ul className="space-y-1.5 text-gray-600 dark:text-gray-400 list-disc list-inside">
                <li>Distinct verification badge next to your name</li>
                <li>Increased visibility and ranking across the platform</li>
                <li>Priority placement in creative searches &amp; feed</li>
              </ul>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 dark:text-gray-400">Monthly Subscription</span>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">$1.00 USDC / month</span>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Button
                variant="outline"
                onClick={() => setShowVerifyDialog(false)}
                className="text-xs rounded-xl dark:border-[#2f3032] dark:text-gray-300 dark:hover:bg-gray-800/60"
              >
                Cancel
              </Button>
              <Button
                className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-xl"
                disabled={isVerifying}
                onClick={async () => {
                  try {
                    setIsVerifying(true);
                    const result = await verificationService.subscribe();
                    setCreator((prev) =>
                      prev
                        ? {
                            ...prev,
                            isVerified: true,
                            verificationSubscription: {
                              active: true,
                              subscribedAt: new Date().toISOString(),
                              expiresAt: result.expiresAt,
                              lastRenewalAt: new Date().toISOString(),
                              autoRenew: true,
                            },
                          }
                        : null
                    );
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
                  'Pay 1.00 USDC & Verify'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Cancel Verification Dialog */}
      <Dialog open={showCancelVerifyDialog} onOpenChange={setShowCancelVerifyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-red-500" />
              Cancel Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5 py-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Remove Verified Badge?</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                Your verified badge will be removed upon cancellation. You can re-subscribe anytime.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Button
                variant="outline"
                onClick={() => setShowCancelVerifyDialog(false)}
                className="text-xs rounded-xl dark:border-[#2f3032] dark:text-gray-300 dark:hover:bg-gray-800/60"
              >
                Keep Badge
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl"
                disabled={isVerifying}
                onClick={async () => {
                  try {
                    setIsVerifying(true);
                    await verificationService.cancel();
                    setCreator((prev) =>
                      prev ? { ...prev, isVerified: false, verificationSubscription: undefined } : null
                    );
                    toast.success('Verification cancelled');
                    setShowCancelVerifyDialog(false);
                  } catch (error: any) {
                    toast.error(error.response?.data?.error || 'Failed to cancel');
                  } finally {
                    setIsVerifying(false);
                  }
                }}
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Subscription'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Full Image Lightbox */}
      <ImageDialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <ImageDialogContent
          className="max-w-none w-screen h-screen p-0 overflow-hidden bg-black/95 border-none rounded-none"
          showCloseButton={false}
        >
          <ImageDialogTitle className="sr-only">Portfolio Image</ImageDialogTitle>
          <ImageDialogDescription className="sr-only">
            Full size portfolio image viewer
          </ImageDialogDescription>
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
            {selectedItem && (
              <>
                <img
                  src={getImageUrl(selectedItem.image)}
                  alt={selectedItem.title}
                  className="max-h-[85vh] max-w-[90vw] object-contain"
                />
                {selectedItem.title && (
                  <p className="text-white text-sm font-medium">{selectedItem.title}</p>
                )}
              </>
            )}
          </div>
        </ImageDialogContent>
      </ImageDialog>
    </div>
  );
}

export default CreatorProfile;
