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

declare module 'next/link' {
  const Link: any;
  export default Link;
}

declare module 'next/image' {
  const Image: any;
  export default Image;
}

declare module '@/app/app.auth' {
  export const signIn: any;
  export const signOut: any;
  export const auth: any;
}
