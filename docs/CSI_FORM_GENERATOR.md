# CSI Form 13.1A PDF Generator

> [!IMPORTANT]
> **Binding invariants apply to this generator.** Before changing the 1.5C / 13.1A
> generators, the Submittal Log, or swap validation, read
> [`docs/AEC_SCOPE_AND_COMPLIANCE_INVARIANTS.md`](./AEC_SCOPE_AND_COMPLIANCE_INVARIANTS.md):
> 1. **Compliance is a hard GATE; sustainability is only the RANKING.** Never place a
>    material that fails a showstopper check (ASTM, fire, structural, R-value, STC,
>    UL/ICC-ES) into a packet, regardless of carbon. Sort greenest-first only among
>    candidates that already passed, and include the showstopper-check summary as evidence.
> 2. **The Submittal Log tracks GreenChainz-generated substitution packets ONLY** — no
>    RFIs (G716), no payment certs (G702/G703), no whole-job submittals.

## Overview

The CSI Form 13.1A PDF Generator automatically creates AIA-standard substitution request forms from swap validation results. This feature enables architects and contractors to quickly generate professional documentation for material substitution requests with comprehensive technical specifications, cost analysis, and environmental impact data.

## Features

### Standard CSI Form 13.1A Compliance
- Full compliance with Construction Specifications Institute (CSI) Form 13.1A format
- AIA-compatible substitution request structure
- Professional PDF layout with proper formatting and signature blocks

### GreenChainz Enhancements
- **Functional Equivalence Validation**: 12 showstopper checks with pass/fail status
- **Environmental Impact Analysis**: GWP reduction, carbon savings, EPD comparisons
- **Cost Comparison**: Material costs, labor costs, lifecycle costs, net change
- **Technical Specifications**: Side-by-side comparison of ASTM codes, fire ratings, structural properties
- **Automated Justification**: Context-aware justification text based on validation status

## API Endpoints

### Export CSI Form
```
GET /api/swap-validation/[id]/export-csi-form
```

**Parameters:**
- `id` (path): Validation ID from `swap_validations` table

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="CSI-13.1A_{ProjectName}_{Material}_{Date}.pdf"`

**Example:**
```bash
curl -O https://greenchainz.com/api/swap-validation/abc123/export-csi-form
```

### Export CSI Form 1.5C (During Bidding/Negotiating)
```
GET /api/swap-validation/[id]/export-csi-1-5c
```

**Optional Query Parameters:**
- `projectName`: project name used in the form and filename
- `specSection`: CSI spec section shown in the header

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="CSI-1.5C_{ProjectName}_Validation-{id}_{Date}.pdf"`

**Example:**
```bash
curl -L -o csi-1-5c.pdf "https://greenchainz.com/api/swap-validation/123/export-csi-1-5c?projectName=Tower-A&specSection=08%2044%2013"
```

The 1.5C export reuses swap validation data and includes:
- Standard bidding-stage substitution request metadata
- Product/manufacturer details for specified and proposed materials
- Cost impact summary
- GreenChainz enhancement section (validation status, showstopper summary, carbon delta)

## PDF Structure

### Page 1: Standard CSI Form
- **Header**: Form title, CSI Form 13.1A designation
- **Project Information**: Project name, architect, contractor, request number, date, specification section
- **Product Information**: 
  - Specified Product (manufacturer, trade name, model number)
  - Proposed Substitution (manufacturer, trade name, model number)
- **Cost Comparison**: Specified cost, proposed cost, net change
- **Validation Status**: APPROVED/EXPERIMENTAL/REJECTED badge with score

### Page 2: Technical Specifications
- **Functional Equivalence Validation**: 12 showstopper checks with ✓/✗ indicators
  - ASTM Code Match
  - Fire Rating Match
  - Compressive Strength
  - Tensile Strength
  - Modulus of Elasticity
  - R-Value
  - Perm Rating
  - STC Rating
  - IIC Rating
  - UL Listing
  - Labor Units
  - Lifecycle/Warranty

- **Detailed Specifications Table**: Side-by-side comparison
  - ASTM Codes
  - Fire Rating
  - Compressive Strength (psi)
  - Tensile Strength (psi)
  - R-Value
  - STC Rating
  - Warranty (years)

### Page 3: Environmental Impact & Justification
- **Carbon Footprint Comparison**:
  - Specified Product GWP (kg CO₂e)
  - Proposed Product GWP (kg CO₂e)
  - GWP Reduction (kg CO₂e and percentage)
  - EPD certifications

- **Reason for Substitution**: Auto-generated justification based on:
  - Validation status (APPROVED/EXPERIMENTAL/REJECTED)
  - Environmental benefits
  - Cost implications
  - Failed showstopper checks (if any)

- **Certification Statement**: Standard CSI certification language adapted for GreenChainz validation

- **Signature Blocks**: Contractor and Architect signature lines with date fields

## Usage

### From Swap Validation Dashboard
1. Navigate to `/admin/swap-validation`
2. Run a material swap validation
3. Click "CSI Form" button in the Actions column
4. PDF downloads automatically with proper filename

### Programmatic Access
```typescript
// Fetch validation data
const validation = await fetch(`/api/swap-validation/${validationId}`);

// Export CSI form
const response = await fetch(`/api/swap-validation/${validationId}/export-csi-form`);
const blob = await response.blob();
const url = URL.createObjectURL(blob);
window.open(url);
```

## Data Sources

The PDF generator pulls data from multiple database tables:

1. **swap_validations**: Core validation results, status, scores
2. **materials**: Material names, suppliers, SKUs, EPD URLs
3. **material_technical_specs**: ASTM codes, fire ratings, structural properties
4. **pricing_data**: Regional pricing, labor costs (optional)

## Validation Status Logic

### APPROVED
- All 12 showstopper checks pass
- Justification emphasizes functional equivalence
- Highlights environmental benefits and cost savings
- Recommends acceptance without reservations

### EXPERIMENTAL
- 1-2 showstopper checks fail
- Justification acknowledges minor differences
- Lists specific failed checks
- Recommends acceptance with design team review

### REJECTED
- 3+ showstopper checks fail
- Justification notes significant differences
- Recommends further investigation
- Not recommended for acceptance without major revisions

## File Naming Convention

```
CSI-13.1A_{ProjectName}_{IncumbentMaterial}_{SustainableMaterial}_{Date}.pdf
```

**Example:**
```
CSI-13.1A_Downtown-Tower_Portland-Cement_Geopolymer_2026-02-16.pdf
```

## Technical Implementation

### PDF Generation Library
- **pdfkit**: Server-side PDF generation
- **@types/pdfkit**: TypeScript type definitions

### Service Class
```typescript
import { CSIFormGenerator, type CSIFormData } from '@/app/lib/csiFormGenerator';

const generator = new CSIFormGenerator();
const pdfBuffer = await generator.generate(formData);
```

### Key Methods
- `generate(data: CSIFormData)`: Main PDF generation method
- `renderPage1(data)`: Standard CSI form
- `renderPage2(data)`: Technical specifications
- `renderPage3(data)`: Environmental impact and justification

## Customization

### Branding
Edit `csiFormGenerator.ts` to customize:
- Header logo
- Footer text
- Color scheme
- Font styles

### Additional Sections
Add custom sections by:
1. Extending `CSIFormData` interface
2. Adding render methods (e.g., `renderPage4()`)
3. Calling `doc.addPage()` before rendering

### Justification Logic
Customize auto-generated justification in:
```typescript
function generateJustification(validation: any, showstopperChecks: any): string
```

## Testing

### Manual Testing
1. Create validation with APPROVED status
2. Export CSI form
3. Verify all sections render correctly
4. Check PDF opens in Adobe Reader, Preview, Chrome

### Automated Testing
```bash
# Test PDF generation service
npm test app/lib/csiFormGenerator.test.ts

# Test API endpoint
curl -I https://greenchainz.com/api/swap-validation/test-id/export-csi-form
```

## Troubleshooting

### PDF Generation Fails
- Check Prisma connection to database
- Verify validation ID exists in `swap_validations` table
- Ensure material technical specs are populated

### Missing Data in PDF
- Verify `material_technical_specs` table has data for both materials
- Check `showstopperChecks` JSON field is properly formatted
- Ensure EPD URLs are valid (or omit if null)

### Download Not Working
- Check Content-Disposition header
- Verify CORS settings for API route
- Test in different browsers (Chrome, Firefox, Safari)

## Future Enhancements

1. **Multi-page Attachments**: Append EPD PDFs, test reports, certifications
2. **Digital Signatures**: Integrate DocuSign or Adobe Sign API
3. **Template Customization**: Allow users to upload custom CSI form templates
4. **Batch Export**: Generate CSI forms for multiple validations at once
5. **Email Integration**: Send CSI forms directly to architects/contractors

## References

- [CSI Form 13.1A Standard](https://www.csiresources.org/)
- [AIA Contract Documents](https://www.aiacontracts.org/)
- [pdfkit Documentation](https://pdfkit.org/)
- [GreenChainz Swap Validation Engine](./SWAP_VALIDATION_ENGINE.md)

---

**Generated by GreenChainz | Verified Sustainable Sourcing**
