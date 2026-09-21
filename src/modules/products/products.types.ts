export interface ProductRow {
  id: string;
  bakery_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  default_price: number;
  unit: string;
  image: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  categoryId?: string;
  name: string;
  description?: string;
  defaultPrice: number; // in paise
  unit: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
