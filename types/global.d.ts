declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};

declare module 'next/server' {
  export type NextRequest = any;
  export const NextResponse: any;
}
