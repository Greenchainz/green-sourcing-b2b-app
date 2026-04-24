import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // PDF / document generation — large, rarely needed on first load
            if (
              id.includes("pdfjs-dist") ||
              id.includes("@pdfme") ||
              id.includes("jspdf") ||
              id.includes("pdf-lib") ||
              id.includes("html2canvas")
            ) {
              return "vendor-pdf";
            }
            // Charts
            if (id.includes("recharts") || id.includes("d3-") || id.includes("victory")) {
              return "vendor-charts";
            }
            // Animation
            if (id.includes("framer-motion")) {
              return "vendor-motion";
            }
            // React core
            if (id.includes("react-dom") || id.includes("react/")) {
              return "vendor-react";
            }
            // tRPC + TanStack Query
            if (
              id.includes("@trpc") ||
              id.includes("@tanstack/react-query") ||
              id.includes("superjson")
            ) {
              return "vendor-trpc";
            }
          }
        },
      },
    },
  },
  server: {
    host: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
