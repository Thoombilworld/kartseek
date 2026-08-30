/**
 * KARTSEEK Seller Grocery Categories
 *
 * Re-exported from the canonical single source of truth.
 * To update categories, edit: apps/web/src/lib/grocery-categories.ts
 * Changes will propagate to: Admin Panel, Customer Site, Seller Portal, Flutter App.
 */

export type { GroceryCategory, GrocerySubcategory } from '@/lib/modules/grocery-categories';
export {
  GROCERY_CATEGORIES,
  ACTIVE_GROCERY_CATEGORIES,
  findCategoryById,
  findSubcategoryById,
  flattenSubcategories,
} from '@/lib/modules/grocery-categories';

// Legacy getCategoryPath helper kept for backward compatibility with seller portal
// code that may use the old recursive signature.
export function getCategoryPath(
  categories: import('@/lib/modules/grocery-categories').GroceryCategory[],
  id: string,
  path: import('@/lib/modules/grocery-categories').GroceryCategory[] = [],
): import('@/lib/modules/grocery-categories').GroceryCategory[] | null {
  for (const cat of categories) {
    const currentPath = [...path, cat];
    if (cat.id === id) return currentPath;
    if (cat.subcategories) {
      const found = getCategoryPath(cat.subcategories as any, id, currentPath as any);
      if (found) return found as any;
    }
  }
  return null;
}
