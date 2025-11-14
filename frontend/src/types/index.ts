// frontend/src/types/index.ts

/**
 * @interface RFQ
 * @description Defines the structure for a Request for Quote object.
 */
export interface RFQ {
  buyer_id: string;      // UUID of the user sending the RFQ
  product_id: string;    // UUID of the product being requested
  project_name: string;
  quantity: number;
  message: string;
}
