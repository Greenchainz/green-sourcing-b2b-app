import { getPool } from "./db";

export async function findMatchingSuppliers(params: {
  rfqId: string;
  materials: string[];
  deliveryLocation: any;
  requiredCertifications: string[];
  budgetRange: any;
}) {
  const pool = getPool();
  const { materials } = params;

  if (!materials || materials.length === 0) {
    return [];
  }

  const query = `
    SELECT
      s.id as "supplierId",
      COUNT(DISTINCT sm.material_id) as matching_materials
    FROM suppliers s
    JOIN supplier_materials sm ON s.id = sm.supplier_id
    WHERE sm.material_id = ANY($1)
    GROUP BY s.id
    ORDER BY matching_materials DESC
    LIMIT 10
  `;

  try {
    const result = await pool.query(query, [materials]);
    const totalRequested = materials.length;

    return result.rows.map((row) => ({
      supplierId: row.supplierId,
      score: Number(row.matching_materials) / totalRequested,
      distance: 0,
    }));
  } catch (error) {
    console.error("Error in findMatchingSuppliers:", error);
    return [];
  }
}

export async function sendInAppNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}) {
  const pool = getPool();
  const { userId, type, title, message, metadata } = params;

  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert notification
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, metadata, read, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
    `, [userId, type, title, message, metadata ? JSON.stringify(metadata) : null]);

    return { success: true };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error };
  }
}

export default {};
