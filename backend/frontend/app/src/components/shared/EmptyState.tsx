import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { WifiOff, Search, FileX, Package, MessageSquare, Bell, Wallet, User, FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  image?: string;
  icon?: 'offline' | 'search' | 'file' | 'package' | 'message' | 'notification' | 'wallet' | 'user' | 'folder';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const iconMap = {
  offline: WifiOff,
  search: Search,
  file: FileX,
  package: Package,
  message: MessageSquare,
  notification: Bell,
  wallet: Wallet,
  user: User,
  folder: FolderOpen,
};

const OFFLINE_IMAGE_KEY = 'myartelab_offline_image';

export function EmptyState({ image, icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const [imgSrc, setImgSrc] = useState<string>(image || '');
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const IconComponent = icon ? iconMap[icon] : null;

  useEffect(() => {
    // If this is the offline image, try to use cached version
    if (image === '/images/offline.png') {
      const cachedImage = localStorage.getItem(OFFLINE_IMAGE_KEY);
      if (cachedImage) {
        setImgSrc(cachedImage);
      }
      
      // Also try to cache it for next time
      fetchAndCacheImage();
    }
    setIsLoading(false);
  }, [image]);

  const fetchAndCacheImage = async () => {
    try {
      // Check if already cached
      if (localStorage.getItem(OFFLINE_IMAGE_KEY)) return;

      const response = await fetch('/images/offline.png');
      if (!response.ok) return;
      
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        if (base64data) {
          try {
            localStorage.setItem(OFFLINE_IMAGE_KEY, base64data);
            setImgSrc(base64data);
          } catch (e) {
            // localStorage full, ignore
          }
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      // Ignore fetch errors
    }
  };

  // Show fallback when image fails or while loading offline image
  const showFallback = imgError || !image || (image === '/images/offline.png' && imgError);
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {IconComponent ? (
        <div className="w-32 h-32 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
          <IconComponent className="w-16 h-16 text-gray-400" />
        </div>
      ) : showFallback ? (
        <div className="w-32 h-32 mb-6 rounded-full bg-gray-100 flex items-center justify-center animate-pulse">
          <WifiOff className="w-16 h-16 text-gray-400" />
        </div>
      ) : (
        <img 
          src={imgSrc} 
          alt={title} 
          className="w-48 h-48 mb-6 object-contain"
          onError={() => {
            setImgError(true);
            // Try fallback to cached version
            const cached = localStorage.getItem(OFFLINE_IMAGE_KEY);
            if (cached && imgSrc !== cached) {
              setImgSrc(cached);
              setImgError(false);
            }
          }}
          style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}
        />
      )}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Preload offline image on app startup
export function preloadOfflineImage(): void {
  if (typeof window === 'undefined') return;
  
  // Don't block - run in background
  setTimeout(() => {
    // Check if already cached
    if (localStorage.getItem(OFFLINE_IMAGE_KEY)) {
      console.log('[OfflineImage] Already cached');
      return;
    }

    fetch('/images/offline.png')
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch');
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (base64data) {
            try {
              localStorage.setItem(OFFLINE_IMAGE_KEY, base64data);
              console.log('[OfflineImage] Cached successfully');
            } catch (e) {
              console.log('[OfflineImage] Storage failed (might be full)');
            }
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        // Silently fail - will try again next time
      });
  }, 2000); // Wait 2 seconds after app load
}
