
/**
 * Rate Limiter for Scraper Agent
 *
 * Ensures we don't overwhelm external servers by limiting request frequency per domain.
 */
export class RateLimiter {
    private lastRequestTime: Map<string, number> = new Map();
    private defaultDelay: number;

    constructor(defaultDelayMs: number = 2000) {
        this.defaultDelay = defaultDelayMs;
    }

    /**
     * Waits until it is safe to make a request to the given domain.
     * @param url The URL to check against.
     */
    async waitFor(url: string): Promise<void> {
        const domain = this.getDomain(url);
        const now = Date.now();
        const lastTime = this.lastRequestTime.get(domain) || 0;
        const timeSinceLast = now - lastTime;

        if (timeSinceLast < this.defaultDelay) {
            const waitTime = this.defaultDelay - timeSinceLast;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime.set(domain, Date.now());
    }

    private getDomain(url: string): string {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname;
        } catch {
            return "unknown";
        }
    }
}
