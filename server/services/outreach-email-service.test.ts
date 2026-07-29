import { describe, it, expect } from 'vitest';
import { detectLayer, previewLayerEmail, LAYER_PROFILES, type ProcurementLayer } from './outreach-email-service';

describe('outreach-email-service', () => {
  describe('detectLayer', () => {
    it('should map "clt" to L5', () => {
      expect(detectLayer('clt')).toBe('L5');
    });

    it('should map "hospital" to L6', () => {
      expect(detectLayer('hospital')).toBe('L6');
    });

    it('should map "concrete" to L1', () => {
      expect(detectLayer('concrete')).toBe('L1');
    });

    it('should map "window" to L2', () => {
      expect(detectLayer('window')).toBe('L2');
    });

    it('should map "drywall" to L3', () => {
      expect(detectLayer('drywall')).toBe('L3');
    });

    it('should map "flooring" to L4', () => {
      expect(detectLayer('flooring')).toBe('L4');
    });

    it('should map "distribut" to L7', () => {
      expect(detectLayer('distribut')).toBe('L7');
    });

    it('should default to L1 for unknown categories', () => {
      expect(detectLayer('random-item')).toBe('L1');
    });

    it('should check subcategory and keyProduct as well', () => {
      expect(detectLayer('Other', 'hospital')).toBe('L6');
      expect(detectLayer('Other', null, 'solar')).toBe('L2');
    });
  });

  describe('previewLayerEmail', () => {
    const contact = {
      companyName: 'Acme Corp',
      category: 'Concrete',
      keyProduct: 'Eco-Concrete',
    };

    it('should return correct structure for L1 Step 1', () => {
      const result = previewLayerEmail(1, 'L1', contact);
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result.layer).toBe('L1');
      expect(result.driver).toBe('Liability & Code Compliance');
      expect(result.html).toContain('Acme Corp');
      expect(result.subject).toContain('EPD');
    });

    it('should return correct structure for L2 Step 2', () => {
      const result = previewLayerEmail(2, 'L2', contact);
      expect(result.layer).toBe('L2');
      expect(result.driver).toBe('Whole Life Cost & ROI Validation');
      expect(result.html).toContain('Acme Corp');
      expect(result.subject).toContain('QS firm');
    });

    it('should return correct structure for L5 Step 3', () => {
      const result = previewLayerEmail(3, 'L5', contact);
      expect(result.layer).toBe('L5');
      expect(result.driver).toBe('Scope 3 Emissions & ESG Reporting');
      expect(result.html).toContain('Acme Corp');
      expect(result.subject).toContain('Last note');
    });

    it('should handle all layers L1-L7', () => {
      const layers: ProcurementLayer[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
      layers.forEach(layer => {
        const result = previewLayerEmail(1, layer, contact);
        expect(result.layer).toBe(layer);
        expect(result.driver).toBe(LAYER_PROFILES[layer].financialDriver);
      });
    });
  });

  describe('LAYER_PROFILES integrity', () => {
    it('should have all layers L1 to L7 defined', () => {
      const layers: ProcurementLayer[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
      layers.forEach(l => {
        expect(LAYER_PROFILES[l]).toBeDefined();
        expect(LAYER_PROFILES[l].layer).toBe(l);
        expect(typeof LAYER_PROFILES[l].buyerRole).toBe('string');
        expect(typeof LAYER_PROFILES[l].financialDriver).toBe('string');
        expect(typeof LAYER_PROFILES[l].coldCalculus).toBe('string');
      });
    });
  });
});
