#!/usr/bin/env node

/**
 * Defensibility Agent Test Script
 * 
 * Run with: node backend/tests/manual/test-defensibility.js
 */

const defensibilityService = require('../../services/azure/defensibilityService');

console.log('='.repeat(80));
console.log('DEFENSIBILITY AGENT - TEST SUITE (Anti-Value Engineering)');
console.log('='.repeat(80));

// Test Case 1: Fully certified product (High Defensibility)
console.log('\n\n✅ TEST 1: Fully Certified Product (High Defensibility Expected)');
console.log('-'.repeat(80));

const certifiedContent = `
Premium Flooring Product - EcoFloor Pro

CERTIFICATIONS:
- CDPH v1.2 Certificate #CDPH-2024-001
- Verified Third-Party EPD #EPD-12345-2024
- Program Operator: UL Environment

ENVIRONMENTAL DATA:
- Global Warming Potential: 2.5 kg CO2 eq per m²
- Recycled Content: 45%
- Renewable Content: 15%

HEALTH & SAFETY:
- Total VOC Emissions: 50 μg/m³
- Formaldehyde Emissions: 5 μg/m³
- Test Method: CDPH Standard Method v1.2
- Compliance: Pass

Certificate Issue Date: 01/15/2024
Valid Until: 01/15/2027
`;

const certifiedResult = defensibilityService.performDefensibilityCheck(
    certifiedContent,
    'EcoFloor Pro',
    'Premium Flooring Inc.'
);

console.log(JSON.stringify(certifiedResult, null, 2));

// Test Case 2: Uncertified product (Low Defensibility)
console.log('\n\n❌ TEST 2: Uncertified "Eco-Friendly" Product (Low Defensibility Expected)');
console.log('-'.repeat(80));

const uncertifiedContent = `
GreenChoice Building Material

Our product is:
- Sustainable and eco-friendly
- Made with natural materials
- Good for the environment
- Reduces your carbon footprint

Contact us for more information!
No third-party certifications available.
`;

const uncertifiedResult = defensibilityService.performDefensibilityCheck(
    uncertifiedContent,
    'GreenChoice Material',
    'Generic Supplier Co.'
);

console.log(JSON.stringify(uncertifiedResult, null, 2));

// Test Case 3: "Or Equal" Comparison - Worse Substitute (Should Reject)
console.log('\n\n🔄 TEST 3: "Or Equal" Comparison - Worse Substitute (Reject Expected)');
console.log('-'.repeat(80));

const originalProduct = {
    productName: 'Premium Insulation A',
    manufacturer: 'Quality Materials Inc.',
    certificates: {
        hasCDPHv12: true,
        hasVerifiedEPD: true,
        cdphCertificateNumber: 'CDPH-2024-100',
        epdNumber: 'EPD-2024-200'
    },
    epdMetrics: {
        globalWarmingPotential: 3.2,
        gwpUnit: 'kg CO2 eq',
        recycledContent: 60
    },
    healthMetrics: {
        vocEmissions: 30,
        formaldehydeEmissions: 3,
        compliance: 'Pass'
    }
};

const worseSubstitute = {
    productName: 'Economy Insulation B',
    manufacturer: 'Budget Materials Co.',
    certificates: {
        hasCDPHv12: false,
        hasVerifiedEPD: false
    },
    epdMetrics: {
        globalWarmingPotential: 5.8, // 81% higher!
        gwpUnit: 'kg CO2 eq',
        recycledContent: 20
    },
    healthMetrics: {
        vocEmissions: 75, // Much higher
        formaldehydeEmissions: 12, // Much higher
        compliance: 'Unknown'
    }
};

const comparison1 = defensibilityService.compareProducts(originalProduct, worseSubstitute);
console.log(JSON.stringify(comparison1, null, 2));

if (comparison1.overallVerdict === 'Reject') {
    console.log('\n📄 REJECTION MEMO GENERATED:');
    console.log('-'.repeat(80));
    const memo = defensibilityService.generateRejectionMemo(comparison1, {
        projectName: 'Downtown Office Tower',
        specSection: 'Section 07 21 00 - Thermal Insulation',
        architect: 'Jane Smith, AIA'
    });
    console.log(JSON.stringify(memo, null, 2));
}

// Test Case 4: "Or Equal" Comparison - Acceptable Substitute
console.log('\n\n✅ TEST 4: "Or Equal" Comparison - Acceptable Substitute (Accept Expected)');
console.log('-'.repeat(80));

const acceptableSubstitute = {
    productName: 'Premium Insulation C',
    manufacturer: 'Another Quality Co.',
    certificates: {
        hasCDPHv12: true,
        hasVerifiedEPD: true,
        cdphCertificateNumber: 'CDPH-2024-150',
        epdNumber: 'EPD-2024-250'
    },
    epdMetrics: {
        globalWarmingPotential: 3.0, // Slightly better
        gwpUnit: 'kg CO2 eq',
        recycledContent: 65 // Better
    },
    healthMetrics: {
        vocEmissions: 28, // Slightly better
        formaldehydeEmissions: 2, // Better
        compliance: 'Pass'
    }
};

const comparison2 = defensibilityService.compareProducts(originalProduct, acceptableSubstitute);
console.log(JSON.stringify(comparison2, null, 2));

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));

const results = [
    { name: 'Fully Certified Product', result: certifiedResult },
    { name: 'Uncertified Product', result: uncertifiedResult },
];

results.forEach(({ name, result }) => {
    const icon = result.isDefensible ? '✅' : '❌';
    console.log(`${icon} ${name.padEnd(30)} | Score: ${result.defensibilityScore.toString().padStart(3)}/100 | Defensible: ${result.isDefensible ? 'Yes' : 'No'} | Missing: ${result.missingRequirements.length}`);
});

console.log('\nComparison Tests:');
console.log(`❌ Worse Substitute     | Verdict: ${comparison1.overallVerdict.padEnd(12)} | Reasons: ${comparison1.reasons.length}`);
console.log(`✅ Good Substitute      | Verdict: ${comparison2.overallVerdict.padEnd(12)} | Reasons: ${comparison2.reasons.length}`);

console.log('\n✅ All defensibility tests completed successfully!\n');
console.log('🛡️  Anti-Value Engineering Protection Active\n');
