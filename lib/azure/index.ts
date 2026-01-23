/**
 * Azure SDK Integrations for GreenChainz B2B Platform
 * 
 * This module re-exports all Azure service clients for convenient importing.
 * GreenChainz is 100% Azure-native.
 * 
 * Usage:
 * ```typescript
 * import { 
 *   // Blob Storage
 *   uploadBlob, downloadBlob, getBlobServiceClient,
 *   
 *   // Azure SQL
 *   runQuery, runQueryOne, getAzureSQLPool,
 *   
 *   // PostgreSQL
 *   query, queryOne, getPostgresPool,
 *   
 *   // OpenAI (GPT-4o)
 *   chat, simpleChat, streamChat, getOpenAIClient,
 *   
 *   // Document Intelligence
 *   analyzeDocument, extractEPDData,
 *   
 *   // Utilities
 *   withRetry, sleep,
 * } from '@/lib/azure';
 * ```
 */

// ============================================================================
// CONFIG AND UTILITIES
// ============================================================================

export {
  // Retry utilities
  withRetry,
  sleep,
  calculateBackoffDelay,
  isTransientError,
  type RetryOptions,
  
  // Azure SQL Database
  getAzureSQLPool,
  runQuery,
  runQueryOne,
  runScalar,
  closeSQLPool,
  resetSQLPool,
  sqlHealthCheck,
  isAzureSQLConfigured,
  type SqlParameterValue,
  
  // Legacy Blob Storage (deprecated - use blob-storage.ts)
  getBlobServiceClient,
  getBlobContainer,
  uploadFileToBlob,
} from "./config";

// ============================================================================
// BLOB STORAGE
// ============================================================================

export {
  // Client
  getBlobServiceClient as getStorageClient,
  getContainer,
  resetBlobServiceClient,
  
  // Upload operations
  uploadBlob,
  uploadBlobFromStream,
  type BlobUploadOptions,
  type BlobUploadResult,
  
  // Download operations
  downloadBlob,
  blobExists,
  
  // Delete operations
  deleteBlob,
  
  // List operations
  listBlobs,
  
  // SAS tokens
  generateBlobSasUrl,
  type SASTokenOptions,
} from "./blob-storage";

// ============================================================================
// POSTGRESQL
// ============================================================================

export {
  // Connection pool
  getPostgresPool,
  closePostgresPool,
  resetPostgresPool,
  isPostgresConfigured,
  
  // Query utilities
  query,
  queryOne,
  queryAll,
  queryScalar,
  type QueryOptions,
  
  // Transactions
  withTransaction,
  getClient,
  type TransactionOptions,
  
  // Batch operations
  batchQuery,
  bulkInsert,
  
  // Health check
  healthCheck as postgresHealthCheck,
  
  // Types
  type PostgresConfig,
} from "./postgres";

// ============================================================================
// AZURE OPENAI (GPT-4o)
// ============================================================================

export {
  // Client
  getOpenAIClient,
  resetOpenAIClient,
  isOpenAIConfigured,
  type OpenAIConfig,
  
  // Chat completions
  chat,
  simpleChat,
  type ChatOptions,
  type ChatResponse,
  
  // Streaming
  streamChat,
  type StreamChunk,
  
  // GreenChainz-specific functions
  auditProductSustainability,
  analyzeEPDDocument,
  generateRFQResponse,
  
  // Embeddings
  generateEmbedding,
} from "./openai";

// ============================================================================
// DOCUMENT INTELLIGENCE
// ============================================================================

export {
  // Client
  getDocumentClient,
  resetDocumentClient,
  isDocumentIntelligenceConfigured,
  type DocumentIntelligenceConfig,
  
  // Document analysis
  analyzeDocument,
  analyzeDocumentFromUrl,
  type DocumentAnalysisOptions,
  type ExtractedDocument,
  type ExtractedTable,
  type ExtractedKeyValue,
  
  // EPD extraction
  extractEPDData,
  type EPDExtraction,
  
  // Invoice processing
  extractInvoiceData,
} from "./document-intelligence";
