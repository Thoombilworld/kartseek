import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, Trash2, Image, List, Grid } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  type: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function SortableSection({ id, title, type, onEdit, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIcon = () => {
    switch(type) {
      case 'banner_slider': return <Image className="w-5 h-5 text-blue-500" />;
      case 'product_carousel': return <List className="w-5 h-5 text-green-500" />;
      case 'category_grid': return <Grid className="w-5 h-5 text-purple-500" />;
      default: return <Image className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-slate-200 rounded-xl shadow-sm mb-3 flex items-center p-3 gap-4 group">
      <div {...attributes} {...listeners} className="cursor-grab p-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing focus:outline-none">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
        {getIcon()}
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        <p className="text-xs text-slate-500 font-medium capitalize">{type.replace('_', ' ')}</p>
      </div>

      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} aria-label="Edit section" className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-blue-600 focus:outline-none">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={onDelete} aria-label="Delete section" className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-red-600 focus:outline-none">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
