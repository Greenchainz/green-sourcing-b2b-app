// frontend/src/types.ts

export interface Product {
  id: number;
  name: string;
  description: string;
  supplier_id: string;
  supplier_name?: string;
  material_type: string;
  recycled_content: number;
  certifications: string[];
  image_url?: string;
  price?: number;
}

export interface RFQ {
  id: number;
  buyer_id: string;
  product_id: number;
  product_name?: string;
  buyer_company?: string;
  buyer_name?: string;
  buyer_email?: string;
  quantity: string;
  message: string;
  project_details?: string;
  status: 'New' | 'Responded' | 'Archived';
  created_at: string;
}

export interface Quote {
  id: number;
  rfq_id: number;
  supplier_id: string;
  price: number;
  availability: string;
  timeline: string;
  message?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  role: 'buyer' | 'supplier' | 'admin';
  company_name?: string;
  name?: string;
}
