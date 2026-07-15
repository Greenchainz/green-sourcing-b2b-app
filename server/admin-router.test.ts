import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminRouter } from './admin-router';
import { getDb } from './db';
import { TRPCError } from '@trpc/server';
import {
  architects,
  buyerSubscriptions,
  subscriptions,
  emailCredentials,
  users,
  supplierSubscriptions,
  supplierProfileViews,
  supplierBuyerFitInputs,
  supplierSustainabilityProfiles,
  materialSpecs,
  companyOfWeekSlots,
  usageTracking,
  agentHandoffRules,
  supplierFilters,
  suppliersLocation,
  rfqSupplierInvites,
  epdMaterials,
  supplierMaterialEpds,
  conciergeRoutes,
  learningEvents,
  suppliers,
} from '../drizzle/schema';

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

// Mock email service
vi.mock('./email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe.skipIf(!process.env.DATABASE_URL)('Admin Router - Supplier Verification', () => {
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
      user: { id: 1, role: 'admin', email: 'founder@greenchainz.com', openId: 'admin-123' },
      auth: { userId: 'admin-123', email: 'founder@greenchainz.com', role: 'admin', tenantId: 'test-tenant', rawRoles: ['admin'] },
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
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          verified: true,
          verificationStatus: "approved",
          verifiedAt: expect.any(Date),
        })
      );
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
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          verified: true,
          verificationStatus: "approved",
          verifiedAt: expect.any(Date),
        })
      );
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
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          verified: false,
          verificationStatus: "rejected",
        })
      );
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
        auth: { userId: 'user-123', email: 'user@test.com', role: 'user', tenantId: 'test-tenant', rawRoles: ['user'] },
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
        auth: { userId: 'supplier-123', email: 'supplier@test.com', role: 'supplier', tenantId: 'test-tenant', rawRoles: ['supplier'] },
        req: {} as any,
        res: {} as any,
      });

      await expect(supplierCaller.getAllSuppliers()).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' })
      );
    });

    it('should allow access to admin users', async () => {
      const adminCaller = adminRouter.createCaller({
        user: { id: 1, role: 'admin', email: 'founder@greenchainz.com', openId: 'admin-123' },
        auth: { userId: 'admin-123', email: 'founder@greenchainz.com', role: 'admin', tenantId: 'test-tenant', rawRoles: ['admin'] },
        req: {} as any,
        res: {} as any,
      });

      mockDb.orderBy.mockResolvedValue([]);

      const result = await adminCaller.getPendingSuppliers();

      expect(result).toEqual([]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Destructive data control: deleteUser/restoreUser/purgeUser + manufacturer /
// supplier soft-delete/restore/purge. Fully mocked (getDb is stubbed) so these
// run without a real database and actually exercise the admin-gate + safeguards.
// ─────────────────────────────────────────────────────────────────────────────

const adminCtx = {
  user: { id: 1, role: 'admin', email: 'founder@greenchainz.com', openId: 'admin-123' },
  auth: { userId: 'admin-123', email: 'founder@greenchainz.com', role: 'admin', tenantId: 't', rawRoles: ['admin'] },
  req: {} as any,
  res: {} as any,
};

const nonAdminCtx = {
  user: { id: 2, role: 'supplier', email: 'sup@test.com', openId: 'sup-2' },
  auth: { userId: 'sup-2', email: 'sup@test.com', role: 'supplier', tenantId: 't', rawRoles: ['supplier'] },
  req: {} as any,
  res: {} as any,
};

/**
 * Chainable mock Drizzle handle.
 *  - `.where()` returns a thenable that resolves to `countRow` (for awaited
 *    update/delete/count queries) and also exposes `.limit()` → `targetRow`
 *    (for existence lookups) and `.returning()` (for affected-row checks).
 */
function makeDb({
  targetRow = [{ id: 1, role: 'supplier' }] as any[],
  countRow = [{ c: 1 }] as any[],
  returningRow = targetRow,
} = {}) {
  const db: any = {};
  const chain = () => db;
  db.select = vi.fn(chain);
  db.from = vi.fn(chain);
  db.innerJoin = vi.fn(chain);
  db.leftJoin = vi.fn(chain);
  db.groupBy = vi.fn(chain);
  db.orderBy = vi.fn().mockResolvedValue([]);
  db.update = vi.fn(chain);
  db.set = vi.fn(chain);
  db.delete = vi.fn(chain);
  db.where = vi.fn(() => {
    const p: any = Promise.resolve(countRow);
    p.limit = vi.fn().mockResolvedValue(targetRow);
    p.returning = vi.fn().mockResolvedValue(returningRow);
    return p;
  });
  // Purges wrap their writes in db.transaction(async (tx) => {...}); run the
  // callback synchronously with the same chainable stub so `tx.*` calls land on
  // the same spies the assertions inspect (tx === db in the mock).
  db.transaction = vi.fn(async (cb: any) => cb(db));
  return db;
}

describe('Admin Router - Destructive data control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Users ──────────────────────────────────────────────────────────────
  describe('deleteUser', () => {
    it('denies non-admin callers (FORBIDDEN)', async () => {
      (getDb as any).mockResolvedValue(makeDb());
      const caller = adminRouter.createCaller(nonAdminCtx);
      await expect(caller.deleteUser({ userId: 5 })).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' }),
      );
    });

    it('blocks an admin from deleting their own account (BAD_REQUEST)', async () => {
      (getDb as any).mockResolvedValue(makeDb());
      const caller = adminRouter.createCaller(adminCtx);
      // actor id === target id (1)
      await expect(caller.deleteUser({ userId: 1 })).rejects.toThrow(
        expect.objectContaining({ code: 'BAD_REQUEST' }),
      );
    });

    it('blocks deleting the last remaining admin (BAD_REQUEST)', async () => {
      (getDb as any).mockResolvedValue(
        makeDb({ targetRow: [{ id: 2, role: 'admin' }], countRow: [{ c: 0 }] }),
      );
      const caller = adminRouter.createCaller(adminCtx);
      await expect(caller.deleteUser({ userId: 2 })).rejects.toThrow(
        expect.objectContaining({ code: 'BAD_REQUEST' }),
      );
    });

    it('throws NOT_FOUND when the target user does not exist', async () => {
      (getDb as any).mockResolvedValue(makeDb({ targetRow: [] }));
      const caller = adminRouter.createCaller(adminCtx);
      await expect(caller.deleteUser({ userId: 99 })).rejects.toThrow(
        expect.objectContaining({ code: 'NOT_FOUND' }),
      );
    });

    it('soft-deletes a non-admin user by setting deletedAt', async () => {
      const db = makeDb({ targetRow: [{ id: 2, role: 'supplier' }] });
      (getDb as any).mockResolvedValue(db);
      const caller = adminRouter.createCaller(adminCtx);

      const result = await caller.deleteUser({ userId: 2 });

      expect(result).toEqual({ success: true });
      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });
  });

  describe('restoreUser', () => {
    it('clears deletedAt', async () => {
      const db = makeDb();
      (getDb as any).mockResolvedValue(db);
      const caller = adminRouter.createCaller(adminCtx);

      const result = await caller.restoreUser({ userId: 2 });

      expect(result).toEqual({ success: true });
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
      );
    });
  });

  describe('purgeUser', () => {
    it('denies non-admin callers (FORBIDDEN)', async () => {
      (getDb as any).mockResolvedValue(makeDb());
      const caller = adminRouter.createCaller(nonAdminCtx);
      await expect(caller.purgeUser({ userId: 5 })).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' }),
      );
    });

    it('blocks purging your own account (BAD_REQUEST)', async () => {
      (getDb as any).mockResolvedValue(makeDb());
      const caller = adminRouter.createCaller(adminCtx);
      await expect(caller.purgeUser({ userId: 1 })).rejects.toThrow(
        expect.objectContaining({ code: 'BAD_REQUEST' }),
      );
    });

    it('hard-deletes the user and its owned 1:1 rows', async () => {
      const db = makeDb({ targetRow: [{ id: 2, role: 'supplier' }] });
      (getDb as any).mockResolvedValue(db);
      const caller = adminRouter.createCaller(adminCtx);

      const result = await caller.purgeUser({ userId: 2 });

      expect(result).toEqual({ success: true });
      expect(db.delete.mock.calls.map(([table]) => table)).toEqual([
        architects,
        buyerSubscriptions,
        subscriptions,
        emailCredentials,
        users,
      ]);
      // owned public supplier profile is soft-deleted, not hard-deleted
      expect(db.update).toHaveBeenCalled();
    });
  });

  // ── Manufacturers ────────────────────────────────────────────────────────
  describe('manufacturer delete/restore/purge', () => {
    it('deleteManufacturer denies non-admins (FORBIDDEN)', async () => {
      (getDb as any).mockResolvedValue(makeDb());
      const caller = adminRouter.createCaller(nonAdminCtx);
      await expect(caller.deleteManufacturer({ id: 3 })).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' }),
      );
    });

    it('deleteManufacturer soft-deletes by setting deletedAt', async () => {
      const db = makeDb();
      (getDb as any).mockResolvedValue(db);
      const caller = adminRouter.createCaller(adminCtx);

      const result = await caller.deleteManufacturer({ id: 3 });

      expect(result).toEqual({ success: true });
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('restoreManufacturer clears deletedAt', async () => {
      const db = makeDb();
      (getDb as any).mockResolvedValue(db);
      const caller = adminRouter.createCaller(adminCtx);

      await caller.restoreManufacturer({ id: 3 });

      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
      );
    });

    it('purgeManufacturer nulls materials.manufacturerId before deleting', async () => {
      const db = makeDb();
      (getDb as any).mockResolvedValue(db);
      const caller = adminRouter.createCaller(adminCtx);

      const result = await caller.purgeManufacturer({ id: 3 });

      expect(result).toEqual({ success: true });
      // detach materials first…
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ manufacturerId: null }),
      );
      // …then hard-delete the manufacturer row
      expect(db.delete).toHaveBeenCalledTimes(1);
    });
  });

  // ── Suppliers (paid table) ─────────────────────────────────────────────────
  describe('supplier delete/restore/purge', () => {
    it('deleteSupplier denies non-admins (FORBIDDEN)', async () => {
      (getDb as any).mockResolvedValue(makeDb());
      const caller = adminRouter.createCaller(nonAdminCtx);
      await expect(caller.deleteSupplier({ supplierId: 4 })).rejects.toThrow(
        expect.objectContaining({ code: 'FORBIDDEN' }),
      );
    });

    it('deleteSupplier soft-deletes by setting deletedAt', async () => {
      const db = makeDb();
      (getDb as any).mockResolvedValue(db);
      const caller = adminRouter.createCaller(adminCtx);

      const result = await caller.deleteSupplier({ supplierId: 4 });

      expect(result).toEqual({ success: true });
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('restoreSupplier clears deletedAt', async () => {
      const db = makeDb();
      (getDb as any).mockResolvedValue(db);
      const caller = adminRouter.createCaller(adminCtx);

      await caller.restoreSupplier({ supplierId: 4 });

      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
      );
    });

    it('purgeSupplier deletes all owned child rows then the supplier', async () => {
      const db = makeDb();
      (getDb as any).mockResolvedValue(db);
      const caller = adminRouter.createCaller(adminCtx);

      const result = await caller.purgeSupplier({ supplierId: 4 });

      expect(result).toEqual({ success: true });
      expect(db.delete.mock.calls.map(([table]) => table)).toEqual([
        supplierSubscriptions,
        supplierProfileViews,
        supplierBuyerFitInputs,
        supplierSustainabilityProfiles,
        materialSpecs,
        companyOfWeekSlots,
        usageTracking,
        agentHandoffRules,
        supplierFilters,
        suppliersLocation,
        rfqSupplierInvites,
        epdMaterials,
        supplierMaterialEpds,
        conciergeRoutes,
        learningEvents,
        suppliers,
      ]);
    });
  });
});
