const request = require("supertest");
const app = require("../../index"); // Assuming index.js exports app

describe("Catalog API", () => {
  it("GET /api/v1/catalog/materials should return a list", async () => {
    const res = await request(app).get("/api/v1/catalog/materials").expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/catalog/materials should filter by category", async () => {
    const res = await request(app)
      .get("/api/v1/catalog/materials?category=Steel")
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // Verify only Steel items (basic check)
    res.body.forEach((item) => {
      expect(item.category).toMatch(/Steel/i);
    });
  });

  it("GET /api/v1/catalog/material/:id should return details", async () => {
    // Get id from list first
    const listRes = await request(app).get("/api/v1/catalog/materials");
    const id = listRes.body[0].id; // Assuming we have items

    const res = await request(app)
      .get(`/api/v1/catalog/material/${id}`)
      .expect(200);

    expect(res.body).toHaveProperty("id", id);
    expect(res.body).toHaveProperty("name");
  });
});
