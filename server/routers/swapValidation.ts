/**
 * Swap Validation Router
 * 
 * tRPC procedures for validating material substitutions
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { validateSwap, type MaterialTechnicalSpecs } from '../services/swapValidationService';
import { getDb } from '../db';
import { materialTechnicalSpecs, swapValidations, materials } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

export const swapValidationRouter = router({
  /**
   * Validate a material swap
   * Compares incumbent and sustainable materials across all showstopper checks
   */
  validateMaterialSwap: publicProcedure
    .input(z.object({
      incumbentMaterialId: z.number(),
      sustainableMaterialId: z.number(),
      projectId: z.number().optional(),
      saveResult: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Fetch technical specs for both materials
      const [incumbentSpecs, sustainableSpecs] = await Promise.all([
        db.select().from(materialTechnicalSpecs)
          .where(eq(materialTechnicalSpecs.materialId, input.incumbentMaterialId))
          .limit(1),
        db.select().from(materialTechnicalSpecs)
          .where(eq(materialTechnicalSpecs.materialId, input.sustainableMaterialId))
          .limit(1),
      ]);
      
      if (incumbentSpecs.length === 0) {
        throw new Error(`No technical specs found for incumbent material ID ${input.incumbentMaterialId}`);
      }
      
      if (sustainableSpecs.length === 0) {
        throw new Error(`No technical specs found for sustainable material ID ${input.sustainableMaterialId}`);
      }
      
      const incumbent = incumbentSpecs[0];
      const sustainable = sustainableSpecs[0];
      
      // Run validation
      const validationResult = validateSwap(incumbent, sustainable);
      
      // Save result to database if requested
      if (input.saveResult) {
        const insertData = {
          incumbentMaterialId: input.incumbentMaterialId,
          sustainableMaterialId: input.sustainableMaterialId,
          projectId: input.projectId || null,
          validationStatus: validationResult.validationStatus,
          overallScore: validationResult.overallScore.toString(),
          showstopperResults: validationResult.showstopperResults as any,
          failedChecks: validationResult.failedChecks,
          passedChecks: validationResult.passedChecks,
          skippedChecks: validationResult.skippedChecks,
          recommendation: validationResult.recommendation,
          validatedAt: new Date(),
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        };
        
        const [savedValidation] = await db.insert(swapValidations)
          .values(insertData)
          .$returningId();
        
        return {
          ...validationResult,
          validationId: savedValidation.id,
        };
      }
      
      return validationResult;
    }),
  
  /**
   * Get validation history
   * Filter by material, project, or status
   */
  getValidationHistory: publicProcedure
    .input(z.object({
      incumbentMaterialId: z.number().optional(),
      sustainableMaterialId: z.number().optional(),
      projectId: z.number().optional(),
      validationStatus: z.enum(['APPROVED', 'EXPERIMENTAL', 'REJECTED']).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      let query = db.select().from(swapValidations);
      
      const conditions: any[] = [];
      if (input.incumbentMaterialId) {
        conditions.push(eq(swapValidations.incumbentMaterialId, input.incumbentMaterialId));
      }
      if (input.sustainableMaterialId) {
        conditions.push(eq(swapValidations.sustainableMaterialId, input.sustainableMaterialId));
      }
      if (input.projectId) {
        conditions.push(eq(swapValidations.projectId, input.projectId));
      }
      if (input.validationStatus) {
        conditions.push(eq(swapValidations.validationStatus, input.validationStatus));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const results = await query
        .orderBy(desc(swapValidations.validatedAt))
        .limit(input.limit);
      
      return results.map(r => ({
        ...r,
        showstopperResults: JSON.parse(r.showstopperResults as string),
      }));
    }),
  
  /**
   * Get validation by ID
   */
  getValidationById: publicProcedure
    .input(z.object({
      validationId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const [validation] = await db.select().from(swapValidations)
        .where(eq(swapValidations.id, input.validationId))
        .limit(1);
      
      if (!validation) {
        throw new Error(`Validation ID ${input.validationId} not found`);
      }
      
      // Fetch material details
      const [incumbent, sustainable] = await Promise.all([
        db.select().from(materials)
          .where(eq(materials.id, validation.incumbentMaterialId))
          .limit(1),
        db.select().from(materials)
          .where(eq(materials.id, validation.sustainableMaterialId))
          .limit(1),
      ]);
      
      return {
        ...validation,
        showstopperResults: JSON.parse(validation.showstopperResults as string),
        incumbentMaterial: incumbent[0] || null,
        sustainableMaterial: sustainable[0] || null,
      };
    }),
  
  /**
   * Revalidate a swap
   * Re-runs validation with current material specs
   */
  revalidateSwap: publicProcedure
    .input(z.object({
      validationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Fetch existing validation
      const [existingValidation] = await db.select().from(swapValidations)
        .where(eq(swapValidations.id, input.validationId))
        .limit(1);
      
      if (!existingValidation) {
        throw new Error(`Validation ID ${input.validationId} not found`);
      }
      
      // Fetch current technical specs
      const [incumbentSpecs, sustainableSpecs] = await Promise.all([
        db.select().from(materialTechnicalSpecs)
          .where(eq(materialTechnicalSpecs.materialId, existingValidation.incumbentMaterialId))
          .limit(1),
        db.select().from(materialTechnicalSpecs)
          .where(eq(materialTechnicalSpecs.materialId, existingValidation.sustainableMaterialId))
          .limit(1),
      ]);
      
      if (incumbentSpecs.length === 0 || sustainableSpecs.length === 0) {
        throw new Error('Technical specs not found for one or both materials');
      }
      
      // Run validation
      const validationResult = validateSwap(incumbentSpecs[0], sustainableSpecs[0]);
      
      // Update existing validation record
      await db.update(swapValidations)
        .set({
          validationStatus: validationResult.validationStatus,
          overallScore: validationResult.overallScore.toString(),
          showstopperResults: validationResult.showstopperResults as any,
          failedChecks: validationResult.failedChecks,
          passedChecks: validationResult.passedChecks,
          skippedChecks: validationResult.skippedChecks,
          recommendation: validationResult.recommendation,
          validatedAt: new Date(),
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        })
        .where(eq(swapValidations.id, input.validationId));
      
      return {
        ...validationResult,
        validationId: input.validationId,
      };
    }),
  
  /**
   * Get validation statistics
   * Summary of validation results across all materials
   */
  getValidationStats: publicProcedure
    .query(async () => {
      const db = await getDb();
      
      const allValidations = await db.select().from(swapValidations);
      
      const stats = {
        total: allValidations.length,
        approved: allValidations.filter(v => v.validationStatus === 'APPROVED').length,
        experimental: allValidations.filter(v => v.validationStatus === 'EXPERIMENTAL').length,
        rejected: allValidations.filter(v => v.validationStatus === 'REJECTED').length,
        averageScore: allValidations.length > 0 
          ? allValidations.reduce((sum, v) => sum + parseFloat(v.overallScore as any), 0) / allValidations.length 
          : 0,
        recentValidations: allValidations
          .sort((a, b) => new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime())
          .slice(0, 10),
      };
      
      return stats;
    }),
});
