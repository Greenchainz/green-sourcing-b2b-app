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

    const { getDb } = await import("./db");
    const db = await getDb();
    if (db) {
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ avatarUrl: url }).where(eq(users.id, user.id));
    }

    res.json({ url });
  } catch (err) {
    console.error("[avatar upload]", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ── Material image upload (supplier self-serve) ────────────────────────────
const materialImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Use JPEG, PNG, or WebP only.'));
  },
});

uploadRouter.post("/supplier/upload-image", materialImageUpload.single("file"), async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

    if (!req.file) { res.status(400).json({ error: "No file provided" }); return; }

    const materialIdRaw = req.body?.materialId;
    const materialId = materialIdRaw ? parseInt(materialIdRaw, 10) : NaN;
    if (isNaN(materialId)) { res.status(400).json({ error: "materialId required" }); return; }

    const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const blobName = `material-images/${user.id}/${materialId}/${Date.now()}.${ext}`;

    let imageUrl: string;
    try {
      const { url } = await storagePut(blobName, req.file.buffer, req.file.mimetype);
      imageUrl = url;
    } catch (storageErr) {
      console.warn("[material-image] Azure storage not configured, skipping blob upload");
      res.status(503).json({ error: "Image storage not configured. Set AZURE_STORAGE_CONNECTION_STRING." });
      return;
    }

    const { getDb } = await import("./db");
    const db = await getDb();
    if (db) {
      const { materials } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(materials as any).set({
        imageUrl,
        imageBlobName: blobName,
        imageUpdatedAt: new Date(),
      }).where(eq(materials.id, materialId));
    }

    res.json({ success: true, imageUrl, blobName, materialId });
  } catch (err) {
    console.error("[material-image upload]", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ── RFQ Spec PDF parser (Document Intelligence → LLM → ParsedRfqFields) ────────
const specUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — spec books can be large
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are accepted for spec parsing"));
  },
});

uploadRouter.post("/rfq/parse-spec", specUpload.single("spec"), async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No PDF file uploaded" });
      return;
    }

    const { parseSpecPdf } = await import("./services/document-intelligence");
    const fields = await parseSpecPdf(req.file.buffer);

    console.log(
      `[parse-spec] user=${user.id} file="${req.file.originalname}" ` +
      `size=${req.file.size} confidence=${fields.confidence} ` +
      `fields=[${fields.fieldsFound.join(",")}]`
    );

    res.json(fields);
  } catch (err) {
    console.error("[parse-spec]", err);
    res.status(500).json({ error: "Spec parsing failed" });
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
