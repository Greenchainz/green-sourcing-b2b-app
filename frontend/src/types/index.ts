export type Product = {
  id: number;
  name: string;
  views: number;
  rfqs: number;
  status: 'Active' | 'Pending Review';
  certifications: string[];
};

export type RFQ = {
  company: string;
  project: string;
  product: string;
  date: string;
  status: 'New' | 'Responded' | 'In Discussion';
};

export type Supplier = {
  name: string;
  totalProducts: number;
  rfqsThisMonth: number;
  profileViews: number;
};
