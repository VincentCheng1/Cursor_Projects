/** Shapes matching TCGCSV / TCGplayer public catalog + price exports. */

export interface TcgCsvCategory {
  categoryId: number;
  name?: string;
  displayName?: string;
  seoCategoryName?: string;
  modifiedOn?: string;
  popularity?: number;
}

export interface TcgCsvGroup {
  groupId: number;
  name?: string;
  abbreviation?: string;
  isSupplemental?: boolean;
  publishedOn?: string | null;
  modifiedOn?: string | null;
  categoryId?: number;
}

export interface TcgCsvExtendedData {
  name?: string;
  displayName?: string;
  value?: string;
}

export interface TcgCsvProduct {
  productId: number;
  name?: string;
  cleanName?: string;
  imageUrl?: string;
  categoryId?: number;
  groupId?: number;
  url?: string;
  modifiedOn?: string;
  extendedData?: TcgCsvExtendedData[];
}

export interface TcgCsvPrice {
  productId: number;
  lowPrice?: number | null;
  midPrice?: number | null;
  highPrice?: number | null;
  marketPrice?: number | null;
  directLowPrice?: number | null;
  subTypeName?: string;
}

export interface TcgCsvCollection<T> {
  totalItems?: number;
  success?: boolean;
  errors?: string[];
  results?: T[];
}

/** Normalized reference market/mid row (never a completed sale). */
export interface TcgCsvReferencePrice {
  productId: string;
  subTypeName: string;
  marketPrice: number | null;
  midPrice: number | null;
  lowPrice: number | null;
  highPrice: number | null;
}
