import { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface MaterialImageUploadProps {
  materialId: number;
  currentImageUrl?: string | null;
  materialName: string;
  onUploadComplete?: (imageUrl: string) => void;
}

export function MaterialImageUpload({
  materialId,
  currentImageUrl,
  materialName,
  onUploadComplete,
}: MaterialImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ACCEPTED.includes(file.type)) {
        toast.error('Use JPEG, PNG, or WebP only.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('materialId', String(materialId));

        const res = await fetch('/api/supplier/upload-image', {
          method: 'POST',
          credentials: 'include',
          body: form,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.error ?? `Upload failed (${res.status})`);
        }

        const data = await res.json();
        toast.success('Image uploaded successfully');
        onUploadComplete?.((data as any).imageUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        toast.error(message);
        setPreview(currentImageUrl ?? null);
      } finally {
        setUploading(false);
      }
    },
    [materialId, currentImageUrl, onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-2">
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden aspect-video
          ${dragOver ? 'border-green-500 bg-green-500/5' : 'border-white/10 hover:border-white/20'}`}
      >
        {preview ? (
          <img src={preview} alt={materialName} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
            <ImageIcon className="w-8 h-8" />
            <p className="text-sm font-medium">Drop image here or click to upload</p>
            <p className="text-xs">JPEG, PNG, WebP · max 5MB</p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-green-400" />
              <span className="text-white text-sm">Uploading...</span>
            </div>
          </div>
        )}

        {dragOver && !uploading && (
          <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-7 h-7 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Drop to upload</span>
            </div>
          </div>
        )}

        {preview && !uploading && (
          <div className="absolute bottom-2 right-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-black/60 border-white/20 text-white text-xs h-7 backdrop-blur"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              <Upload className="w-3 h-3 mr-1" /> Change
            </Button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      <p className="text-gray-600 text-xs">
        High-quality product photos get 3× more architect engagement. Real photos only — no stock images.
      </p>
    </div>
  );
}
