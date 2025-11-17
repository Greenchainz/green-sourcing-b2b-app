export interface Product {
  id: number;
  name: string;
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
}
