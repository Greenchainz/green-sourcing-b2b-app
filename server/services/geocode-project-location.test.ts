import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../azure-maps-service", () => ({
  geocodeAddress: vi.fn(),
}));

import { geocodeAddress } from "../azure-maps-service";
import { geocodeProjectLocation } from "./geocode-project-location";

const mockedGeocode = vi.mocked(geocodeAddress);

describe("geocodeProjectLocation", () => {
  beforeEach(() => {
    mockedGeocode.mockReset();
  });

  it("resolves coords + climate zone when Azure Maps returns coords", async () => {
    mockedGeocode.mockResolvedValueOnce({ latitude: 47.6062, longitude: -122.3321 });
    const r = await geocodeProjectLocation({ zip: "98101", state: "WA" });
    expect(r).toEqual({
      latitude: 47.6062,
      longitude: -122.3321,
      climateZone: "4C",
      source: "azure_maps",
    });
  });

  it("returns fallback with state-derived climate zone when Azure Maps yields no coords", async () => {
    mockedGeocode.mockResolvedValueOnce(null);
    const r = await geocodeProjectLocation({ city: "San Francisco", state: "CA" });
    expect(r).toEqual({
      latitude: null,
      longitude: null,
      climateZone: "3C",
      source: "fallback",
    });
  });

  it("returns source=none with no climate zone when input is empty", async () => {
    const r = await geocodeProjectLocation({});
    expect(r).toEqual({
      latitude: null,
      longitude: null,
      climateZone: null,
      source: "none",
    });
    expect(mockedGeocode).not.toHaveBeenCalled();
  });

  it("falls back gracefully when Azure Maps throws", async () => {
    mockedGeocode.mockRejectedValueOnce(new Error("network down"));
    const r = await geocodeProjectLocation({ zip: "10001", state: "NY" });
    expect(r.latitude).toBeNull();
    expect(r.longitude).toBeNull();
    expect(r.climateZone).toBe("5A");
    expect(r.source).toBe("fallback");
  });

  it("builds the query from city + state", async () => {
    mockedGeocode.mockResolvedValueOnce({ latitude: 30.27, longitude: -97.74 });
    await geocodeProjectLocation({ city: "Austin", state: "TX" });
    expect(mockedGeocode).toHaveBeenCalledWith("Austin, TX, USA");
  });

  it("prefers ZIP first in the query when present", async () => {
    mockedGeocode.mockResolvedValueOnce({ latitude: 0, longitude: 0 });
    await geocodeProjectLocation({ zip: "78701", city: "Austin", state: "TX" });
    expect(mockedGeocode).toHaveBeenCalledWith("78701, Austin, TX, USA");
  });

  it("returns null climate zone when state is unknown", async () => {
    mockedGeocode.mockResolvedValueOnce({ latitude: 0, longitude: 0 });
    const r = await geocodeProjectLocation({ city: "Toronto", state: "ON" });
    expect(r.climateZone).toBeNull();
    expect(r.source).toBe("azure_maps");
  });
});
