/**
 * GreenChainz Backend API Client
 * 
 * Communicates with the Azure Container Apps backend
 * Base URL: https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  'https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io';

/**
 * Base fetch wrapper with error handling and auth
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Send cookies for auth
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(
        `API Error (${response.status}): ${errorText || response.statusText}`
      );
      // Don't log 401s - expected for unauthenticated users on public pages
      if (response.status !== 401) {
        console.error(`API request failed: ${endpoint}`, err);
      }
      throw err;
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;
    
    return JSON.parse(text) as T;
  } catch (error) {
    // Only log non-auth errors (401s already handled above)
    if (!(error instanceof Error && error.message.includes('API Error (401)'))) {
      console.error(`API request failed: ${endpoint}`, error);
    }
    throw error;
  }
}

/**
 * GET request
 */
function get<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
function post<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
function put<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request
 */
function patch<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
function del<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'DELETE' });
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Health check
 */
export async function checkHealth() {
  return get<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    azure?: {
      keyVault: boolean;
      appConfig: boolean;
    };
  }>('/api/health');
}

/**
 * Get current user — reads from our backend /api/auth/me which
 * internally parses the Easy Auth X-MS-CLIENT-PRINCIPAL header.
 * Falls back to the Easy Auth /.auth/me endpoint if the backend
 * route is unavailable.
 */
export async function getCurrentUser() {
  try {
    // Primary: our backend normalises the Easy Auth principal into
    // a consistent shape that includes the app-level role.
    const response = await get<{
      user: {
        id: string;
        email: string;
        name: string;
        roles: string[];
        isAdmin: boolean;
        isSupplier: boolean;
      };
    }>('/api/auth/me');

    const { user } = response;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user.isAdmin ? 'admin' : user.isSupplier ? 'supplier' : 'buyer') as 'buyer' | 'supplier' | 'admin',
    };
  } catch {
    // Fallback: call Easy Auth directly (useful during initial setup
    // before the backend /api/auth/me route is wired up).
    const res = await fetch('/.auth/me', { credentials: 'include' });
    if (!res.ok) throw new Error('Not authenticated');

    const data = await res.json();
    // Easy Auth returns an array; first element is the logged-in principal
    const principal = Array.isArray(data) ? data[0] : data?.clientPrincipal;
    if (!principal) throw new Error('Not authenticated');

    const claims: Record<string, string> = {};
    for (const c of principal.claims ?? []) {
      claims[c.typ] = c.val;
    }

    return {
      id: principal.userId ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? '',
      email: claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? claims.email ?? '',
      name: claims['name'] ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? '',
      role: 'buyer' as 'buyer' | 'supplier' | 'admin',
    };
  }
}

/**
 * Set user role
 */
export async function setUserRole(role: 'buyer' | 'supplier' | 'admin') {
  return post<{ success: boolean }>('/api/user/set-role', { role });
}

/**
 * Get suppliers list
 */
export async function getSuppliers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  verified?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.search) query.set('search', params.search);
  if (params?.verified !== undefined) query.set('verified', params.verified.toString());
  
  const queryString = query.toString();
  return get<{
    suppliers: Array<{
      id: string;
      name: string;
      verified: boolean;
      tier: 'free' | 'basic' | 'premium';
      productCount: number;
    }>;
    total: number;
    page: number;
    limit: number;
  }>(`/api/supplier${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get supplier by ID
 */
export async function getSupplier(id: string) {
  return get<{
    id: string;
    name: string;
    email: string;
    verified: boolean;
    tier: 'free' | 'basic' | 'premium';
    description: string;
    website: string;
    products: Array<{
      id: string;
      name: string;
      category: string;
      embodiedCarbon: number;
      certifications: string[];
    }>;
    locations: Array<{
      id: string;
      address: string;
      city: string;
      state: string;
      country: string;
    }>;
  }>(`/api/supplier/${id}`);
}

/**
 * Get supplier dashboard data
 */
export async function getSupplierDashboard() {
  return get<{
    stats: {
      totalRFQs: number;
      activeRFQs: number;
      responseRate: number;
      avgResponseTime: number;
    };
    recentRFQs: Array<{
      id: string;
      title: string;
      buyer: string;
      status: 'pending' | 'responded' | 'accepted' | 'rejected';
      createdAt: string;
    }>;
  }>('/api/supplier/dashboard');
}

/**
 * Get supplier RFQs
 */
export async function getSupplierRFQs(params?: {
  status?: 'pending' | 'responded' | 'accepted' | 'rejected';
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  
  const queryString = query.toString();
  return get<{
    rfqs: Array<{
      id: string;
      title: string;
      description: string;
      buyer: {
        id: string;
        name: string;
        email: string;
      };
      materials: Array<{
        name: string;
        quantity: number;
        unit: string;
      }>;
      status: 'pending' | 'responded' | 'accepted' | 'rejected';
      createdAt: string;
      deadline: string;
    }>;
  }>(`/api/supplier/rfqs${queryString ? `?${queryString}` : ''}`);
}

/**
 * Verify supplier
 */
export async function verifySupplier(id: string) {
  return post<{ success: boolean }>(`/api/supplier/${id}/verify`);
}

/**
 * Reject supplier
 */
export async function rejectSupplier(id: string, reason: string) {
  return post<{ success: boolean }>(`/api/supplier/${id}/reject`, { reason });
}

/**
 * Generate submittal
 */
export async function generateSubmittal(data: {
  projectName: string;
  specFile: File;
  materials: string[];
}) {
  const formData = new FormData();
  formData.append('projectName', data.projectName);
  formData.append('specFile', data.specFile);
  formData.append('materials', JSON.stringify(data.materials));

  const response = await fetch(`${BACKEND_URL}/api/submittal/generate`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Submittal generation failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }>;
}

/**
 * Check submittal status
 */
export async function getSubmittalStatus(jobId: string) {
  return get<{
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string;
    error?: string;
  }>(`/api/submittal/status/${jobId}`);
}

/**
 * Extract document
 */
export async function extractDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BACKEND_URL}/api/extract-document`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Document extraction failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    materials: Array<{
      name: string;
      manufacturer: string;
      category: string;
      specifications: Record<string, string>;
    }>;
  }>;
}

/**
 * Run Excel batch audit
 */
export async function runExcelAudit(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BACKEND_URL}/api/audit/excel-batch`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Excel audit failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    results: Array<{
      materialName: string;
      embodiedCarbon: number;
      healthScore: number;
      certifications: string[];
      alternatives: Array<{
        name: string;
        embodiedCarbon: number;
        savings: number;
      }>;
    }>;
  }>;
}

/**
 * Scrape materials
 */
export async function scrapeMaterials(url: string) {
  return post<{
    materials: Array<{
      name: string;
      manufacturer: string;
      category: string;
      price: number;
    }>;
  }>('/api/scrape/materials', { url });
}

/**
 * Scrape suppliers
 */
export async function scrapeSuppliers(query: string) {
  return post<{
    suppliers: Array<{
      name: string;
      website: string;
      description: string;
      products: string[];
    }>;
  }>('/api/scrape/suppliers', { query });
}

/**
 * Scrape EPD data
 */
export async function scrapeEPD(productName: string) {
  return post<{
    epd: {
      number: string;
      manufacturer: string;
      product: string;
      gwp: number;
      unit: string;
      expiryDate: string;
      programOperator: string;
    } | null;
  }>('/api/scrape/epd', { productName });
}

// Export all functions as a single API object
export const api = {
  checkHealth,
  getCurrentUser,
  setUserRole,
  getSuppliers,
  getSupplier,
  getSupplierDashboard,
  getSupplierRFQs,
  verifySupplier,
  rejectSupplier,
  generateSubmittal,
  getSubmittalStatus,
  extractDocument,
  runExcelAudit,
  scrapeMaterials,
  scrapeSuppliers,
  scrapeEPD,
};

export default api;
