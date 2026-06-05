import { describe, expect, it } from "vitest";
import {
  EWS_ASSEMBLY_MAPPINGS,
  getAssemblyMappingByCode,
  getAssemblyMappingByType,
} from "./masterformat-mapping";

describe("masterformat mapping", () => {
  it("maps EWS codes to real MasterFormat sections", () => {
    expect(EWS_ASSEMBLY_MAPPINGS["EWS-1A"].masterformatSection).toBe("08 44 13");
    expect(EWS_ASSEMBLY_MAPPINGS["EWS-5"].masterformatSection).toBe("07 42 13");
  });

  it("resolves mapping by assembly code", () => {
    const mapping = getAssemblyMappingByCode("EWS-3B");
    expect(mapping?.assemblyType).toBe("UHPC");
    expect(mapping?.masterformatSection).toBe("03 45 00");
  });

  it("resolves mapping by assembly type", () => {
    const mapping = getAssemblyMappingByType("Granite Panel");
    expect(mapping?.masterformatSection).toBe("04 42 00");
    expect(mapping?.categories.length).toBeGreaterThan(0);
  });
});
