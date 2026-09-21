export interface CustomerRow {
  id: string;
  bakery_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  google_maps_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  googleMapsLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
