'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState, useCallback } from 'react';
import { Map as MapIcon, MapPin, Save, Plus, Trash2, Crosshair } from 'lucide-react';
import { GoogleMap, useJsApiLoader, DrawingManager } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

// Required libraries must be static to avoid infinite re-renders
const libraries: ("drawing" | "geometry")[] = ['drawing', 'geometry'];

export default function DeliveryZonesPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [zones, setZones] = useState([
    { id: 1, name: 'Downtown District', baseFee: 5.0, feePerKm: 1.5, active: true },
    { id: 2, name: 'Suburban Area A', baseFee: 8.0, feePerKm: 2.0, active: true },
  ]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  const onPolygonComplete = (polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const coordinates = [];
    for (let i = 0; i < path.getLength(); i++) {
      const xy = path.getAt(i);
      coordinates.push({ lat: xy.lat(), lng: xy.lng() });
    }
    console.log("Polygon completed with coordinates:", coordinates);
    
    // Reset back to pan mode
    setDrawingMode(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <MapIcon className="w-6 h-6 text-indigo-600" />
            Delivery Zone Configuration (PostGIS)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Draw geographical polygons to define custom delivery fees and service boundaries.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> New Zone
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zones List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700">
            Active Zones
          </div>
          <div className="divide-y divide-slate-100">
            {zones.map((z) => (
              <div key={z.id} className="p-4 hover:bg-slate-50 transition cursor-pointer group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-500" /> {z.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Base Fee: ${z.baseFee} • Per KM: ${z.feePerKm}</p>
                  </div>
                  <button className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition" title="Delete zone">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-2 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative min-h-[500px] flex flex-col items-center justify-center">
          <div className="absolute top-4 left-4 right-4 z-10 bg-white/90 backdrop-blur rounded-lg p-3 shadow-sm border border-slate-200 flex items-center gap-3">
            <Crosshair className="w-5 h-5 text-indigo-500" />
            <div className="flex-1 text-sm font-medium text-slate-700">
              Drawing Mode: {drawingMode === 'polygon' ? 'Polygon (Click to add points)' : 'Pan / Select'}
            </div>
            {drawingMode !== 'polygon' && (
              <button 
                onClick={() => setDrawingMode('polygon' as any)}
                className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-200 transition"
              >
                Draw Polygon
              </button>
            )}
            <button className="bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition">
              <Save className="w-3 h-3" /> Save Geometry
            </button>
          </div>
          
          {isLoaded ? (
            // @ts-ignore - React 18 type definitions mismatch
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={10}
              onUnmount={onUnmount}
              onLoad={(m: google.maps.Map) => setMap(m)}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
              }}
            >
              {/* @ts-ignore - React 18 type definitions mismatch */}
              <DrawingManager
                drawingMode={drawingMode}
                onPolygonComplete={onPolygonComplete}
                options={{
                  drawingControl: false,
                  polygonOptions: {
                    fillColor: '#4F46E5',
                    fillOpacity: 0.4,
                    strokeWeight: 2,
                    strokeColor: '#4338CA',
                    clickable: true,
                    editable: true,
                    zIndex: 1,
                  },
                }}
              />
            </GoogleMap>
          ) : (
            <div className="text-center p-6 text-slate-400">
              <MapIcon className="w-16 h-16 mx-auto mb-3 opacity-20 animate-pulse" />
              <p className="font-medium text-slate-600">Loading Google Maps...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
