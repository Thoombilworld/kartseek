'use client';
import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, GripVertical, Image as ImageIcon, Star, Trash2, ZoomIn } from 'lucide-react';
import { useDismissOnEscape } from '@/lib/hooks/use-dismiss-on-escape';

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  isMain: boolean;
}

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
}

export default function ImageUploader({ images, onChange, maxImages = 8 }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // The lightbox trapped keyboard users: backdrop click was the only exit.
  useDismissOnEscape(!!previewUrl, () => setPreviewUrl(null));

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = maxImages - images.length;
      const accepted = Array.from(files)
        .slice(0, remaining)
        .filter((f) => f.type.startsWith('image/'));

      const newItems: ImageItem[] = accepted.map((f) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: URL.createObjectURL(f),
        file: f,
        isMain: images.length === 0 && accepted.indexOf(f) === 0,
      }));

      onChange([...images, ...newItems]);
    },
    [images, maxImages, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeImage = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    if (images.find((i) => i.id === id)?.isMain && updated.length > 0) {
      updated[0].isMain = true;
    }
    onChange(updated);
  };

  const setMainImage = (id: string) => {
    onChange(images.map((img) => ({ ...img, isMain: img.id === id })));
  };

  // Drag-reorder handlers
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOverItem = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDropOnItem = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const reordered = [...images];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    onChange(reordered);
    setDragIdx(null);
    setDragOverId(null);
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
        onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-emerald-500 transition-colors" />
        <p className="text-sm font-bold text-slate-700">Drag & drop images here</p>
        <p className="text-xs text-slate-400 mt-1">
          or click to browse • JPG, PNG, WebP • Max {maxImages} images
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          {images.length}/{maxImages} images uploaded
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          title="Upload product images"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOverItem(e, img.id)}
              onDrop={() => handleDropOnItem(idx)}
              onDragEnd={() => { setDragIdx(null); setDragOverId(null); }}
              className={`relative rounded-xl overflow-hidden border-2 transition-all group aspect-square ${
                img.isMain ? 'border-emerald-500 ring-2 ring-emerald-200' :
                dragOverId === img.id ? 'border-blue-400' : 'border-slate-200'
              }`}
            >
              {/* Image */}
              <img
                src={img.url}
                alt={`Product ${idx + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); setPreviewUrl(img.url); }}
                  className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                  title="Preview"
                >
                  <ZoomIn className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                  className="w-8 h-8 bg-red-500/90 rounded-lg flex items-center justify-center hover:bg-red-500 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Drag Handle */}
              <div className="absolute top-1.5 left-1.5 w-6 h-6 bg-white/80 rounded-md flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3.5 h-3.5 text-slate-500" />
              </div>

              {/* Main badge */}
              {img.isMain && (
                <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" /> MAIN
                </span>
              )}

              {/* Set as main */}
              {!img.isMain && (
                <button
                  onClick={(e) => { e.stopPropagation(); setMainImage(img.id); }}
                  className="absolute bottom-1.5 right-1.5 bg-white/80 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white flex items-center gap-0.5"
                >
                  <Star className="w-2.5 h-2.5" /> Set Main
                </button>
              )}

              {/* Index */}
              <span className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[9px] font-bold w-5 h-5 rounded-md flex items-center justify-center">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
            <button
              onClick={() => setPreviewUrl(null)}
              title="Close preview"
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
