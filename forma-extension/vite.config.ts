import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// The extension has two entry points — left panel (search) and right panel (analysis)
export default defineConfig({
  plugins: [preact()],
  build: {
    rollupOptions: {
      input: {
        left: "left.html",
        right: "right.html",
      },
    },
  },
  server: {
    port: 8081,
    // Forma loads the extension in an iframe — allow all origins in dev
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
