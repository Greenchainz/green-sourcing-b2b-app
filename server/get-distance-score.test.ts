import { describe, it, expect } from "vitest";
import { getDistanceScore } from "./azure-maps-service";

describe("getDistanceScore", () => {
  it("should return 20 points for distances <= 25 miles", () => {
    expect(getDistanceScore(0)).toBe(20);
    expect(getDistanceScore(10)).toBe(20);
    expect(getDistanceScore(25)).toBe(20);
  });

  it("should return 15 points for distances between 25 and 50 miles", () => {
    expect(getDistanceScore(25.1)).toBe(15);
    expect(getDistanceScore(40)).toBe(15);
    expect(getDistanceScore(50)).toBe(15);
  });

  it("should return 10 points for distances between 50 and 100 miles", () => {
    expect(getDistanceScore(50.1)).toBe(10);
    expect(getDistanceScore(75)).toBe(10);
    expect(getDistanceScore(100)).toBe(10);
  });

  it("should return 5 points for distances between 100 and 250 miles", () => {
    expect(getDistanceScore(100.1)).toBe(5);
    expect(getDistanceScore(200)).toBe(5);
    expect(getDistanceScore(250)).toBe(5);
  });

  it("should return 2 points for distances > 250 miles", () => {
    expect(getDistanceScore(250.1)).toBe(2);
    expect(getDistanceScore(300)).toBe(2);
    expect(getDistanceScore(1000)).toBe(2);
  });
});
