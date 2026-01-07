/**
 * Submittal Generator Agent
 * 
 * Orchestrates the PDF parsing, requirement extraction, product matching,
 * and PDF package generation for contractor submittals.
 */

interface SpecRequirements {
    materialType: string | null;
    maxCarbon?: number | null;
    minRecycledPercent?: number | null;
    standards: string[];
    certifications: string[];
}

interface Product {
    ProductID: number;
    ProductName: string;
    SupplierID: number;
    CategoryName: string | null;
    GlobalWarmingPotential: number | null;
    EPDDocumentURL: string | null;
}

/**
 * Parse and extract structured requirements from spec text
 * This is called by the API route after Document Intelligence extracts the text
 */
export function parseRequirementsFromText(specText: string): SpecRequirements {
    // This is a placeholder for MVP - the actual extraction happens in the API route
    // via Azure OpenAI. In production, you'd call that here.
    return {
        materialType: null,
        standards: [],
        certifications: [],
    };
}

/**
 * Find product matches based on extracted criteria
 * Returned as JSON from the API route after querying Azure SQL
 */
export function buildMatchesDisplay(matches: Product[]) {
    return matches.map((m) => ({
        id: m.ProductID,
        name: m.ProductName,
        supplier: m.SupplierID,
        category: m.CategoryName,
        gwp: m.GlobalWarmingPotential,
        epdUrl: m.EPDDocumentURL,
        carbonBadge: m.GlobalWarmingPotential
            ? m.GlobalWarmingPotential < 200
                ? { color: "green", label: "Low Carbon" }
                : m.GlobalWarmingPotential < 400
                    ? { color: "yellow", label: "Moderate" }
                    : { color: "red", label: "High Carbon" }
            : null,
    }));
}

/**
 * Format extraction results for UI display
 */
export function formatExtractionResults(extraction: any) {
    return {
        category: extraction.category || "Not Detected",
        standards:
            extraction.standards && extraction.standards.length > 0
                ? extraction.standards.join(", ")
                : "None specified",
        maxCarbon: extraction.maxGlobalWarmingPotential
            ? `${extraction.maxGlobalWarmingPotential} kgCO2e`
            : "No limit",
        minRecycled: extraction.minRecycledPercent
            ? `${extraction.minRecycledPercent}%`
            : "Not specified",
        certifications:
            extraction.requiredCerts && extraction.requiredCerts.length > 0
                ? extraction.requiredCerts.join(", ")
                : "None specified",
    };
}

/**
 * Calculate relevance score for a match against criteria
 */
export function calculateMatchScore(
    product: Product,
    criteria: SpecRequirements
): number {
    let score = 0;

    // Category match (30%)
    if (
        criteria.materialType &&
        product.CategoryName?.toLowerCase().includes(criteria.materialType.toLowerCase())
    ) {
        score += 30;
    }

    // Carbon compliance (40%)
    if (
        criteria.maxCarbon &&
        product.GlobalWarmingPotential &&
        product.GlobalWarmingPotential <= criteria.maxCarbon
    ) {
        score += 40;
    }

    // EPD presence (30%)
    if (product.EPDDocumentURL) {
        score += 30;
    }

    return score;
}
