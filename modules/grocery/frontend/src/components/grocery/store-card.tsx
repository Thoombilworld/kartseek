import React from 'react';
import { Star, Clock, MapPin, ChevronRight, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

interface StoreProps {
  id: string;
  name: string;
  rating: number;
  deliveryTime: string;
  distance: string;
  imageUrl: string;
  tags: string[];
  isPromoted?: boolean;
}

export default function StoreCard({ id, name, rating, deliveryTime, distance, imageUrl, tags, isPromoted }: StoreProps) {
  return (
    <Link href={`/store/${id}`} className="group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative w-full h-40 bg-gray-100 overflow-hidden">
        {/* Fallback pattern if no Image component configured properly yet */}
        <div className="absolute inset-0 bg-linear-to-br from-green-50 to-emerald-100 flex items-center justify-center text-green-200">
          <Store className="w-16 h-16 opacity-50" />
        </div>
        
        {/* Promotional Badge */}
        {isPromoted && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm z-10">
            Promoted
          </div>
        )}
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content Container */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-gray-900 text-lg line-clamp-1 group-hover:text-green-600 transition-colors">{name}</h3>
          <div className="flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded text-sm text-green-700 font-semibold">
            <span>{rating}</span>
            <Star className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500">
          {tags.map((tag, i) => (
            <span key={i} className="bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">{deliveryTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>{distance}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
