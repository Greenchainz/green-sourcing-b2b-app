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
