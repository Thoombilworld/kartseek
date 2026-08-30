import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, Link as LinkIcon, Type, Palette } from 'lucide-react';

interface Banner {
  id: string;
  headline: string;
  tag: string;
  cta: string;
  ctaHref: string;
  image: string;
  gradient: string;
}

interface SectionData {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  banners?: Banner[];
  categories?: string[];
  [key: string]: any;
}

interface Props {
  section: SectionData;
  onSave: (updatedSection: SectionData) => void;
  onClose: () => void;
}

const GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-purple-600 to-fuchsia-700',
  'from-slate-800 to-slate-900',
];

export function SectionEditorModal({ section, onSave, onClose }: Props) {
  const [data, setData] = useState<SectionData>(JSON.parse(JSON.stringify(section)));

  // Ensure banners exist for hero_slider
  useEffect(() => {
    if (data.type === 'hero_slider' && !data.banners) {
      setData({ ...data, banners: [] });
    }
  }, [data.type]);

  const handleChange = (key: keyof SectionData, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleBannerChange = (index: number, key: keyof Banner, value: string) => {
    const newBanners = [...(data.banners || [])];
    newBanners[index] = { ...newBanners[index], [key]: value };
    handleChange('banners', newBanners);
  };

  const addBanner = () => {
    const newBanner: Banner = {
      id: `bnr-${Date.now()}`,
      headline: 'New Headline',
      tag: 'NEW',
      cta: 'Shop Now',
      ctaHref: '/marketplace',
      image: '',
      gradient: GRADIENTS[0],
    };
    handleChange('banners', [...(data.banners || []), newBanner]);
  };

  const removeBanner = (index: number) => {
    const newBanners = [...(data.banners || [])];
    newBanners.splice(index, 1);
    handleChange('banners', newBanners);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Edit Section</h2>
            <p className="text-xs text-slate-500 capitalize">{data.type.replace('_', ' ')} Settings</p>
          </div>
          <button onClick={onClose} aria-label="Close editor" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">General Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="section-title" className="block text-xs font-bold text-slate-500 mb-1">Section Title</label>
                <input 
                  id="section-title"
                  type="text" 
                  value={data.title || ''} 
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label htmlFor="section-subtitle" className="block text-xs font-bold text-slate-500 mb-1">Subtitle (Optional)</label>
                <input 
                  id="section-subtitle"
                  type="text" 
                  value={data.subtitle || ''} 
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              {data.type !== 'hero_slider' && data.type !== 'trust_badges' && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="view-all-link-optional">"View All" Link (Optional)</label>
                  <input id="view-all-link-optional" 
                    type="text" 
                    value={data.viewAllHref || ''} 
                    onChange={(e) => handleChange('viewAllHref', e.target.value)}
                    placeholder="/marketplace/category/..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Hero Slider Specific Settings */}
          {data.type === 'hero_slider' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-800">Banner Slides</h3>
                <button onClick={addBanner} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Banner
                </button>
              </div>

              <div className="space-y-4">
                {data.banners?.map((banner, index) => (
                  <div key={banner.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 relative group">
                    <button onClick={() => removeBanner(index)} aria-label="Remove banner" className="absolute top-3 right-3 p-1.5 bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors opacity-0 group-hover:opacity-100 shadow-sm z-10">
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Image Preview / Input */}
                      <div className="md:col-span-2 flex gap-4">
                        <div className={`w-32 h-20 rounded-lg overflow-hidden shrink-0 bg-linear-to-r ${banner.gradient} flex items-center justify-center relative border border-slate-200 shadow-inner`}>
                          {banner.image ? (
                            <img src={banner.image} alt="Banner Preview" className="w-full h-full object-cover mix-blend-overlay opacity-80" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-white/50" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Image URL</label>
                            <div className="relative">
                              <LinkIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                              <input 
                                type="text" 
                                value={banner.image}
                                onChange={(e) => handleBannerChange(index, 'image', e.target.value)}
                                placeholder="https://example.com/image.png"
                                className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Inputs */}
                      <div>
                        <label htmlFor={`banner-headline-${index}`} className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Headline</label>
                        <textarea 
                          id={`banner-headline-${index}`}
                          value={banner.headline}
                          onChange={(e) => handleBannerChange(index, 'headline', e.target.value)}
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white resize-none"
                        />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label htmlFor={`banner-tag-${index}`} className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Badge Tag</label>
                          <input 
                            id={`banner-tag-${index}`}
                            type="text" 
                            value={banner.tag}
                            onChange={(e) => handleBannerChange(index, 'tag', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label htmlFor={`banner-cta-${index}`} className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Button Text</label>
                            <input 
                              id={`banner-cta-${index}`}
                              type="text" 
                              value={banner.cta}
                              onChange={(e) => handleBannerChange(index, 'cta', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            />
                          </div>
                          <div>
                            <label htmlFor={`banner-link-${index}`} className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Link</label>
                            <input 
                              id={`banner-link-${index}`}
                              type="text" 
                              value={banner.ctaHref}
                              onChange={(e) => handleBannerChange(index, 'ctaHref', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                          <Palette className="w-3 h-3" /> Background Gradient
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {GRADIENTS.map(grad => (
                            <button
                              key={grad}
                              onClick={() => handleBannerChange(index, 'gradient', grad)}
                              aria-label={`Select gradient ${grad}`}
                              className={`w-8 h-8 rounded-full bg-linear-to-r ${grad} border-2 transition-transform hover:scale-110 ${banner.gradient === grad ? 'border-slate-900 shadow-md scale-110 ring-2 ring-white' : 'border-transparent'}`}
                            />
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
                
                {data.banners?.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-sm text-slate-500">No banners added yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={() => onSave(data)} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
            Apply Changes
          </button>
        </div>

      </div>
    </div>
  );
}
