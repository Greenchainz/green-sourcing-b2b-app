import { describe, it, expect } from "vitest";
import {
  encodeWin,
  decodeWin,
  formatCo2,
  carbonEquivalences,
  buildWinPath,
  buildWinUrl,
  buildWinMeta,
  renderWinMetaTags,
  winShareText,
  winHeadline,
  MAX_WIN_PARAM_LENGTH,
  type CarbonWinData,
} from "./carbonWin";

const sample: CarbonWinData = {
  co2SavedKg: 4200,
  fromMaterial: "Portland Cement Concrete",
  toMaterial: "Low-Carbon Geopolymer Concrete",
  supplier: "EcoBuild Materials Co.",
  project: "Riverside Tower",
  savingsPct: 38,
  date: "2026-01-15",
};

describe("encodeWin / decodeWin", () => {
  it("round-trips all fields", () => {
    const token = encodeWin(sample);
    const decoded = decodeWin(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.co2SavedKg).toBe(4200);
    expect(decoded!.fromMaterial).toBe(sample.fromMaterial);
    expect(decoded!.toMaterial).toBe(sample.toMaterial);
    expect(decoded!.supplier).toBe(sample.supplier);
    expect(decoded!.project).toBe(sample.project);
    expect(decoded!.savingsPct).toBe(38);
    expect(decoded!.date).toBe("2026-01-15");
  });

  it("produces a URL-safe token (no +, /, or = padding)", () => {
    const token = encodeWin(sample);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("returns null for empty, garbage, or oversized input", () => {
    expect(decodeWin(null)).toBeNull();
    expect(decodeWin(undefined)).toBeNull();
    expect(decodeWin("")).toBeNull();
    expect(decodeWin("!!!not-base64!!!")).toBeNull();
    expect(decodeWin("a".repeat(MAX_WIN_PARAM_LENGTH + 1))).toBeNull();
  });

  it("returns null when required materials are missing", () => {
    const token = encodeWin({
      co2SavedKg: 100,
      fromMaterial: "",
      toMaterial: "",
    });
    expect(decodeWin(token)).toBeNull();
  });

  it("clamps a negative CO2 value to zero", () => {
    const token = encodeWin({ ...sample, co2SavedKg: -500 });
    expect(decodeWin(token)!.co2SavedKg).toBe(0);
  });
});

describe("formatCo2", () => {
  it("uses kg below 1000", () => {
    const r = formatCo2(850);
    expect(r.unit).toBe("kg CO₂e");
    expect(r.value).toBe("850");
  });

  it("switches to tonnes at/above 1000 kg", () => {
    const r = formatCo2(4200);
    expect(r.unit).toBe("tonnes CO₂e");
    expect(r.value).toBe("4.2");
  });

  it("never returns a negative value", () => {
    expect(formatCo2(-9).value).toBe("0");
  });
});

describe("carbonEquivalences", () => {
  it("returns the four expected comparisons with positive values", () => {
    const eq = carbonEquivalences(4200);
    expect(eq.map((e) => e.key)).toEqual(["cars", "trees", "homes", "gas"]);
    for (const e of eq) {
      expect(e.value).toBeGreaterThan(0);
      expect(typeof e.display).toBe("string");
      expect(e.label.length).toBeGreaterThan(0);
    }
  });

  it("scales linearly with carbon", () => {
    const a = carbonEquivalences(1000)[0].value;
    const b = carbonEquivalences(2000)[0].value;
    expect(b).toBeCloseTo(a * 2, 5);
  });
});

describe("URLs + share text", () => {
  it("buildWinPath starts with /win?d=", () => {
    expect(buildWinPath(sample)).toMatch(/^\/win\?d=/);
  });

  it("buildWinUrl joins origin without double slashes", () => {
    expect(buildWinUrl("https://greenchainz.com/", sample)).toMatch(
      /^https:\/\/greenchainz\.com\/win\?d=/,
    );
  });

  it("share text and headline reference the savings", () => {
    expect(winShareText(sample)).toContain(sample.toMaterial);
    expect(winShareText(sample)).toContain("GreenChainz");
    expect(winHeadline(sample)).toContain("4.2");
  });
});

describe("OpenGraph meta", () => {
  it("builds meta with an absolute url and image", () => {
    const meta = buildWinMeta("https://greenchainz.com", sample);
    expect(meta.url).toMatch(/^https:\/\/greenchainz\.com\/win\?d=/);
    expect(meta.image).toBe("https://greenchainz.com/images/og-image-homepage.jpg");
    expect(meta.title).toContain("Carbon Win");
    expect(meta.description).toContain(sample.toMaterial);
  });

  it("renders escaped tags for crawlers", () => {
    const meta = buildWinMeta("https://greenchainz.com", {
      ...sample,
      toMaterial: 'Steel "A" <special> & more',
    });
    const html = renderWinMetaTags(meta);
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).not.toContain("<special>");
    expect(html).toContain("&lt;special&gt;");
    expect(html).toContain("&amp;");
  });
});
