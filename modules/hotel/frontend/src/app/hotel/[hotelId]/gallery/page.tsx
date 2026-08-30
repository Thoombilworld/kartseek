'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Download, Share2, Grid3x3, Maximize2,
} from 'lucide-react';

const CATEGORIES = ['All', 'Rooms', 'Bathrooms', 'Restaurant', 'Pool', 'Lobby', 'Exterior', 'Facilities'];

const IMAGES = [
  { id: 1, src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=90', cat: 'Exterior', alt: 'Hotel exterior view with palm trees' },
  { id: 2, src: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=90', cat: 'Rooms', alt: 'Deluxe king room with city view' },
  { id: 3, src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=90', cat: 'Rooms', alt: 'Premium twin room with modern decor' },
  { id: 4, src: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=90', cat: 'Rooms', alt: 'Executive suite living area' },
  { id: 5, src: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=90', cat: 'Pool', alt: 'Infinity pool overlooking the ocean' },
  { id: 6, src: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=90', cat: 'Lobby', alt: 'Grand lobby with chandelier' },
  { id: 7, src: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=90', cat: 'Restaurant', alt: 'Fine dining restaurant interior' },
  { id: 8, src: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=90', cat: 'Bathrooms', alt: 'Luxury marble bathroom with rain shower' },
  { id: 9, src: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=90', cat: 'Pool', alt: 'Rooftop pool at sunset' },
  { id: 10, src: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200&q=90', cat: 'Facilities', alt: 'Modern fitness center' },
  { id: 11, src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=90', cat: 'Rooms', alt: 'Family suite with separate living area' },
  { id: 12, src: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=90', cat: 'Facilities', alt: 'Spa treatment room' },
];

export default function GalleryPage() {
  const { hotelId } = useParams();
  const [activeCat, setActiveCat] = useState('All');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);

  const filtered = activeCat === 'All' ? IMAGES : IMAGES.filter(i => i.cat === activeCat);
  const lightboxImage = lightboxIdx !== null ? filtered[lightboxIdx] : null;

  const navigate = (dir: -1 | 1) => {
    if (lightboxIdx === null) return;
    const next = lightboxIdx + dir;
    if (next >= 0 && next < filtered.length) setLightboxIdx(next);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/hotel/${hotelId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Photo Gallery</h1>
              <p className="text-xs text-slate-500">{filtered.length} photos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors" title="Share gallery">
              <Share2 className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-[57px] z-30 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {CATEGORIES.map(cat => {
            const count = cat === 'All' ? IMAGES.length : IMAGES.filter(i => i.cat === cat).length;
            if (count === 0 && cat !== 'All') return null;
            return (
              <button
                key={cat}
                onClick={() => { setActiveCat(cat); setLightboxIdx(null); }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeCat === cat
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Image Grid */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => { setLightboxIdx(idx); setZoom(false); }}
              aria-label={`View photo: ${img.alt}`}
              className="relative group aspect-[4/3] rounded-2xl overflow-hidden bg-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                {img.cat}
              </span>
            </button>
          ))}
        </div>
      </main>

      {/* Lightbox */}
      {lightboxImage && lightboxIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-white/70 text-sm font-medium">
              {lightboxIdx + 1} / {filtered.length} — {lightboxImage.cat}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => !z)} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors" title={zoom ? 'Zoom out' : 'Zoom in'}>
                {zoom ? <ZoomOut className="w-4 h-4 text-white" /> : <ZoomIn className="w-4 h-4 text-white" />}
              </button>
              <button className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors" title="Download image">
                <Download className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => { setLightboxIdx(null); setZoom(false); }} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors" title="Close gallery">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center relative px-16">
            {lightboxIdx > 0 && (
              <button onClick={() => navigate(-1)} className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors" aria-label="Previous photo">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}
            {/* The zoom toggle hung off the <img> itself, so it could only be
                operated with a pointer. Wrapped in a button rather than given a
                role, because that is what it is — and the label reports the
                state, which a bare image cannot. */}
            <button
              type="button"
              onClick={() => setZoom(z => !z)}
              aria-pressed={zoom}
              aria-label={zoom ? 'Zoom out' : 'Zoom in'}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-lg"
            >
              <img
                src={lightboxImage.src}
                alt={lightboxImage.alt}
                className={`max-h-[80vh] rounded-lg transition-transform duration-300 ${zoom ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
              />
            </button>
            {lightboxIdx < filtered.length - 1 && (
              <button onClick={() => navigate(1)} className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors" aria-label="Next photo">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}
          </div>

          {/* Caption */}
          <div className="px-4 py-3 text-center">
            <p className="text-white/60 text-sm">{lightboxImage.alt}</p>
          </div>

          {/* Thumbnail strip */}
          <div className="px-4 pb-4 flex gap-2 justify-center overflow-x-auto hide-scrollbar">
            {filtered.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => { setLightboxIdx(idx); setZoom(false); }}
                aria-label={`Thumbnail ${idx + 1}: ${img.alt}`}
                className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === lightboxIdx ? 'border-rose-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img src={img.src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
