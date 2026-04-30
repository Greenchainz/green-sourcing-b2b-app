declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

// Augment Express Request with the `id` field set by createRequestIdMiddleware
declare namespace Express {
  interface Request {
    /** UUID assigned by createRequestIdMiddleware in server/_core/index.ts */
    id: string;
  }
}

declare module 'mssql' {
  export type config = any;
  export type ConnectionPool = any;
  export function connect(config: any): Promise<ConnectionPool>;
  const content: any;
  export = content;
}

declare module '@azure/ai-projects' {
  export const AIProjectClient: any;
  export default AIProjectClient;
}

declare module 'uuid' {
  export function v4(options?: any, buf?: any, offset?: any): string;
  export function v1(options?: any, buf?: any, offset?: any): string;
  export function v3(name: string | Uint8Array, namespace: string | Uint8Array, buf?: any, offset?: any): string;
  export function v5(name: string | Uint8Array, namespace: string | Uint8Array, buf?: any, offset?: any): string;
}
