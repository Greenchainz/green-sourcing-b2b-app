
// frontend/src/types/database.ts

export interface User {
  UserID: number;
  Email?: string;
  PasswordHash?: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  Role: 'Admin' | 'Buyer' | 'Supplier';
  CompanyID?: number;
  OAuthProvider?: string;
  OAuthID?: string;
  LastLogin?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface Company {
  CompanyID: number;
  CompanyName?: string;
  Address?: string;
  Industry?: string;
  Website?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface Supplier {
  SupplierID: number;
  CompanyID?: number;
}

export interface SupplierProfile {
  ProfileID: number;
  SupplierID?: number;
  Description?: string;
  ESG_Summary?: string;
}

export interface Certification {
  CertificationID: number;
  Name: string;
  CertifyingBody?: string;
}

export interface ProductCategory {
  CategoryID: number;
  CategoryName: string;
  Description?: string;
}

export interface Product {
  ProductID: number;
  SupplierID?: number;
  ProductName: string;
  Description?: string;
  CategoryID?: number;
  SKU?: string;
  UnitPrice?: number;
  Currency?: string;
  LeadTimeDays?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
}
