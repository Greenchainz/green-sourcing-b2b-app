// frontend/src/types/index.ts

export interface User {
  id: string; // UUID
  email: string;
  role: 'buyer' | 'supplier' | 'admin';
  company_name?: string;
  created_at: string; // Timestamp
}

export interface Supplier extends User {
  company_address?: string;
  esg_summary?: string;
}

export interface Product {
  id: string; // UUID
  supplier_id: string; // UUID of the user who is the supplier
  name: string;
  description?: string;
  image_url?: string;
  technical_specs?: Record<string, string | number | boolean>; // JSONB
  certifications?: string[]; // Array of certification names
  epd_link?: string;
  sustainability_data?: {
    gwp_fossil?: number;
    recycled_content?: number;
  };
  gwp?: number; // Global Warming Potential (kg CO2e)
  recycled_content_percent?: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string; // Timestamp
}

export interface RFQ {
  id: string; // UUID
  buyer_id: string; // UUID of the user who is the buyer
  product_id: string; // UUID of the product
  project_name?: string;
  quantity?: number;
  message?: string;
  created_at: string; // Timestamp
}

export interface FilterState {
  materialType: string;
  certification: string[];
  location: string;
  gwp: number;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, role: 'buyer' | 'supplier') => void;
  logout: () => void;
  isAuthenticated: boolean;
}
