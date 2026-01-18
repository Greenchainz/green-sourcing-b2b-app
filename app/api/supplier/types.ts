
export interface Supplier {
  id: string; // UUID
  company_id: string; // UUID
  name: string;
  email: string;
  phone?: string;
  website?: string;
  verification_status: 'unverified' | 'verified' | 'rejected';
  created_at: Date;
  updated_at: Date;
}

export interface Company {
  id: string; // UUID
  name: string;
  description?: string;
  logo_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string; // UUID
  supplier_id: string; // UUID
  name: string;
  description?: string;
  category?: string;
  price?: number;
  gwp?: number; // Global Warming Potential
  epd_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Location {
  id: string; // UUID
  supplier_id: string; // UUID
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number;
  longitude?: number;
}
