import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ImageUploader, type ImageUploadItem } from './ImageUploader';
import { Button } from '@/components/ui/button';

interface ImageUploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageUploadItem[];
  onImagesChange: (images: ImageUploadItem[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
}

export function ImageUploadDrawer({
  isOpen,
  onClose,
  images,
  onImagesChange,
  maxImages = 5,
  maxSizeMB = 20,
}: ImageUploadDrawerProps) {
  const isMobile = useIsMobile();

  const content = (
    <div className="flex flex-col gap-4">
      <ImageUploader
        images={images}
        onImagesChange={onImagesChange}
        maxImages={maxImages}
        maxSizeMB={maxSizeMB}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold rounded-xl px-6 py-2.5 transition-colors shadow-sm"
        >
          Done ({images.length} selected)
        </Button>
      </div>
    </div>
  );

  // Mobile Bottom Sheet (Drawer) using the exact wallet drawer presentation pattern
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="bg-white rounded-t-3xl max-h-[90dvh] flex flex-col p-5 pb-8 border-none shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Upload Images</DrawerTitle>
          <DrawerDescription className="sr-only">
            Select or drag and drop artwork images to attach to your post
          </DrawerDescription>
          <div className="flex-1 overflow-y-auto pt-2">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Modal (Dialog)
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-6 bg-white rounded-2xl border border-gray-100 shadow-2xl focus:outline-none z-[150]">
        <DialogTitle className="sr-only">Upload Images</DialogTitle>
        <DialogDescription className="sr-only">
          Select or drag and drop artwork images to attach to your post
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
