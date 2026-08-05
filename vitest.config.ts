import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// Load .env.local so DATABASE_URL and other secrets are available to tests
dotenv.config({ path: ".env.local", override: true });

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    api: false,
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "lib/**/*.test.ts",
      "shared/**/*.test.ts",
      "client/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["cobertura"],
      reportsDirectory: "coverage",
      include: [
        "server/**/*.ts",
        "lib/**/*.ts",
        "shared/**/*.ts",
        "client/src/**/*.ts",
        "client/src/**/*.tsx",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.d.ts",
      ],
    },
  },
});
