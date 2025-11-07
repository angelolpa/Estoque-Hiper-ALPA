export type Product = {
  id: number;
  system_id: string;
  name: string;
  barcodes: string[];
  sql_server_id: string | null;
  image_id: string | null;
  image_url: string | null;
};

export type Scan = {
  id: number;
  barcode: string;
  type: 'entry' | 'exit';
  scanned_at: string;
};

export type RecentScan = {
  barcode: string;
  product_name: string;
  scanned_at: string;
  image_url: string | null;
  system_id: string;
  success: boolean;
};

export type StockSummary = {
  name: string;
  system_id: string;
  barcode: string;
  stock_level: number;
};

export type StockSummaryForDisplay = {
  name: string;
  system_id: string;
  barcodes: string[];
  stock_level: number;
  image_url: string | null;
};

export type ValidatedProduct = {
  name: string;
  imageUrl: string | null;
  systemId: string;
  barcode: string;
  stockLevel: number;
};
