 feature/product-detail-page
// src/types.ts


 main
export interface Product {
  id: string;
  name: string;
  description: string;
  supplier_id: string;
 feature/product-detail-page
  images: string[];
  specs: {
    [key: string]: string | number;
  };
  sustainability_data: {
    gwp?: number;
    recycled_content?: number;
    water_usage?: number;
    voc_level?: number;
    epd_link?: string;
    certifications?: string[];
  };
  supplier?: Supplier; // Optional: To be populated after fetching

  material_type: string;
  application: string;
  certifications: string[];
  sustainability_data: {
    gwp: number;
    recycled_content: number;
  };
  specs: {
    [key: string]: string;
  };
  supplier: Supplier;
 main
}

export interface Supplier {
  id: string;
  name: string;
 feature/product-detail-page
  location: string;
  description: string;
  logo_url: string;
}

export interface RFQData {
  buyer_email: string;
  project_name?: string;
  message: string;
  quantity?: number;
  timeline: 'ASAP' | '1-3 months' | '3-6 months' | '6+ months';
}

  logo_url: string;
}
 main
