/**
 * The category tree, built from the flat rows `GET /marketplace/categories`
 * returns (each row carries `parentId` / `parentSlug` / `isSubcategory`).
 *
 * The seller product form used to ship its own three-level category literal
 * with names the catalogue does not use, so a seller could pick "Mobile
 * Phones › Smartphones" and post nothing the backend could resolve. The form
 * now offers exactly the categories the catalogue has, by their real ids.
 */

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
  productCount?: number;
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Flat rows → top-level categories with their subcategories, sorted by name. */
export function buildCategoryTree(rows: unknown): CategoryNode[] {
  const list: any[] = Array.isArray(rows)
    ? rows
    : Array.isArray((rows as any)?.data)
      ? (rows as any).data
      : [];

  const byId = new Map<string, CategoryNode>();
  for (const row of list) {
    const id = text(row?.id);
    if (!id) continue;
    byId.set(id, {
      id,
      name: text(row?.name) || text(row?.slug) || id,
      slug: text(row?.slug),
      parentId: text(row?.parentId ?? row?.parent?.id) || null,
      children: [],
      productCount: Number(row?.productCount) || undefined,
    });
  }

  // Rows that name a parent by slug only, or whose parent is not in the list,
  // still need a home: resolve by slug, else treat them as top-level.
  const bySlug = new Map<string, CategoryNode>();
  for (const node of byId.values()) if (node.slug) bySlug.set(node.slug, node);
  for (const row of list) {
    const node = byId.get(text(row?.id));
    if (!node || node.parentId) continue;
    const parentSlug = text(row?.parentSlug);
    if (parentSlug && bySlug.get(parentSlug)) node.parentId = bySlug.get(parentSlug)!.id;
  }

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

/** The node for an id, anywhere in the tree. */
export function findCategoryNode(tree: CategoryNode[], id: string): CategoryNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const hit = findCategoryNode(node.children, id);
    if (hit) return hit;
  }
  return null;
}
