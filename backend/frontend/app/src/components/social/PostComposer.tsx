import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Image as ImageIcon, Loader2, Link2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { ImageUploader, type ImageUploadItem } from './ImageUploader';
import { ImageUploadDrawer } from './ImageUploadDrawer';
import { uploadService, socialService } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { getAvatarUrl } from '@/lib/imageUrl';
import { cn } from '@/lib/utils';

interface PostComposerProps {
  onPostCreated?: (post: any) => void;
  className?: string;
  autoOpenImageUploader?: boolean;
}

export function PostComposer({ onPostCreated, className, autoOpenImageUploader }: PostComposerProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [description, setDescription] = useState('');
  const [directLink, setDirectLink] = useState('');
  const [showDirectLink, setShowDirectLink] = useState(false);
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [showInlineUploader, setShowInlineUploader] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If requested to auto-open image uploader (e.g. from Artwork shortcut button)
  useEffect(() => {
    if (autoOpenImageUploader) {
      if (isMobile) {
        setShowMobileDrawer(true);
      } else {
        setShowInlineUploader(true);
      }
    }
  }, [autoOpenImageUploader, isMobile]);

  // Auto-focus textarea when opening without image shortcut
  useEffect(() => {
    if (!autoOpenImageUploader && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoOpenImageUploader]);

  // Character limit settings inspired by Twitter / X
  const MAX_CHARS = 280;
  const charsCount = description.length;
  const charsRemaining = MAX_CHARS - charsCount;
  const isOverLimit = charsRemaining < 0;
  const isNearLimit = charsRemaining <= 20;

  // SVG Radial Circle calculations (radius = 9, circumference = 2 * PI * 9 ≈ 56.548)
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(1, Math.max(0, charsCount / MAX_CHARS));
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Auto-resize textarea to fit content seamlessly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(240, Math.max(72, textareaRef.current.scrollHeight))}px`;
    }
  }, [description]);

  // Open appropriate image upload UI (drawer on mobile, inline on desktop)
  const handleOpenImageUploader = () => {
    if (isMobile) {
      setShowMobileDrawer(true);
    } else {
      setShowInlineUploader((prev) => !prev);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please log in to publish a post');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a caption or description for your artwork');
      return;
    }

    if (isOverLimit) {
      toast.error(`Your post exceeds the limit by ${Math.abs(charsRemaining)} characters`);
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload any local File instances first via uploadService
      const uploadedImageUrls: string[] = [];
      for (const item of images) {
        if (item.file) {
          const res = await uploadService.uploadImage(item.file);
          if (res.data?.data?.url) {
            uploadedImageUrls.push(res.data.data.url);
          }
        } else if (item.url) {
          uploadedImageUrls.push(item.url);
        }
      }

      // Submit new post / service
      const payload = {
        description: description.trim(),
        title: description.trim().slice(0, 60),
        images: uploadedImageUrls,
        directLink: directLink.trim() ? directLink.trim() : undefined,
      };

      const res = await socialService.createPost(payload);
      const createdService = res.data?.data?.service;

      toast.success('Your creative work has been published!');
      setDescription('');
      setDirectLink('');
      setShowDirectLink(false);
      setImages([]);
      setShowInlineUploader(false);

      if (onPostCreated && createdService) {
        // Shape into feed post object
        const newFeedPost = {
          _id: createdService._id,
          serviceId: createdService._id,
          title: createdService.title,
          description: createdService.description,
          images: createdService.images || uploadedImageUrls,
          directLink: createdService.directLink,
          createdAt: createdService.createdAt || new Date().toISOString(),
          likesCount: 0,
          isLiked: false,
          commentsCount: 0,
          recentComments: [],
          creator: {
            _id: user.id,
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You',
            username: user.email.split('@')[0],
            avatar: user.avatar,
            bio: '',
            categories: user.category ? (Array.isArray(user.category) ? user.category : [user.category]) : [],
            isVerified: !!user.isVerified,
            rating: { average: 5.0, count: 0 },
          },
        };
        onPostCreated(newFeedPost);
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      const msg = err.response?.data?.message || 'Failed to publish post. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const userInitial = user?.firstName?.[0] || user?.name?.[0] || 'C';

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm',
        className
      )}
    >
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 sm:gap-4 items-start">
          {/* User Avatar */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center shrink-0 border border-purple-200/60 shadow-xs">
            {user?.avatar ? (
              <img
                src={getAvatarUrl(user.avatar)}
                alt={user.name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#9747FF] font-bold text-sm sm:text-base">
                {userInitial}
              </span>
            )}
          </div>

          {/* Text Area Content */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share your latest creative work..."
              rows={2}
              className="w-full resize-none border-none bg-transparent text-gray-900 placeholder-gray-400 text-sm sm:text-base leading-relaxed focus:outline-none focus:ring-0 p-0"
            />

            {/* Optional booking or portfolio direct link field */}
            {showDirectLink && (
              <div className="mt-2.5 flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-200/70 animate-in fade-in">
                <Link2 className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
                <input
                  type="url"
                  value={directLink}
                  onChange={(e) => setDirectLink(e.target.value)}
                  placeholder="https://yourportfolio.com or booking link"
                  className="flex-1 bg-transparent border-none text-xs sm:text-sm text-gray-800 focus:outline-none placeholder-gray-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Desktop Inline Image Uploader - Matches Reference Image 1 */}
        {!isMobile && showInlineUploader && (
          <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in duration-200">
            <ImageUploader
              images={images}
              onImagesChange={setImages}
              maxImages={5}
              maxSizeMB={20}
            />
          </div>
        )}

        {/* Attached thumbnail preview chips if inline uploader is collapsed on desktop */}
        {!isMobile && !showInlineUploader && images.length > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            {images.map((item) => (
              <div
                key={item.id}
                className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0 group"
              >
                <img
                  src={item.url}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowInlineUploader(true)}
              className="text-xs text-[#9747FF] hover:underline font-medium px-2 py-1"
            >
              Edit images ({images.length})
            </button>
          </div>
        )}

        {/* Toolbar & Action Bar */}
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-gray-100">
          {/* Left Media Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleOpenImageUploader}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer',
                images.length > 0
                  ? 'bg-purple-100 text-[#9747FF]'
                  : 'text-gray-600 hover:text-[#9747FF] hover:bg-purple-50/70'
              )}
              title="Attach Images"
            >
              <ImageIcon className="w-4 h-4 text-[#9747FF]" />
              <span>{images.length > 0 ? `${images.length}/5` : 'Media'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDirectLink((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer',
                showDirectLink || directLink
                  ? 'bg-purple-100 text-[#9747FF]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
              title="Add Direct Link"
            >
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Link</span>
            </button>
          </div>

          {/* Right: Character Limit Progress Ring & Publish Button */}
          <div className="flex items-center gap-3">
            {/* Live SVG Progress Ring Inspired by Twitter / X */}
            {charsCount > 0 && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <svg className="w-6 h-6 -rotate-90 transform" viewBox="0 0 24 24">
                    {/* Background Ring Track */}
                    <circle
                      cx="12"
                      cy="12"
                      r={radius}
                      className="stroke-gray-200"
                      strokeWidth="2.5"
                      fill="none"
                    />
                    {/* Dynamic Progress Fill */}
                    <circle
                      cx="12"
                      cy="12"
                      r={radius}
                      className={cn(
                        'transition-all duration-150',
                        isOverLimit
                          ? 'stroke-red-500'
                          : isNearLimit
                          ? 'stroke-amber-500'
                          : 'stroke-[#9747FF]'
                      )}
                      strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>

                {/* Character warning text when close to or beyond limit */}
                {(isNearLimit || isOverLimit) && (
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums',
                      isOverLimit ? 'text-red-600' : 'text-amber-600'
                    )}
                  >
                    {charsRemaining}
                  </span>
                )}
              </div>
            )}

            {/* Subtle Divider before Publish button */}
            {charsCount > 0 && (
              <div className="w-px h-5 bg-gray-200" aria-hidden="true" />
            )}

            {/* Publish / Post Button */}
            <Button
              type="submit"
              disabled={isSubmitting || isOverLimit || (!description.trim() && images.length === 0)}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold rounded-full px-5 py-2 text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  <span>Publish</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Mobile Drawer (Wallet bottom sheet presentation pattern) */}
      {isMobile && (
        <ImageUploadDrawer
          isOpen={showMobileDrawer}
          onClose={() => setShowMobileDrawer(false)}
          images={images}
          onImagesChange={setImages}
          maxImages={5}
          maxSizeMB={20}
        />
      )}
    </div>
  );
}
