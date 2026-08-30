import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Clock, MapPin, BadgePercent, ChefHat } from 'lucide-react';

interface RestaurantProps {
  id: string;
  name: string;
  rating: number;
  deliveryTime: string;
  distance: string;
  cuisines: string[];
  imageUrl?: string;
  emojiImage?: string;
  offer?: string;
  isPromoted?: boolean;
}

export default function RestaurantCard({ id, name, rating, deliveryTime, distance, cuisines, imageUrl, emojiImage, offer, isPromoted }: RestaurantProps) {
  return (
    <Link href={`/restaurant/${id}`} className="group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative w-full h-56 bg-gray-100 overflow-hidden group-hover:shadow-inner">
        {imageUrl ? (
          <Image 
            src={imageUrl} 
            alt={name} 
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : emojiImage ? (
          <div className="absolute inset-0 bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
            <span className="text-7xl">{emojiImage}</span>
          </div>
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-orange-50 to-red-50 flex items-center justify-center text-orange-200 transition-transform duration-700 group-hover:scale-110">
            <ChefHat className="w-16 h-16 opacity-50" />
          </div>
        )}
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {isPromoted && (
            <div className="bg-gray-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
              Promoted
            </div>
          )}
        </div>
        
        {/* Offer Overlay */}
        {offer && (
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-3 pt-8 z-10">
            <div className="flex items-center gap-1 text-white font-bold text-sm">
              <BadgePercent className="w-4 h-4 text-orange-400" />
              {offer}
            </div>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-gray-900 text-lg line-clamp-1 group-hover:text-orange-600 transition-colors">{name}</h3>
          <div className="flex items-center gap-1 bg-green-600 text-white px-1.5 py-0.5 rounded text-xs font-bold shadow-sm">
            <span>{rating}</span>
            <Star className="w-3 h-3 fill-current" />
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-3 truncate">
          {cuisines.join(', ')}
        </p>

        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">{deliveryTime}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>{distance}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
