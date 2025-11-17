export interface Product {
  id: number;
  name: string;
 feature/rfq-system
  description: string;
  supplier_id: string;
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
  supplier?: Supplier;
  material_type: string;
  application: string;
  certifications: string[];
}

export interface RFQData {
  buyer_email: string;
  project_name?: string;
  message: string;
  quantity?: number;
  timeline: 'ASAP' | '1-3 months' | '3-6 months' | '6+ months';
  contact_preference: 'email' | 'phone' | 'text';
}

export interface RFQ {
  id: string;
  product_name: string;
  buyer: string;
  company: string;
  quantity?: number;
  deadline: string;
  status: 'Pending' | 'Quoted' | 'Won' | 'Lost';
  message?: string;
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
}
