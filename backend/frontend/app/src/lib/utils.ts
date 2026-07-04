import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCreatorProfileUrl(creator: { id?: string; _id?: string; seoSlug?: string }): string {
  const id = creator.seoSlug || creator.id || creator._id;
  return `/creator/${id}`;
}
