import { Router } from "express";
import generate from "@pdfme/generator";
import { text, rectangle, line } from "@pdfme/schemas";
import { getDb } from "./db";
import { materials, manufacturers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  specSheetTemplate,
  buildSpecSheetInputs,
} from "./templates/spec-sheet-template";
import { requireEasyAuthUser } from "./_core/request-auth";

export const specSheetRouter = Router();

specSheetRouter.get("/materials/:id/spec-sheet", async (req, res) => {
  try {
    const user = await requireEasyAuthUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const materialId = parseInt(req.params.id);
    if (isNaN(materialId)) {
      res.status(400).json({ error: "Invalid material ID" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database unavailable" });
      return;
    }

    const rows = await db
      .select({
        material: materials,
        manufacturerName: manufacturers.name,
        manufacturerWebsite: manufacturers.website,
        manufacturerHeadquarters: manufacturers.headquarters,
      })
      .from(materials)
      .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
      .where(eq(materials.id, materialId))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Material not found" });
      return;
    }

    const mat = rows[0].material;
    const mfgName = rows[0].manufacturerName;
    const mfgWebsite = rows[0].manufacturerWebsite;

    const inputs = buildSpecSheetInputs(mat, mfgName, mfgWebsite);

    const pdf = await (generate as unknown as (opts: { template: unknown; inputs: unknown[]; plugins: Record<string, unknown> }) => Promise<Uint8Array>)({
      template: specSheetTemplate,
      inputs: [inputs],
      plugins: { text, rectangle, line },
    });

    const safeName = mat.name.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 60);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="GreenChainz-SpecSheet-${safeName}.pdf"`
    );
    res.send(Buffer.from(pdf.buffer));
  } catch (err) {
    console.error("[spec-sheet] PDF generation error:", err);
    res.status(500).json({ error: "Failed to generate spec sheet" });
  }
});
