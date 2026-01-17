
import axios, { AxiosInstance } from 'axios';
import { RateLimiter } from './rate-limiter';

/**
 * Web Fetcher for Scraper Agent
 *
 * Handles fetching of web pages with rate limiting, retries, and HTML parsing.
 *
 * NOTE: We use Regex for HTML parsing because we are constrained to modifying only
 * files in `lib/agents/scraper/*` and cannot add new dependencies (like cheerio or jsdom)
 * to package.json. While brittle, this implementation focuses on extracting the main
 * text content which is sufficient for LLM processing.
 */
export class WebFetcher {
    private rateLimiter: RateLimiter;
    private client: AxiosInstance;

    constructor() {
        this.rateLimiter = new RateLimiter(3000); // 3 seconds delay
        this.client = axios.create({
            timeout: 15000,
            headers: {
                'User-Agent': 'GreenChainz-Bot/1.0 (+https://greenchainz.com)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
    }

    /**
     * Fetches a URL and returns the parsed text content.
     * @param url The URL to scrape
     * @returns Object containing title, content (text), and original URL
     */
    async fetchPage(url: string): Promise<{ title: string; content: string; url: string }> {
        // Enforce rate limiting
        await this.rateLimiter.waitFor(url);

        try {
            console.log(`🌐 Fetching: ${url}`);
            const response = await this.client.get(url);

            if (response.status !== 200) {
                throw new Error(`Failed to fetch ${url}: Status ${response.status}`);
            }

            const html = response.data;

            // Basic HTML cleanup using regex
            // 1. Extract title
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'No Title';

            // 2. Remove non-content tags (script, style, head, iframe, noscript, svg, path)
            // Using non-greedy match [\s\S]*? to capture multiline content
            let content = html
                .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, " ")
                .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, " ")
                .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gim, " ")
                .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gim, " ")
                .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gim, " ")
                .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gim, " ")
                .replace(/<!--[\s\S]*?-->/g, " ");

            // 3. Extract Alt text from images before stripping tags (often useful for context)
            // Replace <img ... alt="foo" ...> with " foo "
            content = content.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gim, " $1 ");

            // 4. Convert block tags to spaces to ensure separation of words
            content = content.replace(/<(div|p|br|h[1-6]|li|tr|td|section|article)[^>]*>/gim, " ");

            // 5. Remove all remaining HTML tags
            content = content.replace(/<[^>]+>/g, " ");

            // 6. Decode HTML entities
            content = content
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&[a-z]+;/g, ' '); // Remove other entities

            // 7. Clean up whitespace (multiple spaces/newlines to single space)
            content = content.replace(/\s+/g, ' ').trim();

            // Limit content length
            const maxLength = 25000;
            if (content.length > maxLength) {
                content = content.substring(0, maxLength) + '... (truncated)';
            }

            return {
                title,
                content,
                url
            };

        } catch (error: any) {
            console.error(`❌ Fetch error for ${url}:`, error.message);
            throw error;
        }
    }
}
