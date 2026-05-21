/**
 * Image URL resolver - fixes broken localhost:5000 URLs in production
 * 
 * Problem: Images uploaded before the fix were stored with http://localhost:5000
 * in the database. This helper rewrites them to use the current production domain.
 */

const PROD_DOMAIN = 'app.myartelab.com';
const LOCALHOST_PATTERNS = [
  'http://localhost:5000',
  'https://localhost:5000',
  'http://127.0.0.1:5000',
  'https://127.0.0.1:5000',
];

/**
 * Fix an image URL that may contain a broken localhost reference.
 * Preserves absolute URLs from external sources (Cloudinary, etc.).
 * Converts relative paths to absolute using current origin.
 */
export function getImageUrl(url: string | undefined | null): string {
  if (!url) return '';

  // Check if it's a broken localhost URL
  for (const pattern of LOCALHOST_PATTERNS) {
    if (url.startsWith(pattern)) {
      // Replace localhost with production domain, keep the path
      const path = url.substring(pattern.length);
      return `https://${PROD_DOMAIN}${path}`;
    }
  }

  // Already an absolute URL (external or correct production URL)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative URL - prepend current origin
  if (url.startsWith('/')) {
    return `${window.location.origin}${url}`;
  }

  // Fallback - treat as relative path
  return `${window.location.origin}/${url}`;
}

/**
 * Get avatar URL with fallback to default avatar
 */
export function getAvatarUrl(url: string | undefined | null, fallback: string = '/images/avatar-1.png'): string {
  const resolved = getImageUrl(url);
  return resolved || fallback;
}

/**
 * Get cover image URL with fallback
 */
export function getCoverImageUrl(url: string | undefined | null, fallback: string = '/images/hero-bg.jpg'): string {
  const resolved = getImageUrl(url);
  return resolved || fallback;
}
