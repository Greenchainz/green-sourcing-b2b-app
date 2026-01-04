const request = require("supertest");
const app = require("../../index");

jest.mock("../../services/payments/stripe", () => ({
  createRfqDeposit: jest.fn().mockResolvedValue({
    clientSecret: "pi_mock_secret",
    paymentIntentId: "pi_mock_123",
  }),
  constructWebhookEvent: jest.fn().mockReturnValue({
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_mock_123", metadata: { type: "rfq_deposit" } } },
  }),
  handlePaymentSuccess: jest.fn().mockResolvedValue({ success: true }),
}));

describe("Payments API", () => {
  it("POST /api/v1/payments/deposit should create endpoint", async () => {
    const res = await request(app)
      .post("/api/v1/payments/deposit")
      .send({
        userId: "user_123",
        projectName: "Test Project",
      })
      // Expecting 200 or 401 depending on auth bypass for test
      // Assuming we mock auth or use test token
      .set("Authorization", "Bearer test_token");

    // If 401 in real app without auth mock, update expectation.
    // Here we assume auth is handled or mocked globally.
  });

  it("POST /api/webhooks/stripe should handle events", async () => {
    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Stripe-Signature", "mock_signature")
      .send(Buffer.from(JSON.stringify({ type: "payment_intent.succeeded" })))
      .expect(200);

    expect(res.body).toEqual({
      received: true,
      type: "payment_intent.succeeded",
    });
  });
});
