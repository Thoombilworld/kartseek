'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableSection } from './components/sortable-section';
import { SectionEditorModal } from './components/section-editor-modal';
import { Plus, Save, LayoutTemplate, Loader2, AlertCircle } from 'lucide-react';
import apiFetch from '@/lib/api-client';

const MODULES = ['Marketplace', 'Grocery', 'Pharmacy', 'Doctor', 'Taxi', 'Hotel'];
const PAGES = ['Homepage', 'Category Page', 'Search Results', 'Checkout'];

export default function PageBuilder() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [selectedModule, setSelectedModule] = useState('Marketplace');
  const [selectedPage, setSelectedPage] = useState('Homepage');
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingSection, setEditingSection] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadLayout();
  }, [selectedModule, selectedPage]);

  async function loadLayout() {
    setIsLoading(true);
    setMessage('');
    try {
      const res = await apiFetch<any>(`/admin/layouts/${selectedModule.toLowerCase()}/${selectedPage.toLowerCase()}`);
      const payload = res.data ? res.data : res;
      if (payload && payload.sections) {
        setSections(payload.sections);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to load layout');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage('');
    try {
      await apiFetch(`/admin/layouts/${selectedModule.toLowerCase()}/${selectedPage.toLowerCase()}`, {
        method: 'PUT',
        body: JSON.stringify({ sections }),
      });
      setMessage('Layout saved successfully! Live site updated instantly.');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      console.error(err);
      setMessage('Error saving layout');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleAddSection() {
    const newSection = {
      id: `sec-${Date.now()}`,
      title: 'New Custom Section',
      type: 'product_carousel'
    };
    setSections([...sections, newSection]);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visual Page Builder</h1>
          <p className="text-slate-500 text-sm">Design and manage layouts for all module homepages intuitively.</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm font-medium ${message.includes('Error') || message.includes('Failed') ? 'text-rose-500' : 'text-emerald-600'}`}>
              {message}
            </span>
          )}
          <button 
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
           aria-label="Loading">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
            {isSaving ? 'Saving...' : 'Save Layout'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <div className="w-64 shrink-0 space-y-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Module</label>
            <div className="space-y-1">
              {MODULES.map(mod => (
                <button 
                  key={mod}
                  onClick={() => setSelectedModule(mod)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedModule === mod ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Page</label>
            <div className="space-y-1">
              {PAGES.map(page => (
                <button 
                  key={page}
                  onClick={() => setSelectedPage(page)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPage === page ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Builder Canvas */}
        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-6 min-h-[600px] flex gap-8">
          
          <div className="flex-1 max-w-lg mx-auto relative">
            {isLoading && (
              <div className="absolute inset-0 bg-slate-50/80 z-10 flex items-center justify-center rounded-xl backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            )}
            
            <div className="mb-6 flex justify-between items-center bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <LayoutTemplate className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{selectedModule} / {selectedPage}</h2>
                  <p className="text-xs text-slate-500">{sections?.length || 0} Active Sections</p>
                </div>
              </div>
              <button onClick={handleAddSection} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors" title="Add Section">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {sections?.length === 0 && !isLoading ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">No sections defined yet.</p>
                <button onClick={handleAddSection} className="mt-4 text-emerald-600 font-bold text-sm hover:underline">Create First Section</button>
              </div>
            ) : (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={sections || []}
                  strategy={verticalListSortingStrategy}
                >
                  {sections?.map(section => (
                    <SortableSection 
                      key={section.id} 
                      id={section.id}
                      title={section.title}
                      type={section.type}
                      onEdit={() => setEditingSection(section)}
                      onDelete={() => setSections(sections.filter(s => s.id !== section.id))}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            
            <button onClick={handleAddSection} className="w-full mt-4 border-2 border-dashed border-slate-300 rounded-xl py-4 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 hover:bg-slate-100 transition-colors">
              <Plus className="w-6 h-6 mb-1" />
              <span className="text-sm font-medium">Add New Section</span>
            </button>
          </div>

          {/* Phone Preview Mockup */}
          <div className="hidden xl:block w-[300px] shrink-0">
            <div className="bg-white border-[6px] border-slate-900 rounded-[2.5rem] h-[600px] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-2xl w-32 mx-auto z-10 flex justify-center items-center gap-2 px-4">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                 <div className="w-8 h-1.5 rounded-full bg-slate-800"></div>
              </div>
              <div className="bg-slate-50 w-full h-full p-4 overflow-y-auto space-y-3 pt-8 hide-scrollbar">
                {sections?.map(s => (
                  <div key={s.id} className={`rounded-xl w-full flex items-center justify-center font-bold text-sm border-2 ${s.type === 'hero_slider' ? 'bg-indigo-50 border-indigo-100 text-indigo-400 h-[140px]' : s.type === 'category_grid' ? 'bg-rose-50 border-rose-100 text-rose-400 h-[80px]' : 'bg-white border-slate-200 text-slate-400 h-[120px] shadow-sm'}`}>
                    {s.title}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {editingSection && (
        <SectionEditorModal 
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onSave={(updatedSection) => {
            setSections(sections.map(s => s.id === updatedSection.id ? updatedSection : s));
            setEditingSection(null);
          }}
        />
      )}
    </div>
  );
}
