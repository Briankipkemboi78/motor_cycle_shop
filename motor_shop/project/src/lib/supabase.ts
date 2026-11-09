import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Product = {
  id: string;
  name: string;
  category: 'motorcycle' | 'spare_part';
  part_number: string;
  brand: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  image_url: string;
  status: 'in_stock' | 'out_of_stock';
  min_stock_level: number;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  receipt_number: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

export type SaleWithItems = Sale & {
  sale_items: SaleItem[];
};
