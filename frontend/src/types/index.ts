// frontend/src/types/index.ts

export interface Product {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  supplier_id: string;
  sustainability_data: {
    gwp_fossil?: number;
    certifications?: string[];
    recycled_content?: number;
  };
  // Other product fields as needed
}
