export interface Project {
  id: number;
  name: string;
  description?: string;
  type: 'residential' | 'commercial' | 'industrial';
  targetLEED?: 'Silver' | 'Gold' | 'Platinum' | 'None';
  createdAt: string;
  productIds: number[]; // Array of product IDs in this project
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Seattle Office Building',
    description: 'LEED Gold commercial office space renovation',
    type: 'commercial',
    targetLEED: 'Gold',
    createdAt: '2025-11-10',
    productIds: [1, 2, 3, 5, 8, 12] // 6 products
  },
  {
    id: 2,
    name: 'Portland Residence',
    description: 'Net-zero single family home',
    type: 'residential',
    targetLEED: 'Platinum',
    createdAt: '2025-10-25',
    productIds: [4, 6, 9] // 3 products
  },
  {
    id: 3,
    name: 'Vancouver School Renovation',
    type: 'commercial',
    targetLEED: 'Silver',
    createdAt: '2025-09-15',
    productIds: [1, 7, 11, 13, 15, 18, 20, 22] // 8 products
  }
];
