import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminRouter } from './admin-router';
import { getDb } from './db';
import { TRPCError } from '@trpc/server';

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

// Mock email service
vi.mock('./email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Admin Router - Supplier Verification', () => {
  let mockDb: any;
  let mockCaller: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock database with proper chaining
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };

    (getDb as any).mockResolvedValue(mockDb);

    // Create caller context
    mockCaller = adminRouter.createCaller({
      user: { id: 1, role: 'admin', email: 'admin@test.com', openId: 'admin-123' },
      req: {} as any,
      res: {} as any,
    });
  });

  describe('getPendingSuppliers', () => {
    it('should return pending suppliers', async () => {
      const mockSuppliers = [
        {
          id: 1,
          companyName: 'Test Supplier',
          email: 'supplier@test.com',
          phone: '555-1234',
          location: 'New York, NY',
          website: 'https://test.com',
          description: 'Test supplier',
          createdAt: new Date(),
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockSuppliers);

      const result = await mockCaller.getPendingSuppliers();

      expect(result).toEqual(mockSuppliers);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it('should throw error if database is unavailable', async () => {
      (getDb as any).mockResolvedValue(null);

      await expect(mockCaller.getPendingSuppliers()).rejects.toThrow(TRPCError);
    });
  });

  describe('approveSupplier', () => {
    it('should approve a supplier and send email', async () => {
      const supplierId = 1;
      const notes = 'Approved!';

      // First where call for update, second for select
      mockDb.where
        .mockReturnValueOnce(mockDb) // First where returns db for update chain
        .mockResolvedValueOnce([]) // update result
        .mockReturnValueOnce(mockDb) // Second where returns db for select chain
        .mockResolvedValueOnce([
          {
            email: 'supplier@test.com',
            companyName: 'Test Supplier',
          },
        ]);

      const result = await mockCaller.approveSupplier({
        supplierId,
        notes,
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should approve supplier without notes', async () => {
      const supplierId = 1;

      mockDb.where
        .mockReturnValueOnce(mockDb)
        .mockResolvedValueOnce([])
        .mockReturnValueOnce(mockDb)
        .mockResolvedValueOnce([
          {
            email: 'supplier@test.com',
            companyName: 'Test Supplier',
          },
        ]);

      const result = await mockCaller.approveSupplier({
        supplierId,
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('rejectSupplier', () => {
    it('should reject a supplier with reason', async () => {
      const supplierId = 1;
      const notes = 'Does not meet sustainability requirements';

      mockDb.where
        .mockReturnValueOnce(mockDb)
        .mockResolvedValueOnce([])
        .mockReturnValueOnce(mockDb)
        .mockResolvedValueOnce([
          {
            email: 'supplier@test.com',
            companyName: 'Test Supplier',
          },
        ]);

      const result = await mockCaller.rejectSupplier({
        supplierId,
        notes,
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getAllSuppliers', () => {
    it('should return all suppliers', async () => {
      const mockSuppliers = [
        {
          id: 1,
          companyName: 'Supplier 1',
          email: 'supplier1@test.com',
          verificationStatus: 'approved',
          createdAt: new Date(),
        },
        {
          id: 2,
          companyName: 'Supplier 2',
          email: 'supplier2@test.com',
          verificationStatus: 'pending',
          createdAt: new Date(),
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockSuppliers);

      const result = await mockCaller.getAllSuppliers();

      expect(result).toEqual(mockSuppliers);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('getSupplierDetail', () => {
    it('should return supplier details', async () => {
      const mockSupplier = {
        id: 1,
        companyName: 'Test Supplier',
        email: 'supplier@test.com',
        verificationStatus: 'pending',
        certifications: ['ISO 9001', 'FSC'],
        sustainabilityScore: 85,
      };

      mockDb.where.mockResolvedValue([mockSupplier]);

      const result = await mockCaller.getSupplierDetail({
        supplierId: 1,
      });

      expect(result).toEqual(mockSupplier);
    });

    it('should throw error if supplier not found', async () => {
      mockDb.where.mockResolvedValue([]);

      await expect(
        mockCaller.getSupplierDetail({
          supplierId: 999,
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getSupplierStats', () => {
    it('should return supplier statistics', async () => {
      const mockSuppliers = [
        { id: 1, verificationStatus: 'pending', isPremium: false, sustainabilityScore: 80 },
        { id: 2, verificationStatus: 'approved', isPremium: true, sustainabilityScore: 90 },
        { id: 3, verificationStatus: 'rejected', isPremium: false, sustainabilityScore: 50 },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockResolvedValue(mockSuppliers);

      const result = await mockCaller.getSupplierStats();

      expect(result.total).toBe(3);
      expect(result.pending).toBe(1);
      expect(result.approved).toBe(1);
      expect(result.rejected).toBe(1);
      expect(result.premium).toBe(1);
      expect(parseFloat(result.avgSustainabilityScore)).toBeCloseTo(73.33, 1);
    });

    it('should handle empty supplier list', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockResolvedValue([]);

      const result = await mockCaller.getSupplierStats();

      expect(result.total).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.approved).toBe(0);
      expect(result.avgSustainabilityScore).toBe('0');
    });
  });

  describe('Authorization', () => {
    it('should deny access to non-admin users', async () => {
      const nonAdminCaller = adminRouter.createCaller({
        user: { id: 2, role: 'user', email: 'user@test.com', openId: 'user-123' },
        req: {} as any,
        res: {} as any,
      });

      await expect(nonAdminCaller.getPendingSuppliers()).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' })
      );
    });

    it('should deny access if user is supplier', async () => {
      const supplierCaller = adminRouter.createCaller({
        user: { id: 3, role: 'supplier', email: 'supplier@test.com', openId: 'supplier-123' },
        req: {} as any,
        res: {} as any,
      });

      await expect(supplierCaller.getAllSuppliers()).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' })
      );
    });

    it('should allow access to admin users', async () => {
      const adminCaller = adminRouter.createCaller({
        user: { id: 1, role: 'admin', email: 'admin@test.com', openId: 'admin-123' },
        req: {} as any,
        res: {} as any,
      });

      mockDb.orderBy.mockResolvedValue([]);

      const result = await adminCaller.getPendingSuppliers();

      expect(result).toEqual([]);
    });
  });
});
