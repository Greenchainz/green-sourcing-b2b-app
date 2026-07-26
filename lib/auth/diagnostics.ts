export function redactSensitiveData(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') {
    return '[REDACTED]';
  }
  if (typeof data === 'object') {
    if (data instanceof Error) {
      return { message: data.message, name: data.name, stack: '[REDACTED]' };
    }
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (/token|secret|password|key/i.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return data;
}
/**
 * Utility functions for diagnostic logging and redaction.
 */

export function redactSensitiveData(data: any): any {
  if (!data) return data;
  if (typeof data === "string") return "[REDACTED]";
  if (Array.isArray(data)) return data.map(redactSensitiveData);
  if (typeof data === "object") {
    const redacted: any = {};
    for (const key in data) {
      if (
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("password")
      ) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactSensitiveData(data[key]);
      }
    }
    return redacted;
  }
  return data;
}

export function generateTraceId(): string {
  return require("node:crypto").randomUUID();
}

export function logAuthEvent(event: any): void {
  console.log(redactSensitiveData(event));
}

export function formatUserError(error: Error, traceId: string): any {
  return { message: "An error occurred", traceId };
}

export function incrementAuthMetric(metric: string): void {
  // no-op
}
