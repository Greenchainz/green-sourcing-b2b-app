import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

export const uploadRouter = Router();

// ── Avatar upload ──────────────────────────────────────────────────────────
uploadRouter.post("/user/avatar", avatarUpload.single("avatar"), async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const ext = req.file.originalname.split(".").pop() ?? "jpg";
    const key = `avatars/user-${user.id}-${Date.now()}.${ext}`;
    const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);

    const { getDb } = await import("../db");
    const db = await getDb();
    if (db) {
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ avatarUrl: url }).where(eq(users.id, user.id));
    }

    res.json({ url });
  } catch (err) {
    console.error("[avatar upload]", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

uploadRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate unique file key
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const fileKey = `messaging/${timestamp}-${randomSuffix}-${req.file.originalname}`;

    // Upload to S3
    const { url } = await storagePut(
      fileKey,
      req.file.buffer,
      req.file.mimetype
    );

    res.json({ url, filename: req.file.originalname });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});
