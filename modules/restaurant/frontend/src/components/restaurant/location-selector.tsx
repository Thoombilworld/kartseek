'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';

export default function RestaurantLocationSelector() {
  const { currentRegionConfig } = useRegion();
  const defaultCity = currentRegionConfig?.defaultCity || 'Select Location';
  
  const [locationName, setLocationName] = useState(defaultCity);
  const [isLocating, setIsLocating] = useState(false);

  // Adapts to current country default city initially
  useEffect(() => {
    setLocationName(currentRegionConfig?.defaultCity || 'Select Location');
  }, [currentRegionConfig]);

  const handleGetLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Typically we would reverse geocode the coordinates here.
          // For demo purposes, we will simulate a GPS location resolution.
          setTimeout(() => {
            const lat = position.coords.latitude.toFixed(2);
            const lng = position.coords.longitude.toFixed(2);
            setLocationName(`GPS: ${lat}, ${lng} (${currentRegionConfig?.name || ''})`);
            setIsLocating(false);
          }, 1000);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  return (
    /*
      A real button: this triggers geolocation, and as a div it could neither be
      tabbed to nor fired with a key. `title` is not an accessible name, so the
      intent is stated with aria-label instead.
    */
    <button
      type="button"
      onClick={handleGetLocation}
      className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white cursor-pointer bg-white/15 hover:bg-white/22 px-3 py-1.5 rounded-full transition-all"
      aria-label="Detect my location"
      title="Click to detect GPS location"
    >
      {isLocating ? (
        <Navigation className="w-3.5 h-3.5 text-orange-200 animate-spin" />
      ) : (
        <MapPin className="w-3.5 h-3.5 text-orange-200" />
      )}
      <span className="truncate max-w-[180px]">
        {isLocating ? 'Locating...' : locationName}
      </span>
    </button>
  );
}
