import { useState, useEffect } from 'react';

const OFFLINE_IMAGE_KEY = 'myartelab_offline_image';
const OFFLINE_IMAGE_URL = '/images/offline.png';

export function useOfflineImage() {
  const [offlineImageUrl, setOfflineImageUrl] = useState<string>(OFFLINE_IMAGE_URL);
  const [isImageReady, setIsImageReady] = useState(false);

  useEffect(() => {
    // Try to get cached image first
    const loadOfflineImage = async () => {
      try {
        // 1. Check localStorage for cached base64 image
        const cachedImage = localStorage.getItem(OFFLINE_IMAGE_KEY);
        if (cachedImage) {
          setOfflineImageUrl(cachedImage);
          setIsImageReady(true);
          // Using cached image from localStorage
        }

        // 2. Fetch and cache the image (do this in background)
        const response = await fetch(OFFLINE_IMAGE_URL);
        if (!response.ok) throw new Error('Failed to fetch image');
        
        const blob = await response.blob();
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (base64data) {
            // Store in localStorage
            try {
              localStorage.setItem(OFFLINE_IMAGE_KEY, base64data);
              setOfflineImageUrl(base64data);
              setIsImageReady(true);
              // Image cached successfully
            } catch (e) {
              // localStorage might be full, that's ok we have the URL fallback
              // Could not cache to localStorage, using URL
              setIsImageReady(true);
            }
          }
        };
        reader.readAsDataURL(blob);
        
      } catch (error) {
        // Failed to preload image
        // If we have cached image, use it
        const cachedImage = localStorage.getItem(OFFLINE_IMAGE_KEY);
        if (cachedImage) {
          setOfflineImageUrl(cachedImage);
        }
        setIsImageReady(true);
      }
    };

    loadOfflineImage();
  }, []);

  return { offlineImageUrl, isImageReady };
}

// Preload function that can be called on app init
export function preloadOfflineImage(): void {
  // This runs immediately when imported
  if (typeof window !== 'undefined') {
    const img = new Image();
    img.src = OFFLINE_IMAGE_URL;
    
    // Also try to cache it
    fetch(OFFLINE_IMAGE_URL)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (base64data) {
            try {
              localStorage.setItem(OFFLINE_IMAGE_KEY, base64data);
              // Preloaded and cached
            } catch (e) {
              // Ignore storage errors
            }
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        // Ignore errors, we'll try again later
      });
  }
}
