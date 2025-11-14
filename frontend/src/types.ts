export interface Product {
  id: string;
  name: string;
  description: string;
  supplier_id: string;
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
}

export interface Supplier {
  id: string;
  name: string;
  logo_url: string;
}
