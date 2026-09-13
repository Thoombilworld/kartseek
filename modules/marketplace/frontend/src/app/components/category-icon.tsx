import type React from 'react';
import {
  Armchair,
  Baby,
  BookOpen,
  Briefcase,
  Car,
  Dumbbell,
  Footprints,
  Headphones,
  Heart,
  Laptop,
  Monitor,
  Paperclip,
  PawPrint,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  ToyBrick,
  Tv,
  Watch,
} from 'lucide-react';

/**
 * `categories.icon` holds a Lucide component name. One map, used by the
 * listing header and the product card's image fallback, so a name added to
 * the database is resolved the same way on every surface that draws it.
 */
export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Smartphone,
  Laptop,
  Shirt,
  Sofa,
  Dumbbell,
  Baby,
  Sparkles,
  BookOpen,
  Car,
  ShoppingBasket,
  Tv,
  Headphones,
  Monitor,
  Briefcase,
  PawPrint,
  Paperclip,
  Watch,
  Armchair,
  Heart,
  Footprints,
  ToyBrick,
};

/** The icon for a category name, or the basket when the name is unknown or blank. */
export function categoryIcon(name?: string | null): React.ElementType {
  return (name && CATEGORY_ICONS[name]) || ShoppingBasket;
}
