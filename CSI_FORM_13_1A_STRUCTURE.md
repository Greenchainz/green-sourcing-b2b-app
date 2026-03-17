# CSI Form 13.1A Structure

## Purpose
Standard form for requesting material/product substitutions after the bidding/negotiating phase of a construction project.

## Required Sections

### Header
- Form Title: "SUBSTITUTION REQUEST"
- Form Number: "CSI Form 13.1A"
- Subtitle: "(After the Bidding/Negotiating Phase)"

### Project Information
- Project Name
- To: (Architect/Engineer)
- From: (Contractor/Submitter)
- Date
- Substitution Request Number
- A/E Project Number
- Contract For
- Specification Title
- Specification Section

### Product Information
- **Specified Product:**
  - Manufacturer
  - Trade Name
  - Model Number

- **Proposed Substitution:**
  - Manufacturer
  - Trade Name
  - Model Number

### Comparison & Justification
- **Reason for Substitution Request:**
  - Cost savings
  - Availability
  - Performance improvement
  - Other (specify)

- **Differences from Specified Product:**
  - Dimensions
  - Weight
  - Materials
  - Performance characteristics
  - Installation requirements
  - Maintenance requirements

- **Attachments Required:**
  - Product data sheets
  - Technical specifications
  - Test reports
  - Certifications (UL, ICC-ES, etc.)
  - Installation instructions
  - Warranty information
  - Cost comparison

### Certification Statement
"The Undersigned certifies:
- Proposed substitution has been fully investigated and determined to be equal or superior in all respects to specified product
- Same warranty will be furnished
- Installation and performance will not be adversely affected
- Proposed substitution affects other work (if yes, describe changes required)"

### Cost Impact
- Cost of specified product: $______
- Cost of proposed substitution: $______
- Net change in Contract Sum: $______

### Signature Blocks
- Submitted by: (Contractor signature, date)
- Reviewed by: (Architect signature, date)
- Action: ☐ Accepted ☐ Accepted as Noted ☐ Rejected
- Remarks:

---

## GreenChainz Enhancements

### Additional Sections for Sustainability
1. **Environmental Impact Comparison**
   - Global Warming Potential (GWP) - kg CO2e
   - Embodied Carbon - kg CO2e/unit
   - EPD certification status
   - Recycled content percentage
   - End-of-life recyclability

2. **Functional Equivalence Validation**
   - Showstopper checks summary (12 checks)
   - ASTM code match: ✓/✗
   - Fire rating match: ✓/✗
   - Structural performance: ✓/✗
   - Thermal performance: ✓/✗
   - Acoustic performance: ✓/✗
   - Overall validation status: APPROVED/EXPERIMENTAL/REJECTED

3. **Regional Pricing Data**
   - Market pricing from TXDOT bid tabs
   - Regional availability
   - Lead time comparison

4. **Lifecycle Cost Analysis**
   - Initial material cost
   - Installation labor cost
   - Maintenance costs (20-year projection)
   - Replacement costs
   - Total lifecycle cost comparison

---

## PDF Layout Design

### Page 1: Standard CSI Form
- Header with GreenChainz logo
- All standard CSI 13.1A fields
- Project and product information
- Basic cost comparison

### Page 2: Technical Comparison
- Side-by-side specifications table
- Showstopper checks results
- Performance metrics comparison
- Certifications and compliance

### Page 3: Sustainability Analysis
- Environmental impact comparison
- Carbon savings calculation
- EPD data comparison
- Lifecycle assessment summary

### Page 4: Supporting Documentation
- Validation report summary
- Regional pricing data
- References and citations
- Approval workflow

---

## Implementation Notes

### PDF Generation Library
Use **jsPDF** for client-side generation or **pdfkit** for server-side generation.

### Data Sources
- Validation results from `swap_validations` table
- Material specs from `material_technical_specs` table
- Pricing data from `pricing_data` table
- Project info from user input

### File Naming Convention
`CSI-13.1A_{ProjectName}_{IncumbentMaterial}_{SustainableMaterial}_{Date}.pdf`

Example: `CSI-13.1A_Downtown-Tower_Portland-Cement_Geopolymer_2026-02-16.pdf`
