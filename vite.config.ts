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
          if (!id.includes("node_modules")) return;

          // Core React runtime — must be synchronously available
          if (/\/node_modules\/react(-dom)?\//i.test(id)) {
            return "vendor-react";
          }

          // tRPC + data-fetching stack
          if (
            id.includes("@trpc") ||
            id.includes("@tanstack/react-query") ||
            id.includes("superjson")
          ) {
            return "vendor-trpc";
          }

          // Radix UI primitives — large collection, defer to its own chunk
          if (id.includes("@radix-ui/")) {
            return "vendor-radix";
          }

          // Charting — recharts + d3 deps — only used on dashboard pages
          if (
            id.includes("recharts") ||
            id.includes("/d3-") ||
            id.includes("victory-")
          ) {
            return "vendor-charts";
          }

          // Icon library — large but tree-shakeable; keep separate so it can
          // be cached independently of UI primitives
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }

          // Form handling
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform/")
          ) {
            return "vendor-forms";
          }

          // Date / time utilities
          if (id.includes("date-fns")) {
            return "vendor-dates";
          }

          // PDF generation — heavy, only used in a few pages
          if (id.includes("@pdfme/") || id.includes("pdfkit")) {
            return "vendor-pdf";
          }

          // Routing + styling utilities — small, but keep separate from React
          if (
            id.includes("wouter") ||
            id.includes("clsx") ||
            id.includes("class-variance-authority") ||
            id.includes("tailwind-merge")
          ) {
            return "vendor-utils";
          }
        },
      },
    },
    // Only preload chunks needed on every initial page load.
    // vendor-charts (recharts 465 KiB), vendor-radix (168 KiB), and
    // vendor-icons (32 KiB) are only used by specific pages/components —
    // removing them from preload saves ~665 KiB on the critical path.
    // They still load on-demand when the pages that need them are visited.
    modulePreload: {
      resolveDependencies: (_filename: string, deps: string[]) =>
        deps.filter(
          (dep) =>
            !dep.includes("vendor-charts") &&
            !dep.includes("vendor-radix") &&
            !dep.includes("vendor-icons") &&
            !dep.includes("vendor-forms") &&
            !dep.includes("vendor-dates") &&
            !dep.includes("vendor-pdf")
        ),
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
