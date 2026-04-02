import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/contexts/AuthContext';
import { Star, MapPin, MessageSquare, Bookmark, Share2, ArrowLeft, Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
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

interface CreatorProfileProps {
  creatorId?: string;
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

export function CreatorProfile({ creatorId }: CreatorProfileProps) {
  const { user: currentUser } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
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

  // Fetch creator data
  const fetchCreatorData = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/creators/${id}`);
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
  }, [currentUser]);

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

    const shareUrl = `${window.location.origin}/creator/${creator.id}`;
    
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
            <div className="relative mx-auto sm:mx-0">
              <img
                src={creator.avatar || '/images/avatar-1.png'}
                alt={creator.name}
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              {isOwner && (
                <label className="absolute bottom-0 right-0 bg-[#8A2BE2] text-white p-2 rounded-full cursor-pointer hover:bg-[#7B1FD1]">
                  <Plus className="w-4 h-4" />
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
                      <span className="font-medium">
                        {typeof creator.rating === 'object' && creator.rating !== null
                          ? ((creator.rating as any).average || 0).toFixed(1)
                          : typeof creator.rating === 'number'
                            ? creator.rating.toFixed(1)
                            : '0.0'}
                      </span>
                      <span>({typeof creator.rating === 'object' && creator.rating !== null
                        ? ((creator.rating as any).count || 0)
                        : (creator.reviewCount || 0)})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {locationString}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center sm:justify-end items-center gap-2">
                  {isOwner && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditProfileOpen(true)}>
                      Edit Profile
                    </Button>
                  )}
                  <StatusBadge status={creator.availability || 'available'} />
                </div>
              </div>

              <p className="mt-4 text-gray-600 text-sm sm:text-base">{creator.bio || 'No bio available'}</p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                {(creator.skills || []).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 sm:px-3 py-1 bg-[#8A2BE2]/10 text-[#8A2BE2] text-xs sm:text-sm rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 mt-6">
                {!isOwner && (
                  <Button 
                    className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                    onClick={() => window.location.href = `/bookings?creator=${creator.id}`}
                  >
                    Book Now
                  </Button>
                )}
                {!isOwner && (
                  <Button variant="outline" asChild>
                    <a href={`/messages?user=${creator.id}`}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </a>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleToggleFavorite}
                  className={isFavorited ? 'text-amber-500' : ''}
                >
                  <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="outline" size="icon" className="hidden sm:inline-flex" onClick={handleShare}>
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
          {isOwner && (
            <div className="mb-4">
              <Dialog open={isAddPortfolioOpen} onOpenChange={setIsAddPortfolioOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Portfolio Item
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
            </div>
          )}

          {portfolio.length === 0 ? (
            <EmptyState
              image="/images/empty-projects.png"
              title="No Portfolio Items"
              description={isOwner ? "Add your best work to showcase your skills" : "This creator hasn't added any portfolio items yet"}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.map((item, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <img
                    src={item.image || '/images/placeholder.png'}
                    alt={item.title}
                    className="w-full h-40 sm:h-48 object-cover"
                  />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{item.title}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">{item.description}</p>
                      </div>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => handleDeletePortfolio(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          {isOwner && (
            <div className="mb-4">
              <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
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
            </div>
          )}

          {services.length === 0 ? (
            <EmptyState
              image="/images/empty-projects.png"
              title="No Services"
              description={isOwner ? "Add services to start receiving bookings" : "This creator hasn't added any services yet"}
            />
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <Card key={service._id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h3 className="text-lg font-semibold">{service.title}</h3>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => handleDeleteService(service._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-gray-600 mt-2">{service.description}</p>
                        {service.directLink && (
                          <a
                            href={service.directLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[#8A2BE2] mt-2 hover:underline"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Details
                          </a>
                        )}
                        {service.images && service.images.length > 0 && (
                          <div className="flex gap-2 mt-4 overflow-x-auto">
                            {service.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`${service.title} ${idx + 1}`}
                                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {!isOwner && (
                        <Button 
                          className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white whitespace-nowrap"
                          onClick={() => window.location.href = `/bookings?creator=${creator.id}&service=${service._id}`}
                        >
                          Book Now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-6 sm:py-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Star className="w-6 h-6 sm:w-8 sm:h-8 fill-amber-400 text-amber-400" />
                  <span className="text-3xl sm:text-4xl font-bold">
                    {typeof creator.rating === 'object' && creator.rating !== null
                      ? ((creator.rating as any).average || 0).toFixed(1)
                      : typeof creator.rating === 'number'
                        ? creator.rating.toFixed(1)
                        : '0.0'}
                  </span>
                </div>
                <p className="text-gray-500 text-sm sm:text-base">
                  Based on {typeof creator.rating === 'object' && creator.rating !== null
                    ? ((creator.rating as any).count || 0)
                    : (creator.reviewCount || 0)} reviews
                </p>
              </div>
              
              {reviews.length > 0 && (
                <div className="mt-8 space-y-4">
                  {reviews.map((review) => (
                    <div key={review._id} className="border-t pt-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={review.reviewer.avatar || '/images/avatar-1.png'}
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
            </CardContent>
          </Card>
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
              <Label>Skills (comma separated)</Label>
              <Input
                value={profileForm.skills.join(', ')}
                onChange={(e) => setProfileForm(prev => ({ 
                  ...prev, 
                  skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
                placeholder="e.g., Photoshop, Writing, Video Editing"
              />
            </div>
            <Button onClick={handleUpdateProfile} className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1]">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
