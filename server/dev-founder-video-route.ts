/**
 * Dev-only local storage routes for founder videos.
 * Only mounted when AZURE_STORAGE_CONNECTION_STRING is not set.
 *
 * PUT /api/dev/fv-upload/<yyyy-mm>/<videoId>.webm
 *   — Browser sends raw video/webm blob; saved to tmp/founder-videos/
 *
 * GET /api/dev/fv/<yyyy-mm>/<videoId>.webm
 *   — Streams the saved file back (used by the watch page)
 *
 * Uses router.use() (plain prefix matching) to avoid path-to-regexp v8
 * incompatibility with wildcard patterns that include slashes.
 */

import { Router, Request, Response, raw as expressRaw } from "express";
import { createReadStream, mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";

const LOCAL_DIR = path.resolve("tmp/founder-videos");

export const devFounderVideoRouter = Router();

/** Resolve blobKey to a safe absolute path (directory traversal guard). */
function safePath(blobKey: string): string | null {
  const resolved = path.resolve(LOCAL_DIR, blobKey);
  if (!resolved.startsWith(LOCAL_DIR + path.sep) && resolved !== LOCAL_DIR) return null;
  return resolved;
}

// PUT /api/dev/fv-upload/<yyyy-mm>/<videoId>.webm
// router.use() does plain prefix matching, so req.path = "/<blobKey>"
devFounderVideoRouter.use(
  "/fv-upload",
  expressRaw({ type: "*/*", limit: "500mb" }),
  (req: Request, res: Response) => {
    if (req.method !== "PUT") { res.status(405).end(); return; }

    const blobKey = req.path.replace(/^\//, "");
    if (!blobKey) { res.status(400).json({ error: "Missing blob key" }); return; }

    const filePath = safePath(blobKey);
    if (!filePath) { res.status(400).json({ error: "Invalid blob key" }); return; }

    try {
      mkdirSync(path.dirname(filePath), { recursive: true });
      const body: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? "");
      writeFileSync(filePath, body);
      console.log(`[dev-fv] saved ${blobKey} (${body.length} bytes)`);
      res.status(201).send();
    } catch (err) {
      console.error("[dev-fv] write failed:", err);
      res.status(500).json({ error: "Failed to save video" });
    }
  },
);

// GET /api/dev/fv/<yyyy-mm>/<videoId>.webm
devFounderVideoRouter.use("/fv", (req: Request, res: Response) => {
  if (req.method !== "GET") { res.status(405).end(); return; }

  const blobKey = req.path.replace(/^\//, "");
  if (!blobKey) { res.status(400).send("Missing blob key"); return; }

  const filePath = safePath(blobKey);
  if (!filePath) { res.status(400).send("Invalid blob key"); return; }

  if (!existsSync(filePath)) {
    res.status(404).send("Video not found");
    return;
  }

  res.setHeader("Content-Type", "video/webm");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-store");
  createReadStream(filePath).pipe(res);
});
