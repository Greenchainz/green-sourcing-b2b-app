/**
 * URL validation utilities to prevent SSRF attacks
 */

const ALLOWED_PROTOCOLS = ['https:'];
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // Cloud metadata service
  '::1', // IPv6 localhost
];

// Private IP ranges (RFC 1918)
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
];

/**
 * Validate URL to prevent SSRF attacks
 * Only allows HTTPS URLs to public domains
 */
export function validateDocumentUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return {
        valid: false,
        error: `Invalid protocol. Only HTTPS is allowed.`,
      };
    }

    // Check for blocked hosts
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return {
        valid: false,
        error: 'Access to localhost/internal hosts is not allowed',
      };
    }

    // Check for private IP ranges
    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(hostname)) {
        return {
          valid: false,
          error: 'Access to private IP addresses is not allowed',
        };
      }
    }

    // Check for link-local addresses
    if (hostname.startsWith('169.254.') || hostname.startsWith('fe80:')) {
      return {
        valid: false,
        error: 'Access to link-local addresses is not allowed',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Validate workflow name to prevent injection attacks
 */
export function validateWorkflowName(workflowName: string): { valid: boolean; error?: string } {
  const WORKFLOW_NAME_REGEX = /^[A-Za-z0-9_\- ]{1,128}$/;
  
  if (!WORKFLOW_NAME_REGEX.test(workflowName)) {
    return {
      valid: false,
      error: 'Invalid workflow name. Only alphanumeric characters, spaces, underscores, and hyphens allowed (max 128 characters)',
    };
  }

  return { valid: true };
}
