import { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: 'website' | 'profile' | 'article';
  ogImage?: string;
  noindex?: boolean;
}

const DEFAULT_TITLE = 'MyArteLab - African Visual Creatives Marketplace';
const DEFAULT_DESCRIPTION =
  'Discover and book top African visual creatives: photographers, videographers, graphic designers, UI/UX designers, and animators. Built for African creators, trusted by clients globally.';
const DEFAULT_IMAGE = 'https://app.myartelab.com/images/myartelab-logo.png';
const BASE_URL = 'https://app.myartelab.com';

function setMetaTag(selector: string, attribute: string, value: string) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    const [attrName, attrVal] = selector.replace(/[\[\]']/g, '').split('=');
    element.setAttribute(attrName, attrVal);
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

function setCanonicalTag(url: string) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogType = 'website',
  ogImage,
  noindex = false,
}: SEOProps = {}) {
  useEffect(() => {
    // 1. Update Title
    const finalTitle = title ? `${title} | MyArteLab` : DEFAULT_TITLE;
    document.title = finalTitle;

    // 2. Update Meta Description
    const finalDescription = description || DEFAULT_DESCRIPTION;
    setMetaTag('meta[name="description"]', 'content', finalDescription);

    // 3. Update Robots indexing directive
    if (noindex) {
      setMetaTag('meta[name="robots"]', 'content', 'noindex, nofollow');
    } else {
      setMetaTag('meta[name="robots"]', 'content', 'index, follow');
    }

    // 4. Update Keywords if provided
    if (keywords) {
      setMetaTag('meta[name="keywords"]', 'content', keywords);
    }

    // 5. Canonical URL
    const finalCanonical = canonical ? (canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical}`) : `${BASE_URL}${window.location.pathname}`;
    setCanonicalTag(finalCanonical);

    // 6. Open Graph Tags
    setMetaTag('meta[property="og:title"]', 'content', finalTitle);
    setMetaTag('meta[property="og:description"]', 'content', finalDescription);
    setMetaTag('meta[property="og:type"]', 'content', ogType);
    setMetaTag('meta[property="og:url"]', 'content', finalCanonical);
    setMetaTag('meta[property="og:image"]', 'content', ogImage || DEFAULT_IMAGE);

    // 7. Twitter Card Tags
    setMetaTag('meta[name="twitter:title"]', 'content', finalTitle);
    setMetaTag('meta[name="twitter:description"]', 'content', finalDescription);
    setMetaTag('meta[name="twitter:image"]', 'content', ogImage || DEFAULT_IMAGE);
  }, [title, description, keywords, canonical, ogType, ogImage, noindex]);
}
