import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  onFileSelect?: (file: File) => void;
  label?: string;
  description?: string;
  aspectRatio?: 'square' | 'cover' | 'video';
  maxSize?: number; // in MB
  allowedTypes?: string[];
  className?: string;
  placeholderImage?: string;
}

export function ImageUpload({
  value,
  onChange,
  onFileSelect,
  label = 'Upload Image',
  description = 'Drag and drop or click to upload',
  aspectRatio = 'square',
  maxSize = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className,
  placeholderImage = '/images/image-upload.png',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectRatioClass = {
    square: 'aspect-square',
    cover: 'aspect-[3/1]',
    video: 'aspect-video',
  };

  const validateFile = (file: File): boolean => {
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return false;
    }

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File too large. Max size: ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return;

    // Call onFileSelect if provided (for actual upload)
    if (onFileSelect) {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      try {
        await onFileSelect(file);
        setUploadProgress(100);
      } catch (error) {
        toast.error('Upload failed');
      } finally {
        clearInterval(interval);
        setIsUploading(false);
      }
    } else {
      // Just preview locally
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadProgress(0);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-dashed transition-all',
          aspectRatioClass[aspectRatio],
          isDragging
            ? 'border-[#8A2BE2] bg-[#8A2BE2]/5'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400',
          value && 'border-solid border-gray-200'
        )}
      >
        {value ? (
          <div className="relative w-full h-full">
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-1" />
                Change
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center p-4"
          >
            <img
              src={placeholderImage}
              alt="Upload"
              className="w-16 h-16 object-contain mb-3 opacity-50"
            />
            <div className="flex items-center gap-2 text-[#8A2BE2] font-medium">
              <Upload className="w-4 h-4" />
              <span>Click to upload</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">{description}</p>
            <p className="text-xs text-gray-400 mt-1">
              Max {maxSize}MB • {allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}
            </p>
          </button>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-8 h-8 text-[#8A2BE2] animate-spin mb-3" />
            <Progress value={uploadProgress} className="w-full max-w-[200px]" />
            <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

// Import Loader2 for the upload state
import { Loader2 } from 'lucide-react';
