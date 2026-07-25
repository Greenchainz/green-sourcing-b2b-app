import { describe, expect, it } from "vitest";
import { buildCsi15CFilename } from "./csi-form-1-5c-generator";

describe("CSI 1.5C filename builder", () => {
  it("creates a download-safe filename", () => {
    const filename = buildCsi15CFilename("Tower A / East", 42);
    expect(filename).toContain("CSI-1.5C_Tower-A-East_Validation-42_");
    expect(filename.endsWith(".pdf")).toBe(true);
  });
});
