import PDFDocument from 'pdfkit';
import type { Readable } from 'stream';

export interface CSIFormData {
  // Project Information
  projectName: string;
  architectName: string;
  contractorName: string;
  requestNumber: string;
  aeProjectNumber?: string;
  specificationSection: string;
  date: Date;

  // Product Information
  specifiedProduct: {
    manufacturer: string;
    tradeName: string;
    modelNumber?: string;
  };

  proposedSubstitution: {
    manufacturer: string;
    tradeName: string;
    modelNumber?: string;
  };

  // Validation Results
  validationStatus: 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED';
  validationScore: number;
  showstopperChecks: {
    astmMatch: boolean;
    fireRatingMatch: boolean;
    compressiveStrengthMatch: boolean;
    tensileStrengthMatch: boolean;
    modulusMatch: boolean;
    rValueMatch: boolean;
    permRatingMatch: boolean;
    stcMatch: boolean;
    iicMatch: boolean;
    ulListingMatch: boolean;
    laborUnitsMatch: boolean;
    lifecycleMatch: boolean;
  };

  // Cost Comparison
  costComparison: {
    specifiedCost: number;
    proposedCost: number;
    netChange: number;
    laborCostDelta?: number;
    lifecycleCostDelta?: number;
  };

  // Environmental Impact
  environmentalImpact: {
    specifiedGWP: number;
    proposedGWP: number;
    gwpReduction: number;
    gwpReductionPercent: number;
    specifiedEPD?: string;
    proposedEPD?: string;
  };

  // Technical Specifications
  technicalSpecs: {
    specified: {
      astmCodes?: string[];
      fireRating?: string;
      compressiveStrength?: number;
      tensileStrength?: number;
      rValue?: number;
      stcRating?: number;
      warranty?: number;
    };
    proposed: {
      astmCodes?: string[];
      fireRating?: string;
      compressiveStrength?: number;
      tensileStrength?: number;
      rValue?: number;
      stcRating?: number;
      warranty?: number;
    };
  };

  // Justification
  reasonForSubstitution: string;
  additionalNotes?: string;
}

export class CSIFormGenerator {
  private doc: PDFDocument;
  private yPosition: number = 0;
  private readonly pageWidth = 612; // 8.5 inches
  private readonly pageHeight = 792; // 11 inches
  private readonly margin = 50;

  constructor() {
    this.doc = new PDFDocument({
      size: 'LETTER',
      margins: {
        top: this.margin,
        bottom: this.margin,
        left: this.margin,
        right: this.margin,
      },
    });
    this.yPosition = this.margin;
  }

  async generate(data: CSIFormData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];

      this.doc.on('data', (chunk) => buffers.push(chunk));
      this.doc.on('end', () => resolve(Buffer.concat(buffers)));
      this.doc.on('error', reject);

      try {
        this.renderPage1(data);
        this.doc.addPage();
        this.renderPage2(data);
        this.doc.addPage();
        this.renderPage3(data);
        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private renderPage1(data: CSIFormData) {
    this.yPosition = this.margin;

    // Header
    this.doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('SUBSTITUTION REQUEST', this.margin, this.yPosition, {
        align: 'center',
      });
    this.yPosition += 30;

    this.doc
      .fontSize(12)
      .font('Helvetica')
      .text('CSI Form 13.1A', this.margin, this.yPosition, { align: 'center' });
    this.yPosition += 15;

    this.doc
      .fontSize(10)
      .text('(After the Bidding/Negotiating Phase)', this.margin, this.yPosition, {
        align: 'center',
      });
    this.yPosition += 30;

    // Project Information
    this.renderSection('Project Information', () => {
      this.renderField('Project', data.projectName);
      this.renderField('To (Architect/Engineer)', data.architectName);
      this.renderField('From (Contractor)', data.contractorName);
      this.renderField('Date', data.date.toLocaleDateString());
      this.renderField('Substitution Request Number', data.requestNumber);
      if (data.aeProjectNumber) {
        this.renderField('A/E Project Number', data.aeProjectNumber);
      }
      this.renderField('Specification Section', data.specificationSection);
    });

    this.yPosition += 20;

    // Product Information
    this.renderSection('Product Information', () => {
      this.doc.fontSize(11).font('Helvetica-Bold').text('Specified Product:', this.margin, this.yPosition);
      this.yPosition += 15;
      this.renderField('  Manufacturer', data.specifiedProduct.manufacturer, 10);
      this.renderField('  Trade Name', data.specifiedProduct.tradeName, 10);
      if (data.specifiedProduct.modelNumber) {
        this.renderField('  Model Number', data.specifiedProduct.modelNumber, 10);
      }

      this.yPosition += 10;

      this.doc.fontSize(11).font('Helvetica-Bold').text('Proposed Substitution:', this.margin, this.yPosition);
      this.yPosition += 15;
      this.renderField('  Manufacturer', data.proposedSubstitution.manufacturer, 10);
      this.renderField('  Trade Name', data.proposedSubstitution.tradeName, 10);
      if (data.proposedSubstitution.modelNumber) {
        this.renderField('  Model Number', data.proposedSubstitution.modelNumber, 10);
      }
    });

    this.yPosition += 20;

    // Cost Comparison
    this.renderSection('Cost Comparison', () => {
      this.renderField(
        'Cost of Specified Product',
        `$${data.costComparison.specifiedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      );
      this.renderField(
        'Cost of Proposed Substitution',
        `$${data.costComparison.proposedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      );
      this.renderField(
        'Net Change in Contract Sum',
        `$${data.costComparison.netChange.toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`,
        10,
        data.costComparison.netChange < 0 ? 'green' : data.costComparison.netChange > 0 ? 'red' : 'black'
      );
    });

    this.yPosition += 20;

    // Validation Status
    this.renderSection('GreenChainz Validation Status', () => {
      const statusColor =
        data.validationStatus === 'APPROVED' ? 'green' : data.validationStatus === 'EXPERIMENTAL' ? 'orange' : 'red';

      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('black')
        .text('Status: ', this.margin, this.yPosition, { continued: true })
        .fillColor(statusColor)
        .text(data.validationStatus);
      this.yPosition += 15;

      this.doc
        .fillColor('black')
        .text('Validation Score: ', this.margin, this.yPosition, { continued: true })
        .font('Helvetica')
        .text(`${data.validationScore}/100`);
      this.yPosition += 15;
    });

    // Footer
    this.renderFooter();
  }

  private renderPage2(data: CSIFormData) {
    this.yPosition = this.margin;

    this.renderPageHeader('Technical Specifications Comparison');

    // Showstopper Checks Summary
    this.renderSection('Functional Equivalence Validation', () => {
      const checks = [
        { label: 'ASTM Code Match', value: data.showstopperChecks.astmMatch },
        { label: 'Fire Rating Match', value: data.showstopperChecks.fireRatingMatch },
        { label: 'Compressive Strength', value: data.showstopperChecks.compressiveStrengthMatch },
        { label: 'Tensile Strength', value: data.showstopperChecks.tensileStrengthMatch },
        { label: 'Modulus of Elasticity', value: data.showstopperChecks.modulusMatch },
        { label: 'R-Value', value: data.showstopperChecks.rValueMatch },
        { label: 'Perm Rating', value: data.showstopperChecks.permRatingMatch },
        { label: 'STC Rating', value: data.showstopperChecks.stcMatch },
        { label: 'IIC Rating', value: data.showstopperChecks.iicMatch },
        { label: 'UL Listing', value: data.showstopperChecks.ulListingMatch },
        { label: 'Labor Units', value: data.showstopperChecks.laborUnitsMatch },
        { label: 'Lifecycle/Warranty', value: data.showstopperChecks.lifecycleMatch },
      ];

      checks.forEach((check) => {
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('black')
          .text(`${check.label}: `, this.margin, this.yPosition, { continued: true })
          .fillColor(check.value ? 'green' : 'red')
          .text(check.value ? '✓ PASS' : '✗ FAIL');
        this.yPosition += 15;
      });
    });

    this.yPosition += 20;

    // Detailed Specifications Table
    this.renderSection('Detailed Specifications', () => {
      const specs = [
        {
          property: 'ASTM Codes',
          specified: data.technicalSpecs.specified.astmCodes?.join(', ') || 'N/A',
          proposed: data.technicalSpecs.proposed.astmCodes?.join(', ') || 'N/A',
        },
        {
          property: 'Fire Rating',
          specified: data.technicalSpecs.specified.fireRating || 'N/A',
          proposed: data.technicalSpecs.proposed.fireRating || 'N/A',
        },
        {
          property: 'Compressive Strength (psi)',
          specified: data.technicalSpecs.specified.compressiveStrength?.toLocaleString() || 'N/A',
          proposed: data.technicalSpecs.proposed.compressiveStrength?.toLocaleString() || 'N/A',
        },
        {
          property: 'Tensile Strength (psi)',
          specified: data.technicalSpecs.specified.tensileStrength?.toLocaleString() || 'N/A',
          proposed: data.technicalSpecs.proposed.tensileStrength?.toLocaleString() || 'N/A',
        },
        {
          property: 'R-Value',
          specified: data.technicalSpecs.specified.rValue?.toString() || 'N/A',
          proposed: data.technicalSpecs.proposed.rValue?.toString() || 'N/A',
        },
        {
          property: 'STC Rating',
          specified: data.technicalSpecs.specified.stcRating?.toString() || 'N/A',
          proposed: data.technicalSpecs.proposed.stcRating?.toString() || 'N/A',
        },
        {
          property: 'Warranty (years)',
          specified: data.technicalSpecs.specified.warranty?.toString() || 'N/A',
          proposed: data.technicalSpecs.proposed.warranty?.toString() || 'N/A',
        },
      ];

      // Table header
      const colWidth = (this.pageWidth - 2 * this.margin) / 3;
      this.doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Property', this.margin, this.yPosition, { width: colWidth, continued: true })
        .text('Specified', { width: colWidth, continued: true })
        .text('Proposed', { width: colWidth });
      this.yPosition += 15;

      // Table rows
      this.doc.font('Helvetica');
      specs.forEach((spec) => {
        this.doc
          .text(spec.property, this.margin, this.yPosition, { width: colWidth, continued: true })
          .text(spec.specified, { width: colWidth, continued: true })
          .text(spec.proposed, { width: colWidth });
        this.yPosition += 15;
      });
    });

    this.renderFooter();
  }

  private renderPage3(data: CSIFormData) {
    this.yPosition = this.margin;

    this.renderPageHeader('Environmental Impact & Sustainability');

    // Carbon Savings
    this.renderSection('Carbon Footprint Comparison', () => {
      this.renderField(
        'Specified Product GWP',
        `${data.environmentalImpact.specifiedGWP.toLocaleString()} kg CO₂e`
      );
      this.renderField(
        'Proposed Product GWP',
        `${data.environmentalImpact.proposedGWP.toLocaleString()} kg CO₂e`
      );
      this.renderField(
        'GWP Reduction',
        `${data.environmentalImpact.gwpReduction.toLocaleString()} kg CO₂e (${data.environmentalImpact.gwpReductionPercent.toFixed(1)}%)`,
        10,
        data.environmentalImpact.gwpReduction > 0 ? 'green' : 'red'
      );

      if (data.environmentalImpact.specifiedEPD) {
        this.renderField('Specified EPD', data.environmentalImpact.specifiedEPD);
      }
      if (data.environmentalImpact.proposedEPD) {
        this.renderField('Proposed EPD', data.environmentalImpact.proposedEPD);
      }
    });

    this.yPosition += 20;

    // Justification
    this.renderSection('Reason for Substitution', () => {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.reasonForSubstitution, this.margin, this.yPosition, {
          width: this.pageWidth - 2 * this.margin,
          align: 'justify',
        });
      this.yPosition += this.doc.heightOfString(data.reasonForSubstitution, {
        width: this.pageWidth - 2 * this.margin,
      }) + 10;
    });

    if (data.additionalNotes) {
      this.yPosition += 10;
      this.renderSection('Additional Notes', () => {
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .text(data.additionalNotes!, this.margin, this.yPosition, {
            width: this.pageWidth - 2 * this.margin,
            align: 'justify',
          });
        this.yPosition += this.doc.heightOfString(data.additionalNotes!, {
          width: this.pageWidth - 2 * this.margin,
        }) + 10;
      });
    }

    this.yPosition += 30;

    // Certification Statement
    this.renderSection('Certification', () => {
      const certification = `The Undersigned certifies that the proposed substitution has been fully investigated and determined to be ${
        data.validationStatus === 'APPROVED' ? 'equal or superior' : data.validationStatus === 'EXPERIMENTAL' ? 'substantially equivalent with minor differences' : 'not equivalent'
      } in all material respects to the specified product. This certification is based on GreenChainz automated validation analysis and supporting technical documentation.`;

      this.doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .text(certification, this.margin, this.yPosition, {
          width: this.pageWidth - 2 * this.margin,
          align: 'justify',
        });
      this.yPosition += this.doc.heightOfString(certification, {
        width: this.pageWidth - 2 * this.margin,
      }) + 20;
    });

    // Signature Blocks
    this.yPosition += 20;
    const sigWidth = (this.pageWidth - 3 * this.margin) / 2;

    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Submitted by:', this.margin, this.yPosition);
    this.doc.text('Reviewed by:', this.margin + sigWidth + this.margin, this.yPosition);
    this.yPosition += 20;

    this.doc
      .moveTo(this.margin, this.yPosition)
      .lineTo(this.margin + sigWidth - 20, this.yPosition)
      .stroke();
    this.doc
      .moveTo(this.margin + sigWidth + this.margin, this.yPosition)
      .lineTo(this.pageWidth - this.margin, this.yPosition)
      .stroke();
    this.yPosition += 15;

    this.doc
      .fontSize(9)
      .font('Helvetica')
      .text('(Contractor Signature)', this.margin, this.yPosition);
    this.doc.text('(Architect Signature)', this.margin + sigWidth + this.margin, this.yPosition);
    this.yPosition += 20;

    this.doc.text('Date: _______________', this.margin, this.yPosition);
    this.doc.text('Date: _______________', this.margin + sigWidth + this.margin, this.yPosition);

    this.renderFooter();
  }

  private renderSection(title: string, content: () => void) {
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text(title, this.margin, this.yPosition);
    this.yPosition += 20;

    content();
  }

  private renderField(label: string, value: string, fontSize: number = 10, color: string = 'black') {
    this.doc
      .fontSize(fontSize)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text(`${label}: `, this.margin, this.yPosition, { continued: true })
      .font('Helvetica')
      .fillColor(color)
      .text(value);
    this.yPosition += 15;
  }

  private renderPageHeader(title: string) {
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text(title, this.margin, this.yPosition, { align: 'center' });
    this.yPosition += 30;
  }

  private renderFooter() {
    const footerY = this.pageHeight - this.margin + 20;
    this.doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('gray')
      .text(
        'Generated by GreenChainz | Verified Sustainable Sourcing',
        this.margin,
        footerY,
        {
          align: 'center',
          width: this.pageWidth - 2 * this.margin,
        }
      );
  }
}
