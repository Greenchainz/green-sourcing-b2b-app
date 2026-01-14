/**
 * Defensibility Service - Backend (Anti-Value Engineering)
 * 
 * Prevents value engineering by verifying certifications and comparing products
 * Uses Azure OpenAI for intelligent EPD comparison
 */

/**
 * Extract certificate verification from document content
 */
function extractCertificates(content) {
    const result = {
        hasCDPHv12: false,
        hasVerifiedEPD: false
    };

    // CDPH v1.2 patterns
    const cdphVersion = /cdph\s*(?:v|version)?\s*1\.2/i;
    const cdphCertificate = /cdph\s*(?:certificate|cert)?[\s#:]*([A-Z0-9-]+)/i;
    
    if (cdphVersion.test(content)) {
        result.hasCDPHv12 = true;
        const certMatch = content.match(cdphCertificate);
        if (certMatch) result.cdphCertificateNumber = certMatch[1];
    }

    // EPD patterns
    const verifiedEPD = /(?:verified|third[-\s]party\s*verified|independently\s*verified)\s*epd/i;
    const epdNumber = /epd\s*(?:number|no|#)[:\s]*([A-Z0-9-]+)/i;
    
    if (/\bepd\b/i.test(content) && verifiedEPD.test(content)) {
        result.hasVerifiedEPD = true;
        const numberMatch = content.match(epdNumber);
        if (numberMatch) result.epdNumber = numberMatch[1];
    }

    return result;
}

/**
 * Extract EPD metrics from content
 */
function extractEPDMetrics(content) {
    const metrics = {};

    // GWP (Global Warming Potential)
    const gwpMatch = content.match(/(?:gwp|global\s*warming\s*potential)[:\s]*([0-9.]+)\s*(?:kg\s*co2|kgco2)/i);
    if (gwpMatch) {
        metrics.globalWarmingPotential = parseFloat(gwpMatch[1]);
        metrics.gwpUnit = 'kg CO2 eq';
    }

    // Recycled content
    const recycledMatch = content.match(/(?:recycled|post[-\s]consumer)\s*content[:\s]*([0-9.]+)\s*%/i);
    if (recycledMatch) metrics.recycledContent = parseFloat(recycledMatch[1]);

    return metrics;
}

/**
 * Extract health metrics from CDPH
 */
function extractHealthMetrics(content) {
    const metrics = {};

    // VOC emissions
    const vocMatch = content.match(/(?:total\s*)?voc\s*(?:emissions)?[:\s]*([0-9.]+)\s*(?:μg\/m³|ug\/m3|µg\/m³)/i);
    if (vocMatch) metrics.vocEmissions = parseFloat(vocMatch[1]);

    // Formaldehyde
    const formaldehydeMatch = content.match(/formaldehyde[:\s]*([0-9.]+)\s*(?:μg\/m³|ug\/m3|µg\/m³)/i);
    if (formaldehydeMatch) metrics.formaldehydeEmissions = parseFloat(formaldehydeMatch[1]);

    // Compliance
    if (/pass(?:ed)?|compliant/i.test(content)) {
        metrics.compliance = 'Pass';
    } else if (/fail(?:ed)?|non[-]?compliant/i.test(content)) {
        metrics.compliance = 'Fail';
    }

    return metrics;
}

/**
 * Check product defensibility
 */
function checkDefensibility(productData) {
    const missingRequirements = [];
    const strengths = [];
    const vulnerabilities = [];
    const recommendations = [];
    
    let score = 0;

    // Certificate checks
    if (productData.certificates.hasCDPHv12) {
        score += 20;
        strengths.push('CDPH v1.2 certified for health & safety');
    } else {
        missingRequirements.push('CDPH v1.2 certificate');
        vulnerabilities.push('No third-party health verification');
        recommendations.push('Obtain CDPH v1.2 certification');
    }

    if (productData.certificates.hasVerifiedEPD) {
        score += 20;
        strengths.push('Verified EPD with environmental data');
    } else {
        missingRequirements.push('Verified Environmental Product Declaration (EPD)');
        vulnerabilities.push('No verified environmental impact data');
        recommendations.push('Obtain third-party verified EPD');
    }

    // EPD metrics
    if (productData.epdMetrics.globalWarmingPotential !== undefined) {
        score += 15;
        strengths.push(`Documented carbon footprint: ${productData.epdMetrics.globalWarmingPotential} ${productData.epdMetrics.gwpUnit || ''}`);
    } else {
        vulnerabilities.push('No carbon footprint data');
    }

    if (productData.epdMetrics.recycledContent !== undefined && productData.epdMetrics.recycledContent > 0) {
        score += 15;
        strengths.push(`Contains ${productData.epdMetrics.recycledContent}% recycled content`);
    }

    // Health metrics
    if (productData.healthMetrics.vocEmissions !== undefined) {
        score += 15;
        strengths.push(`VOC emissions: ${productData.healthMetrics.vocEmissions} μg/m³`);
    }

    if (productData.healthMetrics.compliance === 'Pass') {
        score += 15;
        strengths.push('Passes health & safety compliance');
    }

    const isDefensible = score >= 60 && missingRequirements.length <= 1;

    return {
        productData,
        isDefensible,
        defensibilityScore: Math.max(0, Math.min(100, score)),
        missingRequirements,
        strengths,
        vulnerabilities,
        recommendations
    };
}

/**
 * Compare two products for "Or Equal" evaluation
 */
function compareProducts(original, substitute) {
    const reasons = [];
    
    // Environmental comparison
    const originalGWP = original.epdMetrics.globalWarmingPotential || 0;
    const substituteGWP = substitute.epdMetrics.globalWarmingPotential || 0;
    const carbonDelta = substituteGWP - originalGWP;
    const carbonDeltaPercent = originalGWP > 0 ? (carbonDelta / originalGWP) * 100 : 0;

    if (carbonDelta > 0) {
        reasons.push(`Substitute has ${carbonDeltaPercent.toFixed(1)}% higher carbon footprint`);
    }

    // Health comparison
    const originalVOC = original.healthMetrics.vocEmissions || 0;
    const substituteVOC = substitute.healthMetrics.vocEmissions || 0;
    const vocDelta = substituteVOC - originalVOC;

    const originalFormaldehyde = original.healthMetrics.formaldehydeEmissions || 0;
    const substituteFormaldehyde = substitute.healthMetrics.formaldehydeEmissions || 0;
    const formaldehydeDelta = substituteFormaldehyde - originalFormaldehyde;

    let overallHealthScore = 'Equivalent';
    if (vocDelta > 0 || formaldehydeDelta > 0) {
        overallHealthScore = 'Worse';
        if (vocDelta > 0) reasons.push(`Substitute has higher VOC emissions (+${vocDelta.toFixed(1)} μg/m³)`);
        if (formaldehydeDelta > 0) reasons.push(`Substitute has higher formaldehyde emissions`);
    } else if (vocDelta < 0 && formaldehydeDelta < 0) {
        overallHealthScore = 'Better';
    }

    // Certificate comparison
    const originalCertified = original.certificates.hasCDPHv12 && original.certificates.hasVerifiedEPD;
    const substituteCertified = substitute.certificates.hasCDPHv12 && substitute.certificates.hasVerifiedEPD;
    const certificateDowngrade = originalCertified && !substituteCertified;

    if (certificateDowngrade) {
        if (original.certificates.hasCDPHv12 && !substitute.certificates.hasCDPHv12) {
            reasons.push('Substitute lacks CDPH v1.2 certification');
        }
        if (original.certificates.hasVerifiedEPD && !substitute.certificates.hasVerifiedEPD) {
            reasons.push('Substitute lacks verified EPD');
        }
    }

    // Overall verdict
    let overallVerdict = 'Acceptable';
    
    if (carbonDelta > originalGWP * 0.1 || overallHealthScore === 'Worse' || certificateDowngrade) {
        overallVerdict = 'Reject';
    } else if (carbonDelta > 0 || reasons.length > 0) {
        overallVerdict = 'Review';
    }

    return {
        original,
        substitute,
        environmentalComparison: {
            carbonDelta,
            carbonDeltaPercent,
            otherMetricDeltas: {}
        },
        healthComparison: {
            vocDelta,
            formaldehydeDelta,
            overallHealthScore
        },
        certificateComparison: {
            originalCertified,
            substituteCertified,
            certificateDowngrade
        },
        overallVerdict,
        reasons
    };
}

/**
 * Generate rejection memo
 */
function generateRejectionMemo(comparison, projectContext) {
    const date = new Date().toISOString().split('T')[0];
    
    const carbonImpact = comparison.environmentalComparison.carbonDelta > 0
        ? `The substitute product has a ${comparison.environmentalComparison.carbonDeltaPercent.toFixed(1)}% higher carbon footprint (${comparison.environmentalComparison.carbonDelta.toFixed(2)} kg CO2 eq increase), which conflicts with the project's sustainability goals.`
        : 'No significant carbon impact difference.';

    const healthImpact = comparison.healthComparison.overallHealthScore === 'Worse'
        ? `The substitute product has worse indoor air quality metrics, with increased VOC and/or formaldehyde emissions, which may impact occupant health and LEED/WELL certification.`
        : 'No adverse health impact identified.';

    return {
        title: 'Product Substitution Rejection Notice',
        date,
        projectName: projectContext?.projectName,
        specSection: projectContext?.specSection,
        originalProduct: `${comparison.original.productName} (${comparison.original.manufacturer})`,
        substituteProduct: `${comparison.substitute.productName} (${comparison.substitute.manufacturer})`,
        rejectionReasons: comparison.reasons,
        comparisonSummary: `Original product: ${comparison.original.productName} by ${comparison.original.manufacturer}
Substitute product: ${comparison.substitute.productName} by ${comparison.substitute.manufacturer}

The substitute does not meet the "or equal" standard as specified in the project documents.`,
        carbonImpact,
        healthImpact,
        recommendedAction: 'Retain the originally specified product or provide an alternate that meets or exceeds all environmental and health criteria.',
        architectSignature: {
            name: projectContext?.architect,
            date,
            title: 'Project Architect'
        },
        attachments: [
            'Original Product EPD',
            'Substitute Product EPD (if available)',
            'Comparative Analysis Report'
        ]
    };
}

/**
 * Use Azure OpenAI to enhance product comparison
 */
async function enhanceComparisonWithAI(original, substitute, basicComparison) {
    // Check if Azure OpenAI is configured
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

    if (!endpoint || !apiKey) {
        console.warn('Azure OpenAI not configured - returning basic comparison');
        return basicComparison;
    }

    try {
        const { AzureOpenAI } = require('openai');
        const client = new AzureOpenAI({
            endpoint,
            apiKey,
            apiVersion: '2024-08-01-preview',
            deployment
        });

        const prompt = `You are an expert architect reviewing a product substitution request. Compare these two products:

ORIGINAL PRODUCT:
- Name: ${original.productName}
- Manufacturer: ${original.manufacturer}
- CDPH v1.2 Certified: ${original.certificates.hasCDPHv12 ? 'Yes' : 'No'}
- Verified EPD: ${original.certificates.hasVerifiedEPD ? 'Yes' : 'No'}
- Carbon Footprint (GWP): ${original.epdMetrics.globalWarmingPotential || 'Not specified'} kg CO2 eq
- VOC Emissions: ${original.healthMetrics.vocEmissions || 'Not specified'} μg/m³
- Recycled Content: ${original.epdMetrics.recycledContent || 'Not specified'}%

SUBSTITUTE PRODUCT:
- Name: ${substitute.productName}
- Manufacturer: ${substitute.manufacturer}
- CDPH v1.2 Certified: ${substitute.certificates.hasCDPHv12 ? 'Yes' : 'No'}
- Verified EPD: ${substitute.certificates.hasVerifiedEPD ? 'Yes' : 'No'}
- Carbon Footprint (GWP): ${substitute.epdMetrics.globalWarmingPotential || 'Not specified'} kg CO2 eq
- VOC Emissions: ${substitute.healthMetrics.vocEmissions || 'Not specified'} μg/m³
- Recycled Content: ${substitute.epdMetrics.recycledContent || 'Not specified'}%

BASIC ANALYSIS:
Verdict: ${basicComparison.overallVerdict}
Carbon Delta: ${basicComparison.environmentalComparison.carbonDelta.toFixed(2)} kg CO2 eq (${basicComparison.environmentalComparison.carbonDeltaPercent.toFixed(1)}%)
Health Score: ${basicComparison.healthComparison.overallHealthScore}

Provide a brief professional assessment (2-3 sentences) of whether the substitute is acceptable, and highlight any critical concerns for the architect.`;

        const response = await client.chat.completions.create({
            model: deployment,
            messages: [
                { role: 'system', content: 'You are a sustainability expert and architect advisor specializing in product specifications and value engineering prevention.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.3
        });

        const aiAnalysis = response.choices[0]?.message?.content || '';

        return {
            ...basicComparison,
            aiAnalysis
        };

    } catch (error) {
        console.error('AI enhancement failed:', error.message);
        return basicComparison;
    }
}

/**
 * Main defensibility check function
 */
function performDefensibilityCheck(documentContent, productName, manufacturer) {
    const certificates = extractCertificates(documentContent);
    const epdMetrics = extractEPDMetrics(documentContent);
    const healthMetrics = extractHealthMetrics(documentContent);

    const productData = {
        productName,
        manufacturer,
        certificates,
        epdMetrics,
        healthMetrics
    };

    return checkDefensibility(productData);
}

/**
 * Perform "Or Equal" comparison
 */
async function performOrEqualComparison(originalData, substituteData, projectContext) {
    const basicComparison = compareProducts(originalData, substituteData);
    
    // Enhance with AI if configured
    const enhancedComparison = await enhanceComparisonWithAI(originalData, substituteData, basicComparison);

    const response = {
        comparison: enhancedComparison,
        verdict: enhancedComparison.overallVerdict
    };

    // Generate rejection memo if needed
    if (enhancedComparison.overallVerdict === 'Reject') {
        response.rejectionMemo = generateRejectionMemo(enhancedComparison, projectContext);
    } else if (enhancedComparison.overallVerdict === 'Review') {
        response.reviewNotes = 'Manual review recommended. Substitute shows some concerns but may be acceptable with architect approval.';
    }

    return response;
}

module.exports = {
    extractCertificates,
    extractEPDMetrics,
    extractHealthMetrics,
    checkDefensibility,
    compareProducts,
    generateRejectionMemo,
    performDefensibilityCheck,
    performOrEqualComparison,
    enhanceComparisonWithAI
};
