export interface Certification {
  name: string;
  year: number;
  description: string;
}

export interface Product {
  id: number;
  name: string;
  recycledContent: number;
  certifications: string[];
}

export interface Supplier {
  id: number;
  name: string;
  logo: string;
  location: string;
  established: number;
  website: string;
  description: string;
  specialties: string[];
  serviceAreas: string[];
  certifications: Certification[];
  products: Product[];
  stats: {
    productsCount: number;
    rating: number;
    reviewsCount: number;
  };
}

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 1,
    name: 'Warmcel Ltd',
    logo: 'https://via.placeholder.com/150x150?text=Warmcel',
    location: 'Cornwall, UK',
    established: 1995,
    website: 'https://warmcel.com',
    description: 'Leading manufacturer of recycled cellulose insulation made from post-consumer paper. Committed to circular economy principles and carbon-negative production.',
    specialties: ['Cellulose Insulation', 'Recycled Materials', 'Carbon-Negative Products'],
    serviceAreas: ['North America', 'Europe', 'UK'],
    certifications: [
      {
        name: 'B Corp',
        year: 2018,
        description: 'Certified B Corporation - meets highest standards of verified social and environmental performance'
      },
      {
        name: 'FSC',
        year: 2010,
        description: 'Forest Stewardship Council - ensures responsible forestry practices'
      },
      {
        name: 'ISO 14001',
        year: 2015,
        description: 'Environmental Management System certification'
      }
    ],
    products: [
      { id: 1, name: 'Warmcel Cellulose Insulation', recycledContent: 85, certifications: ['FSC', 'LEED'] },
      { id: 2, name: 'Warmcel 100 Premium', recycledContent: 95, certifications: ['FSC', 'LEED', 'B Corp'] }
    ],
    stats: {
      productsCount: 8,
      rating: 4.8,
      reviewsCount: 127
    }
  },
  {
    id: 2,
    name: 'GreenFiber Co',
    logo: 'https://via.placeholder.com/150x150?text=GreenFiber',
    location: 'Seattle, WA, USA',
    established: 2003,
    website: 'https://greenfiber.com',
    description: 'Sustainable flooring and finishes manufacturer specializing in low-VOC, high-recycled-content products for residential and commercial applications.',
    specialties: ['Flooring', 'Low-VOC Finishes', 'Bamboo Products'],
    serviceAreas: ['North America', 'Asia-Pacific'],
    certifications: [
      {
        name: 'LEED',
        year: 2008,
        description: 'Leadership in Energy and Environmental Design certified supplier'
      },
      {
        name: 'ISO 14001',
        year: 2012,
        description: 'Environmental Management System certification'
      }
    ],
    products: [
      { id: 3, name: 'Bamboo Flooring Classic', recycledContent: 40, certifications: ['LEED', 'FSC'] },
      { id: 4, name: 'Low-VOC Timber Finish', recycledContent: 0, certifications: ['LEED'] }
    ],
    stats: {
      productsCount: 15,
      rating: 4.6,
      reviewsCount: 89
    }
  },
  {
    id: 3,
    name: 'EcoTimber Inc',
    logo: 'https://via.placeholder.com/150x150?text=EcoTimber',
    location: 'Portland, OR, USA',
    established: 1998,
    website: 'https://ecotimber.com',
    description: 'Reclaimed and recycled timber specialists. Every product diverts waste from landfills while providing premium construction materials.',
    specialties: ['Reclaimed Timber', 'Recycled Wood Products', 'Structural Beams'],
    serviceAreas: ['North America'],
    certifications: [
      {
        name: 'FSC',
        year: 2005,
        description: 'Forest Stewardship Council - ensures responsible forestry practices'
      },
      {
        name: 'B Corp',
        year: 2020,
        description: 'Certified B Corporation - meets highest standards of verified social and environmental performance'
      }
    ],
    products: [
      { id: 5, name: 'Reclaimed Timber Beams', recycledContent: 100, certifications: ['FSC', 'B Corp'] },
      { id: 6, name: 'Recycled Flooring Planks', recycledContent: 100, certifications: ['FSC'] }
    ],
    stats: {
      productsCount: 12,
      rating: 4.9,
      reviewsCount: 203
    }
  }
];
