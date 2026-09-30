/**
 * Wire types for The Card API Market `/sales` response.
 * Field names match public docs (snake_case).
 */

export interface TcaSaleRecord {
  id: string;
  platform: string;
  listing_type?: string | null;
  title?: string | null;
  sale_date?: string | null;
  sold_at?: string | null;
  price?: number | string | null;
  original_price?: number | string | null;
  currency?: string | null;
  price_confirmed?: boolean | null;
  bids?: number | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  listing_url?: string | null;
  condition?: string | null;
  grade?: string | null;
  grader?: string | null;
  grading_company?: string | null;
  cert?: string | null;
  shipping_price?: number | string | null;
  category?: string | null;
  card_set?: string | null;
  card_number?: string | null;
  player?: string | null;
}

export interface TcaSalesPagination {
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
  has_more?: boolean;
  next_cursor?: string | null;
}

export interface TcaSalesMeta {
  coverage_date_from?: string | null;
  coverage_date_to?: string | null;
  platforms_covered?: string[];
  generated_at?: string;
}

export interface TcaSalesResponse {
  data: TcaSaleRecord[];
  pagination?: TcaSalesPagination;
  meta?: TcaSalesMeta;
}
