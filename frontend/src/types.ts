 feat/legal-pages
// frontend/src/types.ts


main
export interface Product {
  id: number;
  name: string;
 feature/rfq-system
  description: string;
  supplier_id: string;
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
  quantity: string;
  message: string;
feat/legal-pages
  status: 'New' | 'Responded' | 'Archived';
  created_at: string;

  quantity?: number;
  timeline: 'ASAP' | '1-3 months' | '3-6 months' | '6+ months';
  contact_preference: 'email' | 'phone' | 'text';
 main
}

export interface Quote {
  id: number;
  rfq_id: number;
  supplier_id: string;
  price: number;
  availability: string;
  timeline: string;
  message?: string;
 feat/legal-pages
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  role: 'buyer' | 'supplier' | 'admin';
  company_name?: string;
  name?: string;

  contact_preference?: 'email' | 'phone' | 'text';

  company: string;
  certification: string;
  image: string;
  featured: boolean;
  materialType: string;
  application: ('Residential' | 'Commercial')[];
  certifications: string[];
  location: string;
  recycledContent: number;
  carbonFootprint: number;
  vocLevel: number;
  main
 main
}
