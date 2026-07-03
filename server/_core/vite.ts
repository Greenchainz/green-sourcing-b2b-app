import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const HASHED_ASSET_MIN_LENGTH = 8;

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  // Express v5: bare * must be named — {*path} is an optional catch-all
  app.use("{*path}", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip /api routes (Express) and /.auth (legacy/reserved path)
    if (url.startsWith("/api") || url.startsWith("/.auth")) {
      res.status(404).json({ error: "Route not found", path: url });
      return;
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // esbuild bundles all server code into dist/index.js (flat, no subdirs).
  // In prod: import.meta.dirname = /app/dist/ → "public" = /app/dist/public/ (Vite output)
  // In dev:  import.meta.dirname = <repo>/server/_core/ → need "../../dist/public"
  const distPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(import.meta.dirname, "public")
      : path.resolve(import.meta.dirname, "../..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        const normalized = filePath.replace(/\\/g, "/");
        const fileName = path.basename(normalized);
        const isHashedAsset =
          normalized.includes("/assets/") &&
          new RegExp(
            `(?:-|\\.)[A-Za-z0-9]{${HASHED_ASSET_MIN_LENGTH},}\\.(js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)$`
          ).test(fileName);

        if (isHashedAsset) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }

        res.setHeader("Cache-Control", "no-cache");
      },
    })
  );

  // fall through to index.html if the file doesn't exist
  // IMPORTANT: skip /api routes so they are handled by Express, not the SPA catch-all
  // Express v5: bare * must be named — {*path} is an optional catch-all
  app.use("{*path}", (req, res) => {
    if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/.auth")) {
      res.status(404).json({ error: "Route not found", path: req.originalUrl });
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
