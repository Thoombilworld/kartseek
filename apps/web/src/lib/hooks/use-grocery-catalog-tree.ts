'use client';

import { useMemo } from 'react';
import { api } from '@/lib/api-endpoints';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * The grocery catalogue as department → category → sub-category.
 *
 * The product form had three selects with three hard-coded option lists that
 * matched neither each other nor the catalogue: its "Category" options were
 * things like `Milk` and `Cheese` (sub-category names), and its "Subcategory"
 * options were a fixed dairy list shown whatever category you picked. Nothing
 * cascaded, and the value posted was display text, so products were filed under
 * categories that did not exist and could not be browsed to.
 *
 * One source now feeds all three, and the API rejects a path that is not a real
 * place in the tree — so the form and the backend agree by construction.
 */

export interface CatalogNode {
  id: string;
  name: string;
  emoji: string | null;
  level: 'department' | 'category' | 'subcategory';
  productCount: number;
  children: CatalogNode[];
}

export function useGroceryCatalogTree() {
  const { data, loading, error } = useAsyncData<{ departments: CatalogNode[]; total: number } | null>(
    async () => api.get<{ departments: CatalogNode[]; total: number }>('/grocery/categories/tree'),
    [],
  );

  const departments = useMemo(() => data?.departments ?? [], [data]);

  /** Categories inside a department, by department id. */
  const categoriesOf = useMemo(
    () => (departmentId: string) =>
      departments.find((d) => d.id === departmentId)?.children ?? [],
    [departments],
  );

  /** Sub-categories inside a category, searched across departments. */
  const subcategoriesOf = useMemo(
    () => (categoryId: string) => {
      for (const dept of departments) {
        const cat = dept.children.find((c) => c.id === categoryId);
        if (cat) return cat.children;
      }
      return [] as CatalogNode[];
    },
    [departments],
  );

  /** The department a category belongs to — for editing an existing product. */
  const departmentOf = useMemo(
    () => (categoryId: string) =>
      departments.find((d) => d.children.some((c) => c.id === categoryId))?.id ?? '',
    [departments],
  );

  return {
    departments,
    categoriesOf,
    subcategoriesOf,
    departmentOf,
    loading,
    error,
    isEmpty: !loading && departments.length === 0,
  };
}
