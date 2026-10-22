import { useRef, useState, type DragEvent, type MouseEvent } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageUploadItem {
  id: string;
  file?: File;
  url: string;
  isUploading?: boolean;
}

interface ImageUploaderProps {
  images: ImageUploadItem[];
  onImagesChange: (images: ImageUploadItem[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  className?: string;
  title?: string;
}

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
  maxSizeMB = 20,
  className,
  title = 'Images',
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelection = (files: FileList | File[]) => {
    setErrorMessage(null);
    const fileArray = Array.from(files);
    
    if (images.length + fileArray.length > maxImages) {
      setErrorMessage(`You can upload a maximum of ${maxImages} images (${images.length} already selected).`);
      return;
    }

    const validNewItems: ImageUploadItem[] = [];

    for (const file of fileArray) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setErrorMessage(`"${file.name}" is not supported. Use JPG, JPEG, PNG, or WEBP.`);
        continue;
      }

      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setErrorMessage(`"${file.name}" exceeds the maximum allowed size of ${maxSizeMB} MB.`);
        continue;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      validNewItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        url: previewUrl,
      });
    }

    if (validNewItems.length > 0) {
      onImagesChange([...images, ...validNewItems]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files);
    }
  };

  const handleRemove = (idToRemove: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = images.filter((img) => img.id !== idToRemove);
    onImagesChange(updated);
    if (errorMessage) setErrorMessage(null);
  };

  const remainingSlots = Math.max(0, maxImages - images.length);

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs transition-all',
        className
      )}
    >
      {/* Header with subtle divider - Matches Reference Image 1 */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-gray-100">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          {title}
        </h3>
        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
          {images.length}/{maxImages}
        </span>
      </div>

      {/* Error alert if validation failed */}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs sm:text-sm border border-red-100 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-400 hover:text-red-700 p-0.5"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Large Dashed Drop Area - Matches Reference Image 1 */}
      {images.length < maxImages && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            'group relative rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center',
            isDragging
              ? 'border-[#9747FF] bg-purple-50/50 scale-[0.99]'
              : 'border-gray-200 hover:border-[#9747FF]/60 bg-slate-50/60 hover:bg-purple-50/20'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelection(e.target.files);
                e.target.value = ''; // Reset for re-selection
              }
            }}
          />

          {/* Centered Upload Button pill */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white border border-gray-200/90 text-gray-800 text-sm font-semibold shadow-xs group-hover:border-[#9747FF]/40 group-hover:text-[#9747FF] transition-all mb-3">
            <Upload className="w-4 h-4 text-gray-600 group-hover:text-[#9747FF] transition-colors" />
            <span>Upload</span>
          </div>

          {/* Guidance text matching Reference Image 1 exactly */}
          <p className="text-sm font-medium text-gray-700 mb-1">
            Choose images or drag &amp; drop it here.
          </p>
          <p className="text-xs text-gray-600">
            JPG, JPEG, PNG and WEBP. Max {maxSizeMB} MB.
          </p>
        </div>
      )}

      {/* Preview Grid with populated and remaining capacity slots - Matches Reference Image 1 */}
      {(images.length > 0 || remainingSlots > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
          {images.map((item, index) => (
            <div
              key={item.id}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-200/80 bg-gray-100 group shadow-xs"
            >
              <img
                src={item.url}
                alt={`Upload preview ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Corner Remove Button - Matches Reference Image 1 */}
              <button
                type="button"
                onClick={(e) => handleRemove(item.id, e)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/95 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 focus:outline-none"
                aria-label={`Remove image ${index + 1}`}
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ))}

          {/* Remaining Capacity Placeholder Slots */}
          {Array.from({ length: remainingSlots }).map((_, idx) => (
            <div
              key={`slot-${idx}`}
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center text-gray-300 hover:border-gray-300 hover:text-gray-400 cursor-pointer transition-colors"
              title="Add another image"
            >
              <ImageIcon className="w-5 h-5 stroke-[1.5]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
