// frontend/src/mocks/productData.ts

export interface Product {
    id: number;
    name: string;
    supplier: string;
    description: string;
    imageUrl: string;
    certifications: string[];
    epd: {
      gwp: number; // Global Warming Potential in kg CO2e
    };
    recycledContent: number; // Percentage
    price?: number;
    priceUnit?: string;
  }

  export const MOCK_PRODUCTS: Product[] = [
    {
      id: 1,
      name: 'Warmcel Cellulose Insulation',
      supplier: 'Warmcel Ltd',
      description: 'High-performance insulation made from recycled newspaper.',
      imageUrl: '/placeholder.svg',
      certifications: ['FSC', 'LEED', 'B Corp'],
      epd: { gwp: 4.2 },
      recycledContent: 85,
      price: 4500,
      priceUnit: 'per 500 sq ft'
    },
    {
      id: 2,
      name: 'GreenFiber Bamboo Flooring',
      supplier: 'GreenFiber Co',
      description: 'Durable and sustainable bamboo flooring.',
      imageUrl: '/placeholder.svg',
      certifications: ['FSC', 'LEED'],
      epd: { gwp: 10.1 },
      recycledContent: 40,
      price: 8200
    },
    {
      id: 3,
      name: 'EcoRock Drywall',
      supplier: 'EcoRock',
      description: 'Mold-resistant drywall made with 80% recycled content.',
      imageUrl: '/placeholder.svg',
      certifications: ['C2C', 'LEED'],
      epd: { gwp: 7.5 },
      recycledContent: 80,
      price: 3000
    },
    {
      id: 4,
      name: 'SolarSmart Windows',
      supplier: 'SolarSmart',
      description: 'Triple-pane windows with high energy efficiency.',
      imageUrl: '/placeholder.svg',
      certifications: ['Energy Star', 'LEED'],
      epd: { gwp: 25.0 },
      recycledContent: 20,
      price: 15000
    },
    {
      id: 5,
      name: 'BioPaint Interior Paint',
      supplier: 'BioPaint',
      description: 'Zero-VOC paint for healthy indoor air quality.',
      imageUrl: '/placeholder.svg',
      certifications: ['Green Seal'],
      epd: { gwp: 2.1 },
      recycledContent: 0,
      price: 250
    },
    {
      id: 6,
      name: 'Recycled Steel Beams',
      supplier: 'Steel Mill Inc.',
      description: 'Structural steel beams made from 90% recycled steel.',
      imageUrl: '/placeholder.svg',
      certifications: ['LEED'],
      epd: { gwp: 150.0 },
      recycledContent: 90,
      price: 25000
    },
    { id: 7, name: 'Product 7', supplier: 'Supplier 7', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
    { id: 8, name: 'Product 8', supplier: 'Supplier 8', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
    { id: 9, name: 'Product 9', supplier: 'Supplier 9', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
    { id: 11, name: 'Product 11', supplier: 'Supplier 11', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
    { id: 12, name: 'Product 12', supplier: 'Supplier 12', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
    { id: 13, name: 'Product 13', supplier: 'Supplier 13', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
    { id: 15, name: 'Product 15', supplier: 'Supplier 15', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
    { id: 18, name: 'Product 18', supplier: 'Supplier 18', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
    { id: 20, name: 'Product 20', supplier: 'Supplier 20', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
    { id: 22, name: 'Product 22', supplier: 'Supplier 22', description: 'desc', imageUrl: '', certifications: [], epd: { gwp: 10 }, recycledContent: 10, price: 100 },
  ];
