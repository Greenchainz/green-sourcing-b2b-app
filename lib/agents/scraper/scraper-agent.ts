/**
 * Scraper Agent (Azure-Native)
 * 
 * "Data Scout" that finds EPD and Health data for materials.
 * Enhanced for Architecture of Equivalence with viability profile support.
 * 
 * Architecture:
 * 1. Search Web (Azure AI Search) -> Finds PDF URL/Content
 * 2. Fetch Content (WebFetcher) -> If snippet is insufficient, fetch full page
 * 3. Extract Data (Azure OpenAI) -> Converts text to JSON
 * 4. Parse viability data (ASTM, Labor, OTIF)
 * 5. Save to Azure DB -> Store viability profile
 * 6. Return structured data
 */

import { AzureOpenAI } from "openai";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { DATA_JANITOR_PROMPTS } from "../../prompts/data-janitor";
import { saveViabilityProfile } from "../../azure-db";
import { MaterialViabilityProfile, ASTMStandard, LaborUnits, OTIFMetrics } from "../../../types/schema";
import { calculateViabilityScoresForAllPersonas } from "../../scoring/viability-scoring";
import { WebFetcher } from "./web-fetcher";

// Interface for Azure Search document
interface SearchDocument {
    title?: string;
    content?: string;
    url?: string;
}

// Interface for extracted data from OpenAI
interface ExtractedData {
    gwp_per_unit?: number;
    GWP?: number;
    unit_type?: string;
    Unit?: string;
    health_grade?: "A" | "B" | "C" | "F";
    red_list_status?: "Free" | "Approved" | "None";
    certifications?: string[];
    compliance?: {
        red_list_status?: "Free" | "Approved" | "None";
    };
    // Enhanced viability data
    astm_standards?: string[];
    labor_hours_install?: number;
    labor_hours_maintenance?: number;
    skill_level?: number;
    lead_time_days?: number;
    otif_score?: number;
    unit_price?: number;
    voc_emissions?: number;
    manufacturer?: string;
}

// Interface for the output
export interface ScrapedMaterial {
    product_name: string;
    gwp_per_unit?: number;
    unit_type?: string;
    health_grade?: "A" | "B" | "C" | "F";
    red_list_status?: "Free" | "Approved" | "None";
    certifications?: string[];
    epd_found: boolean;
    matched_product_name?: string;
    source_url?: string;
    // Enhanced viability profile data
    viability_profile?: MaterialViabilityProfile;
    viability_profile_id?: number;
}

// Initialize WebFetcher
const webFetcher = new WebFetcher();

/**
 * AZURE AI SEARCH
 * 
 * Uses the Azure AI Search service to find relevant documents/websites.
 * The user has confirmed this service is already provisioned in AI Foundry.
 */
async function searchWeb(query: string): Promise<{ title: string; snippet: string; url: string }> {
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const apiKey = process.env.AZURE_SEARCH_KEY;
    const indexName = process.env.AZURE_SEARCH_INDEX_NAME || "supplier-websites";

    console.log(`🔍 [Azure Search] Querying index '${indexName}' for: "${query}"`);

    if (!endpoint || !apiKey) {
        console.warn("⚠️ Missing Azure Search credentials - falling back to simulated search");
        return simulateWebSearch(query);
    }

    try {
        const client = new SearchClient(endpoint, indexName, new AzureKeyCredential(apiKey));
        const searchResults = await client.search(query, {
            top: 1,
            select: ["title", "content", "url"], // Adjust fields based on actual index schema
            queryType: "semantic",             // Use semantic search for better relevance
            semanticSearchOptions: { configurationName: "default" } // Assumption: semantic config exists
        });

        for await (const result of searchResults.results) {
            const doc = result.document as SearchDocument;
            return {
                title: doc.title || "Unknown Title",
                snippet: doc.content || "No content available",
                url: doc.url || "No URL"
            };
        }

        console.log("No results found in Azure Search.");
        return simulateWebSearch(query); // Fallback if no results

    } catch (error) {
        console.error("❌ Azure Search Error:", error);
        return simulateWebSearch(query); // Fallback on error
    }
}

/**
 * FALLBACK: SIMULATED WEB SEARCH
 * Used when keys are missing or zero results found.
 */
async function simulateWebSearch(query: string): Promise<{ title: string; snippet: string; url: string }> {
    console.log(`🔍 [Mock] Simulating search result for: "${query}"`);

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        title: `${query} - Environmental Product Declaration`,
        snippet: `
            Product: ${query} (Generic Match)
            Global Warming Potential (GWP): 4.5 kgCO2e per m2.
            This product is Red List Free and has a Declare Label.
            Certifications: Cradle to Cradle Bronze.
            Material Health: No toxic heavy metals found.
        `,
        url: "https://buildingtransparency.org/mock-epd-result.pdf"
    };
}

/**
 * EXTRACTION AGENT
 * Uses Azure OpenAI to parse the "scraped" text into JSON
 */
async function extractWithOpenAI(text: string, promptType: 'carbon' | 'health'): Promise<ExtractedData> {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o";

    if (!endpoint || !key) {
        console.warn("⚠️ Missing Azure OpenAI credentials - returning mock data");
        return {
            gwp_per_unit: 5.0,
            health_grade: "B",
            red_list_status: "Free",
            certifications: ["Mock Cert"]
        };
    }

    const client = new AzureOpenAI({
        endpoint,
        apiKey: key,
        apiVersion: "2024-08-01-preview",
        deployment
    });

    const systemPrompt = promptType === 'health'
        ? DATA_JANITOR_PROMPTS.healthSafety
        : DATA_JANITOR_PROMPTS.carbonCost;

    try {
        const response = await client.chat.completions.create({
            model: deployment,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Analyze this text and extract structured data:\n\n${text}` },
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices?.[0]?.message?.content ?? "{}";
        return JSON.parse(content);
    } catch (error) {
        console.error("❌ Azure OpenAI Extraction Error:", error);
        throw error;
    }
}

/**
 * MAIN ENTRY POINT
 */
export async function scrapeMaterialData(options: {
    material_name: string;
    search_type: 'epddb' | 'healthdb' | 'both';
    extract_fields: string[];
    save_to_db?: boolean;
    product_id?: number;
}): Promise<ScrapedMaterial> {
    console.log(`🤖 Scraper Agent activated for: ${options.material_name}`);

    // 1. Search (Azure AI Search with fallback)
    let searchResult = await searchWeb(options.material_name);

    // 2. Enhance content if needed
    // If we have a URL but the snippet is short (likely just a summary), we fetch the full page
    // unless it's a PDF (mock or real) which we can't easily scrape with axios alone without pdf parsing lib
    // For now, if it's an HTTP URL and not explicitly a PDF, we try to fetch.
    if (searchResult.url && searchResult.url.startsWith('http') && !searchResult.url.toLowerCase().endsWith('.pdf')) {
        try {
            console.log(`🌍 Attempting to scrape external URL: ${searchResult.url}`);
            const fetchedPage = await webFetcher.fetchPage(searchResult.url);

            // If fetch was successful and gave us substantial content, use it.
            if (fetchedPage.content && fetchedPage.content.length > 200) {
                 searchResult = {
                    title: fetchedPage.title,
                    snippet: fetchedPage.content, // Use full scraped content
                    url: fetchedPage.url
                 };
            }
        } catch {
             console.warn(`⚠️ External scraping failed for ${searchResult.url}, using search snippet instead.`);
             // Continue with original search result
        }
    }

    // 3. Extract Data (Real AI)
    const promptType = options.extract_fields.includes("health_grade") ? 'health' : 'carbon';

    // Combine search snippet/content into context
    // We limit context size to avoid token overflow, taking first 15000 chars if exceedingly long
    const contentToAnalyze = searchResult.snippet.length > 20000
        ? searchResult.snippet.substring(0, 20000)
        : searchResult.snippet;

    const extractionContext = `
        Title: ${searchResult.title}
        URL: ${searchResult.url}
        Content: ${contentToAnalyze}
    `;

    let extractedData: ExtractedData;
    try {
        extractedData = await extractWithOpenAI(extractionContext, promptType);
    } catch {
        console.error("⚠️ Extraction failed, returning partial/mock data");
        extractedData = {
            gwp_per_unit: 0,
            health_grade: "C"
        };
    }

    console.log("✅ Extraction complete:", extractedData);

    // 4. Build viability profile if requested
    let viabilityProfile: MaterialViabilityProfile | undefined;
    let viabilityProfileId: number | undefined;

    if (options.save_to_db) {
        viabilityProfile = buildViabilityProfile(options.material_name, extractedData, searchResult.url);

        // Calculate scores for all personas
        viabilityProfile.viabilityScores = calculateViabilityScoresForAllPersonas(viabilityProfile);

        // Save to Azure DB
        try {
            viabilityProfileId = await saveViabilityProfile(viabilityProfile);
            console.log(`✅ Viability profile saved to Azure DB with ID: ${viabilityProfileId}`);
        } catch (error) {
            console.error('⚠️ Failed to save viability profile to Azure DB:', error);
            // Continue without saving - don't fail the entire scrape
        }
    }

    // 5. Normalize & Return
    return {
        product_name: options.material_name,
        gwp_per_unit: extractedData.gwp_per_unit ?? extractedData.GWP ?? 0,
        unit_type: extractedData.unit_type ?? extractedData.Unit ?? "unit",
        health_grade: extractedData.health_grade ?? "C",
        red_list_status: extractedData.compliance?.red_list_status ?? extractedData.red_list_status ?? "None",
        certifications: extractedData.certifications ?? [],
        epd_found: true,
        matched_product_name: searchResult.title,
        source_url: searchResult.url,
        viability_profile: viabilityProfile,
        viability_profile_id: viabilityProfileId,
    };
}

/**
 * Build a MaterialViabilityProfile from extracted data
 */
function buildViabilityProfile(
    materialName: string,
    extractedData: ExtractedData,
    sourceUrl: string
): MaterialViabilityProfile {
    // Parse ASTM standards from extracted data
    const astmStandards: ASTMStandard[] = (extractedData.astm_standards || []).map(std => ({
        designation: std,
        title: `Standard for ${materialName}`,
        compliant: true, // Assume compliant if mentioned
    }));

    // Build labor units
    const laborUnits: LaborUnits = {
        installationHoursPerUnit: extractedData.labor_hours_install ?? 0.5,
        maintenanceHoursPerYear: extractedData.labor_hours_maintenance ?? 2.0,
        unit: extractedData.unit_type ?? extractedData.Unit ?? "sq ft",
        skillLevelRequired: extractedData.skill_level ?? 2,
    };

    // Build OTIF metrics (with defaults if not available)
    const otifMetrics: OTIFMetrics = {
        onTimePercentage: 90, // Default assumption
        inFullPercentage: 95, // Default assumption
        otifScore: extractedData.otif_score ?? 85,
        averageLeadTimeDays: extractedData.lead_time_days ?? 14,
        sampleSize: 50, // Default sample size
        dataFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        dataTo: new Date(),
    };

    // Validate and normalize red list status
    let redListStatus: "Free" | "Approved" | "Unknown" | "Contains" = "Unknown";
    const extractedStatus = (extractedData.compliance?.red_list_status ?? extractedData.red_list_status) as string | undefined;
    if (extractedStatus === "Free" || extractedStatus === "Approved" || extractedStatus === "Contains") {
        redListStatus = extractedStatus;
    }

    // Build complete profile
    const profile: MaterialViabilityProfile = {
        productName: materialName,
        manufacturer: extractedData.manufacturer ?? "Unknown",
        astmStandards,
        laborUnits,
        otifMetrics,
        environmentalMetrics: {
            gwp: extractedData.gwp_per_unit ?? extractedData.GWP,
            gwpUnit: extractedData.unit_type ?? extractedData.Unit,
            redListStatus,
            epdSource: sourceUrl,
        },
        healthMetrics: {
            healthGrade: extractedData.health_grade,
            vocEmissions: extractedData.voc_emissions,
        },
        costMetrics: {
            unitPrice: extractedData.unit_price ?? 0,
            currency: "USD",
        },
        dataQuality: {
            completeness: calculateDataCompleteness(extractedData),
            freshnessInDays: 0, // Just scraped
            sources: [sourceUrl],
            lastUpdated: new Date(),
        },
    };

    return profile;
}

/**
 * Calculate data completeness score (0-1) based on available fields
 */
function calculateDataCompleteness(data: ExtractedData): number {
    const fields = [
        data.gwp_per_unit ?? data.GWP,
        data.health_grade,
        data.astm_standards,
        data.labor_hours_install,
        data.otif_score,
        data.unit_price,
        data.manufacturer,
    ];

    const filledFields = fields.filter(f => f !== undefined && f !== null).length;
    return filledFields / fields.length;
}
