import { ebayRequest } from "@/lib/ebay/http";

export interface EbayCategoryNode {
  categoryId?: string;
  categoryName?: string;
  categoryTreeNodeLevel?: number;
  leafCategoryTreeNode?: boolean;
  childCategoryTreeNodes?: EbayCategoryNode[];
}

interface CategoryTreeResponse {
  categoryTreeId?: string;
  rootCategoryNode?: EbayCategoryNode;
}

/** Default US marketplace category tree id for eBay Taxonomy API. */
export const EBAY_DEFAULT_CATEGORY_TREE_ID = "0";

export async function ebayGetCategoryTree(
  treeId: string = EBAY_DEFAULT_CATEGORY_TREE_ID,
): Promise<CategoryTreeResponse> {
  return ebayRequest<CategoryTreeResponse>(
    "getCategoryTree",
    `/commerce/taxonomy/v1/category_tree/${treeId}`,
  );
}

/**
 * Walks the public taxonomy tree and collects leaf nodes whose names match TCG hints.
 * Does not invent cards — only records category ids for later browse/sold queries.
 */
export function collectTcgLeafCategories(
  root: EbayCategoryNode | undefined,
  hints: string[] = ["pokemon", "pokémon", "one piece", "trading card"],
): Array<{ categoryId: string; categoryName: string }> {
  const out: Array<{ categoryId: string; categoryName: string }> = [];
  if (root === undefined) return out;

  function walk(node: EbayCategoryNode, ancestors: string[]) {
    const name = node.categoryName ?? "";
    const path = [...ancestors, name];
    const pathLower = path.join(" > ").toLowerCase();
    const isLeaf = node.leafCategoryTreeNode === true;
    const matches = hints.some((h) => pathLower.includes(h));

    if (isLeaf && matches && node.categoryId !== undefined) {
      out.push({ categoryId: node.categoryId, categoryName: path.join(" > ") });
    }
    for (const child of node.childCategoryTreeNodes ?? []) {
      walk(child, path);
    }
  }

  walk(root, []);
  return out;
}
