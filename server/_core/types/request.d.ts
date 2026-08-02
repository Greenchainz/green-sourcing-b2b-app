/**
 * Narrow pino-http's augmented req.id back to string.
 *
 * pino-http augments http.IncomingMessage.id as ReqId (= number | string | object).
 * All existing server code relies on req.id being a string — our own
 * createRequestIdMiddleware always assigns a UUID string via uuidv4().
 *
 * Re-declaring the property as string here is accurate and safe.
 */
declare module "http" {
  interface IncomingMessage {
    // Override pino-http's ReqId (string | number | object) back to string.
    // createRequestIdMiddleware always assigns a UUID string.
    id: string;
  }
}
